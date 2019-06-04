const co = require('co')
const Consul = require('zhike-consul')
const consulConfig = require('../../../consul.json')
const { Utils } = require('zignis')

const env = process.env.NODE_ENV ? process.env.NODE_ENV : 'development' // development/production/test
const consulCachedKV = {}
const consulCachedInstance = {}

exports.command = 'consul <keys..>'
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
    if (!argv.keys) {
      Utils.error('Please provide at least 1 key')
    }

    const keysPrefix = []
    argv.keys.map(key => {
      keysPrefix.push(key.split('.')[0])
    })

    const cacheKey = `${env}:${Utils.md5(JSON.stringify(keysPrefix))}`
    let data
    let consul
    if (consulCachedKV[cacheKey]) {
      data = consulCachedKV[cacheKey]
      consul = consulCachedInstance[cacheKey]
    } else {
      consul = new Consul(
        keysPrefix,
        consulConfig[env].host,
        consulConfig[env].port,
        {},
        {
          output: false,
          timeout: 5000
        }
      )

      try {
        data = yield consul.pull(env)
      } catch (error) {
        Utils.error(`Consul pull ${consulConfig[env].host}:${consulConfig[env].port} failed: ${error}!`)
      }
      consulCachedKV[cacheKey] = data
      consulCachedInstance[cacheKey] = consul
    }

    const pickNeededFromPull = {}
    argv.keys.map(key => {
      Utils._.set(pickNeededFromPull, key, Utils._.get(data.CFG, key))
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
