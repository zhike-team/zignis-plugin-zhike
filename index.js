const Redis = require('ioredis')
const consulCommand = require('./src/commands/zhike/consul')
const DatabaseLoader = require('./src/common/db')
const dbForComponent = new DatabaseLoader({ loadReturnInstance: true })
const dbForRepl = new DatabaseLoader({ readonly: true })
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
  hook: {
    cron: 'Hook triggered in zignis zhike cron command'
  },
  /**
   * Implement hook: repl.
   * Add Zhike resources into Zignis REPL mode.
   * @example
   * // Fetch zhike consul config，alias: zhike.config
   * $ zignis repl
   * >>> await zhike.consul.get('db.user', 'oss')
   * @example
   * // Support all ioredis apis, alias: zhike.cache
   * $ zignis repl
   * >>> await zhike.redis.keys('*')
   * @example
   * // All database instances are loaded into zhike.db.instances
   * // Database instances are Sequelize model instances
   * // You can not do dangerous Sequelize operations in REPL mode
   * $ zignis repl
   * >>> await zhike.db.load('db.user', 'user')
   * >>> const { Account } = zhike.db.instances.user.models
   * >>> await Account.count()
   * 27378
   * @returns {object} Zhike resources, for now include consul, redis, db.
   */
  *repl() {
    const redis = yield redisInstance()
    return {
      zhike: {
        db: dbForRepl,
        database: dbForRepl,
        redis,
        cache: redis,
        config,
        consul: config,
        api: api('zignis-plugin-zhike')
      }
    }
  },

  /**
   * Implement hook: components.
   * Add Zhike resources into plugins which depend on this plugin, or Zignis scripts.
   * @example
   * // Used in command defination
   * const { components } = require('zignis-plugin-zhike')
   * const co = require('co')
   * exports.handler = function(argv) {
   *   co(function*() {
   *     const { db } = yield components()
   *     // Here, Sequelize instance is returned directly, different from repl hook
   *     const userDb = yield db.load('db.user', 'user', db.associate('./models'))
   *     const { Account } = userDb.models
   *     const count = await Account.count()
   *   }
   * }
   * @example
   * // Zignis script db access demo
   * module.exports = function*(components) {
   *   const { config } = yield components()
   *   console.log(yield config.get('oss'))
   *   console.log('Start to draw your dream code!')
   *   process.exit(0)
   * }
   * @example
   * // Consul config watch demo
   * const { consul } = await components()
   * const config = await consul.getAndWatch('socialPrivate,oss', function(key, value) {
   *   config[key] = value
   *   console.log(`Consul key: ${key} changed to:`, value)
   * })
   * @returns {object} Zhike resources, for now include consul, redis, db.
   */
  components: () => {
    return co(function*() {
      const redis = yield redisInstance()
      return {
        db: dbForComponent,
        database: dbForComponent,
        redis,
        cache: redis,
        config,
        consul: config,
        api
      }
    }).catch(e => {
      throw new Error(e.stack)
    })
  },

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
