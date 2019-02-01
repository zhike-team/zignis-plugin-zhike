const { Utils } = require('../../')

module.exports = {
  hook_hook: {
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
  *hook_repl() {
    const redis = yield Utils.redisInstance()
    return {
      zhike: {
        db: Utils.dbForRepl,
        database: Utils.dbForRepl,
        redis,
        cache: redis,
        config: Utils.config,
        consul: Utils.config,
        api: Utils.api('zignis-plugin-zhike')
      }
    }
  },

  /**
   * Implement hook: components.
   * Add Zhike resources into plugins which depend on this plugin, or Zignis scripts.
   * @example
   * // Used in command defination
   * const { Utils } = require('zignis')
   * const co = require('co')
   * exports.handler = function(argv) {
   *   co(function*() {
   *     const { db } = yield Utils.invokeHook('components')
   *     // Here, Sequelize instance is returned directly, different from repl hook
   *     const userDb = yield db.load('db.user', 'user', db.associate('./models'))
   *     const { Account } = userDb.models
   *     const count = await Account.count()
   *   }
   * }
   * @example
   * // Zignis script db access demo
   * module.exports = function*(components) {
   *   const { config } = yield Utils.invokeHook('components')
   *   console.log(yield config.get('oss'))
   *   console.log('Start to draw your dream code!')
   *   process.exit(0)
   * }
   * @example
   * // Consul config watch demo
   * const { consul } = await Utils.invokeHook('components')
   * const config = await consul.getAndWatch('socialPrivate,oss', function(key, value) {
   *   config[key] = value
   *   console.log(`Consul key: ${key} changed to:`, value)
   * })
   * @returns {object} Zhike resources, for now include consul, redis, db.
   */
  hook_components: () => {
    return co(function*() {
      const redis = yield Utils.redisInstance()
      return {
        db: Utils.dbForComponent,
        database: Utils.dbForComponent,
        redis,
        cache: redis,
        config: Utils.config,
        consul: Utils.config,
        api
      }
    }).catch(e => {
      throw new Error(e.stack)
    })
  }
}