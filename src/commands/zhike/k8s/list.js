const { Utils } = require('zignis')
const { Kubectl } = require('../../../common/kubectl')
const fs = require('fs')
const co = require('co')

const filterFuzzy = (list, keyword) =>
  list.filter(item =>
    new RegExp(
      keyword
        .split('')
        .map(c => c.replace(/[.?*+^$[\]\\(){}|]/g, '\\$&'))
        .join('.*'),
      'i'
    ).test(item)
  )
const filterContain = (list, keyword) => list.filter(item => item.indexOf(keyword) > -1)

exports.command = 'list [keyword]'
exports.desc = `k8s list pods`
exports.aliases = ['pods', 'ls']

exports.builder = function(yargs) {}

exports.handler = function(argv) {
  const namespace = argv.namespace
  const binary = argv.binary
  const configType = namespace.indexOf('production') > -1 ? 'production' : 'development'
  const configPathEnv = configType === 'development' ? 'ZIGNIS_ZHIKE_K8S_DEV' : 'ZIGNIS_ZHIKE_K8S_PROD'
  const kubeconfigPath = process.env[configPathEnv]

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

  co(function*() {
    const data = yield kubectl.list()
    const pods = []
    data.items.forEach(item => {
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

    filteredPods.forEach(pod => {
      console.log(pod)
    })
  }).catch(e => {
    Utils.error(e.stack)
  })
}
