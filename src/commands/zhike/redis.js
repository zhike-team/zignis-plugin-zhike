const co = require('co')
const Consul = require('zhike-consul')
const consulConfig = require('../../../consul.json')
const Redis = require('ioredis')
const { Utils } = require('zignis')

exports.command = 'redis cmd [arguments..]'
exports.desc = 'zhike redis tools'
exports.aliases = 'cache'

exports.builder = function(yargs) {
  yargs.option('json', {
    default: false,
    describe: 'json parse before output'
  })
  yargs.option('silent', {
    default: false,
    describe: 'do not console log the result'
  })
}

exports.handler = function(argv) {
  return co(function*() {
    const env = process.env.NODE_ENV ? process.env.NODE_ENV : 'development' // development/production/test

    delete global.CFG
    const consul = new Consul(['redis'], consulConfig[env].host, consulConfig[env].port, global, {
      output: false,
      timeout: 5000
    })
    const data = yield consul.pull(env)
    const config = data.CFG
    const cache = new Redis(config.redis)
    const ret = yield cache[argv.cmd].apply(cache, argv.arguments)

    if (!argv.silent) {
      if (argv.json) {
        Utils.log(JSON.parse(ret))
      } else {
        Utils.log(ret)
      }
    }

    return ret
  })
}
