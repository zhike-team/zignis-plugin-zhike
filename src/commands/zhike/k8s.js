const _ = require('lodash')
const { Utils } = require('zignis')

exports.command = 'k8s <op> [keyword]'
exports.desc = `zhike k8s tools`
exports.aliases = ['kubectl']

exports.builder = function(yargs) {
  yargs.option('namespace', {
    alias: 'n',
    default: _.get(Utils.getCombinedConfig(), 'commandDefault.zhike.k8s.namespace') || 'c-dev',
    describe: 'k8s namespace, support c-dev/c-production'
  })

  yargs.option('binary', {
    default: _.get(Utils.getCombinedConfig(), 'commandDefault.zhike.k8s.binary') || '/usr/local/bin/kubectl',
    describe: 'k8s kubectl absolute path'
  })

  Utils.extendSubCommand('zhike/k8s', 'zignis-plugin-zhike', yargs, __dirname)
}

exports.handler = function(argv) {}
