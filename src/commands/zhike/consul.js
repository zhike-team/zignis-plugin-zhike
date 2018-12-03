const co = require('co')
const _ = require('lodash')
const Consul = require('zhike-consul')
const consulConfig = require('../../../consul.json')
const { Utils } = require('zignis')

exports.command = 'consul [keys..]'
exports.desc = 'zhike consul config review'
exports.aliases = 'config'

exports.builder = function(yargs) {
  yargs.option('quiet', {
    alias: 'q',
    default: false,
    describe: 'simple console log'
  })

  yargs.option('silent', {
    default: false,
    describe: 'not console log result'
  })
}

exports.handler = function(argv) {
  return co(function*() {
    const env = process.env.NODE_ENV ? process.env.NODE_ENV : 'development' // development/production/test
    if (!argv.keys) {
      console.log(Utils.chalk.red('Please provide at least 1 key'))
      return
    }

    const keysPrefix = []
    argv.keys.map(key => {
      keysPrefix.push(key.split('.')[0])
    })

    delete global.CFG
    const consul = new Consul(keysPrefix, consulConfig[env].host, consulConfig[env].port, global, {
      output: false,
      timeout: 5000
    })
    const data = yield consul.pull(env)

    const pickNeededFromPull = {}
    argv.keys.map(key => {
      _.set(pickNeededFromPull, key, _.get(data.CFG, key))
    })

    if (!argv.silent) {
      if (argv.quiet) {
        console.log(JSON.stringify(pickNeededFromPull, null, 2))
      } else {
        Utils.log(pickNeededFromPull)
      }
    } else {
      return { result: pickNeededFromPull, zhikeConsul: consul, env }
    }
  }).catch(e => {
    Utils.error(e.stack)
  })
}
