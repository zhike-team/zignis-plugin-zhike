import { Utils } from 'zignis'
import { Kubectl } from '../../../common/kubectl'
import fs from 'fs'
import cProcess from 'child_process'

const spawn = cProcess.spawn

const filterFuzzy = (list: any, keyword: string) =>
  list.filter((item: any) =>
    new RegExp(
      keyword
        .split('')
        .map(c => c.replace(/[.?*+^$[\]\\(){}|]/g, '\\$&'))
        .join('.*'),
      'i'
    ).test(item)
  )
const filterContain = (list: string[], keyword: string) => list.filter(item => item.indexOf(keyword) > -1)

export const command = 'rsh [keyword]'
export const desc = `k8s rsh pod`
export const aliases = ['bash', 'exec', 'sh']

export const builder = function(yargs: any) {
  yargs.option('shell', { default: 'bash', describe: 'which shell container use, could be command or command path.' })
}

export const handler = async function(argv: any) {
  const namespace = argv.namespace
  const binary = argv.binary
  const configType = (namespace.indexOf('production') > -1 || namespace.indexOf('test') > -1) ? 'production' : 'development'
  const configPathEnv = configType === 'development' ? 'ZIGNIS_ZHIKE_K8S_DEV' : 'ZIGNIS_ZHIKE_K8S_PROD'
  const configPathKey = configType === 'development' ? 'devConfigPath' : 'prodConfigPath'
  const kubeconfigPath = process.env[configPathEnv] ? process.env[configPathEnv] : argv[configPathKey]

  if (!kubeconfigPath || !fs.existsSync(kubeconfigPath)) {
    console.error('kubeconfig file not found!')
    return
  }

  const kubectl = new Kubectl('pods', {
    binary,
    kubeconfig: kubeconfigPath,
    version: '/api/v1',
    namespace
  })

  try {
    const data: any = await kubectl.list()
    const pods: string[] = []
    data.items.forEach((item: any) => {
      pods.push(item.metadata.name)
    })

    let keyword, filteredPods: any

    if (argv.keyword) {
      if (argv.keyword[0] === '~') {
        keyword = argv.keyword.substring(1)
        filteredPods = filterFuzzy(pods, keyword)
      } else {
        keyword = argv.keyword
        filteredPods = filterContain(pods, keyword)
      }
    } else {
      filteredPods = pods
    }

    if (filteredPods.length === 1) {
      spawn(
        kubectl.binary,
        kubectl.generateCommandArgs(['exec', '-it', filteredPods.shift(), argv.shell ? argv.shell : 'bash']),
        {
          stdio: 'inherit'
        }
      )
      return
    }

    Utils.inquirer
      .prompt([
        {
          type: 'autocomplete',
          name: 'selectedPod',
          message: `Please choose pod to bash:`,
          // @ts-ignore
          source: (answers, input) => {
            input = input || ''

            return new Promise(function(resolve) {
              const fuzzyResult = Utils.fuzzy.filter(input, filteredPods.sort())
              resolve(
                fuzzyResult.map(function(el) {
                  return el.original
                })
              )
            })
          },
          validate: function(answers: any) {
            if (answers.length < 1) {
              return 'Please choose at least one.'
            }
            return true
          }
        }
      ])
      .then(function(answers: any) {
        spawn(
          kubectl.binary,
          kubectl.generateCommandArgs(['exec', '-it', answers.selectedPod, argv.shell ? argv.shell : 'bash']),
          {
            stdio: 'inherit'
          }
        )
      })
      .catch(function(e: Error) {
        console.log(e.stack)
      })
  } catch (e) {
    Utils.error(e.stack)
  }
}
