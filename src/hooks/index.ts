import { Utils as ZhikeUtils } from '..'
import { Utils } from 'zignis'

export const hook_hook = {
  zhike_cron: 'Hook triggered in zignis zhike cron command',
  zhike_component: 'Hook triggered when zhike hook_components invoked ',
  zhike_repl: 'Hook triggered when zhike hook_repl invoked '
}

export const hook_new_repo = {
  zignis_taro_starter: {
    repo: 'git@code.smartstudy.com:zignis/zignis_taro_starter.git',
    branch: 'master',
    alias: ['zignis-taro-starter', 'taro']
  },
  weapp_starter: {
    repo: 'git@code.smartstudy.com:weixin_app/weapp_starter.git',
    branch: 'master',
    alias: ['weapp-starter']
  },
  zignis_backend_starter: {
    repo: 'git@code.smartstudy.com:zignis/zignis-backend-starter.git',
    branch: 'master',
    alias: ['zignis-backend-starter', 'zignis-backend', 'zignis_backend']
  },
  backend_scaffold: {
    repo: 'git@code.smartstudy.com:service/backend-scaffold.git',
    branch: 'master',
    alias: ['backend-scaffold']
  }
}

/**
 * Implement hook: repl.
 * Add Zhike resources into Zignis REPL mode.
 * @example
 * /// Fetch zhike consul config，alias: zhike.config
 * $ zignis repl
 * >>> await zhike.consul.get('db.user', 'oss')
 * @example
 * /// Support all ioredis apis, alias: zhike.cache
 * $ zignis repl
 * >>> await zhike.redis.keys('*')
 * @example
 * /// All database instances are loaded into zhike.db.instances
 * /// Database instances are Sequelize model instances
 * /// You can not do dangerous Sequelize operations in REPL mode
 * $ zignis repl
 * >>> await zhike.db.load('db.user', 'user')
 * >>> const { Account } = zhike.db.instances.user.models
 * >>> await Account.count()
 * 27378
 * @returns {object} Zhike resources, for now include consul, redis, db.
 */
export const hook_repl = async (): Promise<object> => {
  const hookZhikeRepl = await Utils.invokeHook('zhike_repl')
  return {
    zhike: Object.assign(
      {
        db: ZhikeUtils.dbForRepl,
        database: ZhikeUtils.dbForRepl,
        redis: ZhikeUtils.redisInstance,
        cache: ZhikeUtils.redisInstance,
        config: ZhikeUtils.config,
        consul: ZhikeUtils.config,
        api: ZhikeUtils.api('zignis-plugin-zhike'),
        mq: ZhikeUtils.mq,
        oss: ZhikeUtils.oss,
        es: ZhikeUtils.elasticsearch,
        elasticsearch: ZhikeUtils.elasticsearch
      },
      hookZhikeRepl
    )
  }
}

/**
 * Implement hook: components.
 * Add Zhike resources into plugins which depend on this plugin, or Zignis scripts.
 * @example
 * /// Used in command defination
 * const { Utils } = require('zignis')
 * exports.handler = async function(argv) {
 *   const { db } = await Utils.invokeHook('components')
 *   /// Here, Sequelize instance is returned directly, different from repl hook
 *   const userDb = await db.load('db.user', 'user', db.associate('./models'))
 *   const { Account } = userDb.models
 *   const count = await Account.count()
 * }
 * @example
 * /// Zignis script db access demo
 * module.exports = async function(components) {
 *   const { config } = await Utils.invokeHook('components')
 *   console.log(await config.get('oss'))
 *   console.log('Start to draw your dream code!')
 *   process.exit(0)
 * }
 * @example
 * /// Consul config watch demo
 * const { consul } = await Utils.invokeHook('components')
 * const config = await consul.getAndWatch('socialPrivate,oss', function(key, value) {
 *   config[key] = value
 *   console.log(`Consul key: ${key} changed to:`, value)
 * })
 * @returns {object} Zhike resources, for now include consul, redis, db.
 */
export const hook_components = async (): Promise<object> => {
  const hookZhikeComponent = await Utils.invokeHook('zhike_component')
  return Object.assign(
    {
      db: ZhikeUtils.dbForComponent,
      database: ZhikeUtils.dbForComponent,
      redis: ZhikeUtils.redisInstance,
      cache: ZhikeUtils.redisInstance,
      config: ZhikeUtils.config,
      consul: ZhikeUtils.config,
      api: ZhikeUtils.api,
      mq: ZhikeUtils.mq,
      oss: ZhikeUtils.oss,
      es: ZhikeUtils.elasticsearch,
      elasticsearch: ZhikeUtils.elasticsearch
    },
    hookZhikeComponent
  )
}

export const hook_beforeCommand = async () => {
  let ten = [
    '通过利他来利己。 -- 智课十诫',
    '所有的事情追求质量的极致，效率的极致，变态般的细致。 -- 智课十诫',
    '大声直接的说出你的观点，哪怕它是错的。 -- 智课十诫',
    '做比说重要，只说不做只能证明无能。 -- 智课十诫',
    '越努力，越幸运：努力到无能为力，拼搏到感动自己。 -- 智课十诫',
    '做一个有创新精神的专家。 -- 智课十诫',
    '做一个传递正能量的人，不要抱怨。 -- 智课十诫',
    '让用户和客户感动是对待用户和客户的唯一标准。 -- 智课十诫',
    '充满求知欲，因为脑子是用来学习的，不止是用来做梦的。 -- 智课十诫',
    '充满解决问题的欲望，因为问题是用来解决的，不止是用来发现的。 -- 智课十诫'
  ]

  return {
    zignisPluginTen: function(argv: any, yargs: any) {
      yargs.hide('disable-ten-temporarily').option('disable-ten-temporarily', {
        describe: 'Disable [Zhike-Ten-Rules] tip.'
      })
      const config = Utils.getCombinedConfig()
      if (argv.disableTenTemporarily || config.disableTenTemporarily || argv.execMode) {
        return
      }

      const env = Utils.getNodeEnv() /// development/production/test
      const envColor = env === 'production' ? 'yellow' : 'green'
      console.log(Utils.chalk[envColor](ten[Math.floor(Math.random() * ten.length)]), '\n')
    }
  }
}
