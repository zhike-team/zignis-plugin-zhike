const Consul = require('zhike-consul')
const consulConfig = require('./consul.json')
const Redis = require('ioredis')
const consulCommand = require('./src/commands/zhike/consul')
const DatabaseLoader = require('./src/common/db')
const co = require('co')
const { Utils } = require('zignis')
const debug = require('debug')('zignis-plugin-zhike:index')

const getRedis = function() {
  const env = process.env.NODE_ENV ? process.env.NODE_ENV : 'development' // development/production/test

  const consul = new Consul(['redis'], consulConfig[env].host, consulConfig[env].port, {}, {
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

module.exports = {
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
      const redis = yield getRedis()
      const db = new DatabaseLoader({ loadReturnInstance: true })
      return {
        db,
        database: db,
        redis,
        cache: redis,
        consul: consulObject,
        config: consulObject
      }
    }).catch(e => {
      throw new Error(e.stack)
    })
  }
}
