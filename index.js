const Redis = require('ioredis')
const consulCommand = require('./src/commands/zhike/consul')
const DatabaseLoader = require('./src/common/db')
const dbForComponent = new DatabaseLoader({ loadReturnInstance: true })
const co = require('co')
const { Utils } = require('zignis')
const debug = Utils.debug('zignis-plugin-zhike:index')
const api = require('./src/common/api')

const config = {
  get(keys) {
    return co(function*() {
      keys = Array.isArray(keys) ? keys : Utils.splitComma(keys)
      const { result } = yield consulCommand.handler({ keys, silent: true })

      return result
    }).catch(e => {
      throw new Error(e.stack)
    })
  },

  getAndWatch(keys, callback) {
    return co(function*() {
      keys = Array.isArray(keys) ? keys : Utils.splitComma(keys)
      const { result, zhikeConsul, env } = yield consulCommand.handler({ keys, silent: true })
      const consul = zhikeConsul.consul

      const watch = function(key) {
        let watch = consul.watch({ method: consul.kv.get, options: { key } })

        watch.once('change', function() {
          // 初始会有一次 change 事件，忽略第一次的事件
          watch.on('change', function(data) {
            let value = JSON.parse(data.Value)[env]
            debug(`CFG ${key} changed to:`, value)
            callback && callback(key, value)
          })

          watch.on('error', function(err) {
            // always received errors, but watch still working, use this event listenner to skip error
            // console.log('error:', err);
          })
        })
      }

      keys.map(watch)

      return result
    }).catch(e => {
      throw new Error(e.stack)
    })
  }
}

const redisInstance = () => {
  return co(function*() {
    const { redis: redisConfig } = yield config.get('redis')
    const redis = new Redis(redisConfig)

    return redis
  })
}

module.exports = {
  /** Expose db, so you can directly use it without await component() or invokeHook('components') */
  db: dbForComponent,
  /** It's db alias */
  database: dbForComponent,
  /** Expose consul, so you can directly use it without await component() or invokeHook('components') */
  consul: config,
  /** It's consul alias */
  config,
  /** Expose redis, so you can directly use it without await component() or invokeHook('components') */
  redis: redisInstance,
  /** It's redis alias */
  cache: redisInstance,
  /** Expose api, so you can directly use it without await component() or invokeHook('components') */
  api,
}
