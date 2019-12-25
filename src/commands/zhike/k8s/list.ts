import { Utils } from 'zignis'
import { Kubectl } from '../../../common/kubectl'
import fs from 'fs'

const filterFuzzy = (list: any, keyword: any) =>
  list.filter((item: any) =>
    new RegExp(
      keyword
        .split('')
        .map((c: string) => c.replace(/[.?*+^$[\]\\(){}|]/g, '\\$&'))
        .join('.*'),
      'i'
    ).test(item)
  )
const filterContain = (list: string[], keyword: string) => list.filter(item => item.indexOf(keyword) > -1)

export const command = 'list [keyword]'
export const desc = `k8s list pods`
export const aliases = ['pods', 'ls']

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

    filteredPods.forEach((pod: string) => {
      console.log(pod)
    })
  } catch (e) {
    Utils.error(e.stack)
  }
}
