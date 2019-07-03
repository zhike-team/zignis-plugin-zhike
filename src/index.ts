import * as Utils from './common/utils'
import { dbForComponent, config, api, redisInstance } from './common/utils'

/**
 * @module Utils
 */
export {
  /** Expose plugin utils */
  Utils,
  /** Expose db, so you can directly use it without await component() or invokeHook('components') */
  dbForComponent as db,
  /** It's db alias */
  dbForComponent as database,
  /** Expose consul, so you can directly use it without await component() or invokeHook('components') */
  config as consul,
  /** It's consul alias */
  config,
  /** Expose redis, so you can directly use it without await component() or invokeHook('components') */
  redisInstance as redis,
  /** It's redis alias */
  redisInstance as cache,
  /** Expose api, so you can directly use it without await component() or invokeHook('components') */
  api
}
