const { Kubectl } = require('../../common/kubectl')
const fs = require('fs')
const spawn = require('child_process').spawn
const co = require('co')
const shell = require('shelljs')
const inquirer = require('inquirer')
inquirer.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'))
const fuzzy = require('fuzzy')
const _ = require('lodash')
const Utils = require('../../../../zignis/src/common/utils')

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

exports.command = 'k8s <op> [keyword]'
exports.desc = 'zhike k8s tools'
exports.aliases = ['kubectl', 'docker', 'pod']

exports.builder = function(yargs) {
  yargs.default('namespace', _.get(Utils.getCombinedConfig(), 'commandDefault.zhike.k8s.namespace') || 'c-dev')
  yargs.alias('n', 'namespace')
}

exports.handler = function(argv) {
  const namespace = argv.namespace
  const configType = namespace.indexOf('production') > -1 ? 'production' : 'development'
  const configPathEnv = configType === 'development' ? 'ZIGNIS_ZHIKE_K8S_DEV' : 'ZIGNIS_ZHIKE_K8S_PROD'
  const kubeconfigPath = process.env[configPathEnv]

  if (!kubeconfigPath || !fs.existsSync(kubeconfigPath)) {
    console.error('kubeconfig file not found!')
    return
  }

  const kubectl = new Kubectl('pods', {
    binary: '/usr/local/bin/kubectl',
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

    switch (argv.op) {
      // 列出所有匹配的 pod
      case 'list':
      case 'ls':
        filteredPods.forEach(pod => {
          console.log(pod)
        })
        break

      // 在匹配的 pod 中选择一个进入 shell 环境
      case 'bash':
      case 'exec':
      case 'rsh':
        if (filteredPods.length === 1) {
          spawn(kubectl.binary, kubectl.generateCommandArgs(['exec', '-it', filteredPods.shift(), 'bash']), {
            stdio: 'inherit'
          })
          return
        }

        inquirer
          .prompt([
            {
              type: 'autocomplete',
              name: 'selectedPod',
              message: `Please choose pod to bash:`,
              source: (answers, input) => {
                input = input || ''

                return new Promise(function(resolve) {
                  const fuzzyResult = fuzzy.filter(input, filteredPods.sort())
                  resolve(
                    fuzzyResult.map(function(el) {
                      return el.original
                    })
                  )
                })
              },
              validate: function(answers) {
                if (answers.length < 1) {
                  return 'Please choose at least one.'
                }
                return true
              }
            }
          ])
          .then(function(answers) {
            spawn(kubectl.binary, kubectl.generateCommandArgs(['exec', '-it', answers.selectedPod, 'bash']), {
              stdio: 'inherit'
            })
          })
          .catch(function(e) {
            console.log(e.stack)
          })
        break

      // 集合多个容器的输出
      case 'logs':
        if (filteredPods.length === 1) {
          const logsPods = filteredPods
            .map(p => `${kubectl.generateCommand(['logs', '--tail=4', '-f', p])}`)
            .join(' & ')
          shell.exec(`cat <(${logsPods})`, {
            shell: shell.which('bash').stdout
          })
          return
        }

        inquirer
          .prompt([
            {
              type: 'checkbox',
              name: 'selectedPods',
              message: `Please choose pods to see the logs:`,
              choices: filteredPods.map(p => {
                return { name: p }
              }),
              validate: function(answers) {
                if (answers.length < 1) {
                  return 'Please choose at least one.'
                }
                return true
              }
            }
          ])
          .then(function(answers) {
            const logsPods = answers.selectedPods
              .map(p => `${kubectl.generateCommand(['logs', '--tail=4', '-f', p])}`)
              .join(' & ')
            shell.exec(`cat <(${logsPods})`, {
              shell: shell.which('bash').stdout
            })
          })
          .catch(function(e) {
            console.log(e.stack)
          })

        break
    }
  })
}
