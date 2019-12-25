import { Utils } from 'zignis'
import { Kubectl } from '../../../common/kubectl'
import fs from 'fs'

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

export const command = 'logs [keyword]'
export const desc = `k8s logs pods`
export const aliases = ['log', 'l']

export const builder = function(yargs: any) {}

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

    let keyword, filteredPods

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
      const logsPods = filteredPods
        .map((p: string) => `${kubectl.generateCommand(['logs', '--tail=4', '-f', p])}`)
        .join(' & ')
      Utils.shell.exec(`cat <(${logsPods})`, {
        shell: Utils.shell.which('bash').stdout
      })
      return
    }

    Utils.inquirer
      .prompt([
        {
          type: 'checkbox',
          name: 'selectedPods',
          message: `Please choose pods to see the logs:`,
          choices: filteredPods.map((p: string) => {
            return { name: p }
          }),
          validate: function(answers: any) {
            if (answers.length < 1) {
              return 'Please choose at least one.'
            }
            return true
          }
        }
      ])
      .then(function(answers: any) {
        const logsPods = answers.selectedPods
          .map((p: string) => `${kubectl.generateCommand(['logs', '--tail=4', '-f', p])}`)
          .join(' & ')
        Utils.shell.exec(`cat <(${logsPods})`, {
          shell: Utils.shell.which('bash').stdout
        })
      })
      .catch(function(e: Error) {
        console.log(e.stack)
      })
  } catch (e) {
    Utils.error(e.stack)
  }
}
