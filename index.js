const Consul = require('zhike-consul')
const consulConfig = require('./consul.json')
const Redis = require('ioredis')
const consulCommand = require('./src/commands/zhike/consul')
const DatabaseLoader = require('./src/common/db')
const co = require('co')
const debug = require('debug')('zignis-plugin-zhike:index')

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

const consulObject = {
  get(keys) {
    return co(function*() {
      keys = Array.isArray(keys) ? keys : keys.split(',')
      const { result } = yield consulCommand.handler({ keys, silent: true })

      return result
    })
  },

  getAndWatch(keys, callback) {
    return co(function*() {
      keys = Array.isArray(keys) ? keys : keys.split(',')
      const { result, zhikeConsul, env } = yield consulCommand.handler({ keys, silent: true })
      const consul = zhikeConsul.consul

      const watch = function (key) {
        let watch = consul.watch({method: consul.kv.get, options: {key}})
    
        watch.once('change', function () { // 初始会有一次 change 事件，忽略第一次的事件
          watch.on('change', function (data) {
            let value = JSON.parse(data.Value)[env]
            debug(`CFG ${key} changed to:`, value)
            callback && callback(key, value)
          })

          watch.on('error', function(err) {
            // always received errors, but watch still working, use this event listenner to skip error
            // console.log('error:', err);
          });
        })

      }

      keys.map(watch)

      return result
    })
  }
}

module.exports = {
  *repl() {
    const redis = yield getRedis()
    const db = new DatabaseLoader({ readonly: true })
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
