const Consul = require('zhike-consul')
const consulConfig = require('./consul.json')
const Redis = require('ioredis')
const consulCommand = require('./src/commands/zhike/consul')
const DatabaseLoader = require('./src/common/db')
const co = require('co')

const getRedis = function () {
  const env = process.env.NODE_ENV ? process.env.NODE_ENV : 'development' // development/production/test

  delete global.CFG
  const consul = new Consul(['redis'], consulConfig[env].host, consulConfig[env].port, global, {
    output: false,
    timeout: 5000
  })

  return consul.pull(env).then(function(data) {
    const config = data.CFG
    const redis = new Redis(config.redis)
    return redis
  })
}

const consulObject = function (keys) {
  keys = Array.isArray(keys) ? keys : keys.split(',')
  return consulCommand.handler({ keys, silent: true })
}

module.exports = {
  *repl() {
    const redis = yield getRedis()
    const db = new DatabaseLoader()
    return {
      zhike: {
        db,
        database: db,
        redis,
        cache: redis,
        consul: consulObject,
        config: consulObject
      }
    }
  },
  components: () => {
    return co(function*() {
      const redis = yield getRedis()
      const db = new DatabaseLoader({ loadReturnInstance: true })
      return {
        db,
        database: db,
        redis,
        cache: redis,
        consul: consulObject,
        config: consulObject,
      }
    })
  }
}
