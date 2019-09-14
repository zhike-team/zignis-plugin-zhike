import { Utils } from 'zignis'

export const command = 'k8s <op> [keyword]'
export const desc = `zhike k8s tools`
export const aliases = ['kubectl']

export const builder = function(yargs: any) {
  yargs.option('namespace', {
    alias: 'n',
    default: 'c-dev',
    describe: 'k8s namespace, support c-dev/c-production'
  })

  yargs.option('binary', {
    default: '/usr/local/bin/kubectl',
    describe: 'k8s kubectl absolute path'
  })

  yargs.option('dev-config-path', {
    default: '~/.kube/config',
    describe: 'k8s dev config path'
  })

  yargs.option('prod-config-path', {
    default: '~/.kube/config',
    describe: 'k8s prod config path'
  })

  Utils.extendSubCommand('zhike/k8s', 'zignis-plugin-zhike', yargs, __dirname)
}

export const handler = function(argv: any) {}
