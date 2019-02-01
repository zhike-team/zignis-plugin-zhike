const Utils = require('./src/common/utils')

module.exports = {
  /** Expose plugin utils */
  Utils,
  /** Expose db, so you can directly use it without await component() or invokeHook('components') */
  db: Utils.dbForComponent,
  /** It's db alias */
  database: Utils.dbForComponent,
  /** Expose consul, so you can directly use it without await component() or invokeHook('components') */
  consul: Utils.config,
  /** It's consul alias */
  config: Utils.config,
  /** Expose redis, so you can directly use it without await component() or invokeHook('components') */
  redis: Utils.redisInstance,
  /** It's redis alias */
  cache: Utils.redisInstance,
  /** Expose api, so you can directly use it without await component() or invokeHook('components') */
  api: Utils.api,
}
