const { Utils: ZhikeUtils } = require('../../')
const { Utils } = require('zignis')

module.exports = {
  hook_hook: {
    zhike_cron: 'Hook triggered in zignis zhike cron command',
    zhike_component: 'Hook triggered when zhike hook_components invoked ',
    zhike_repl: 'Hook triggered when zhike hook_repl invoked '
  },
  hook_new_repo: {
    zignis_taro_starter: {
      repo: 'http://code.smartstudy.com/zignis/zignis_taro_starter',
      branch: 'master'
    },
    backend_scaffold: {
      repo: 'http://code.smartstudy.com/service/backend-scaffold',
      branch: 'master'
    }
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
    const redis = yield ZhikeUtils.redisInstance()
    const hookZhikeRepl = yield Utils.invokeHook('zhike_repl')
    return {
      zhike: Object.assign({
        db: ZhikeUtils.dbForRepl,
        database: ZhikeUtils.dbForRepl,
        redis,
        cache: redis,
        config: ZhikeUtils.config,
        consul: ZhikeUtils.config,
        api: ZhikeUtils.api('zignis-plugin-zhike'),
        mq: ZhikeUtils.mq,
      }, hookZhikeRepl)
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
    return Utils.co(function*() {
      const redis = yield ZhikeUtils.redisInstance()

      const hookZhikeComponent = yield Utils.invokeHook('zhike_component')
      return Object.assign({
        db: ZhikeUtils.dbForComponent,
        database: ZhikeUtils.dbForComponent,
        redis,
        cache: redis,
        config: ZhikeUtils.config,
        consul: ZhikeUtils.config,
        api: ZhikeUtils.api,
        mq: ZhikeUtils.mq,
      }, hookZhikeComponent)
    }).catch(e => {
      throw new Error(e.stack)
    })
  }
}