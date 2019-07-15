import { Utils } from 'zignis'
import Redis from 'ioredis'
import mq from './mq'
import oss from './oss'
import elasticsearch from './elasticsearch'
import * as consulCommand from '../commands/zhike/consul'
import DatabaseLoader from './db'
import api from './api'
const dbForComponent = new DatabaseLoader({ loadReturnInstance: true })
const dbForRepl = new DatabaseLoader({ readonly: true })
const debug = Utils.debug('zignis-plugin-zhike:utils')

const config = {
  async get(keys: string | string[]) {
    try {
      keys = Array.isArray(keys) ? keys : Utils.splitComma(keys)
      const { result } = await consulCommand.handler({ keys, silent: true })
      return result
    } catch (e) {
      throw new Error(e.stack)
    }
  },

  async getAndWatch(keys: string | string[], callback: any) {
    try {
      const keysArray = Array.isArray(keys) ? keys : Utils.splitComma(keys)
      const { result, zhikeConsul, env } = await consulCommand.handler({ keysArray, silent: true })
      const consul = zhikeConsul.consul
      const watch = function(key: string) {
        let watch = consul.watch({ method: consul.kv.get, options: { key } })
        watch.once('change', function() {
          // 初始会有一次 change 事件，忽略第一次的事件
          watch.on('change', function(data: any) {
            let value = JSON.parse(data.Value)[env]
            debug(`CFG ${key} changed to:`, value)
            callback && callback(key, value)
          })
          watch.on('error', function(err: Error) {
            // always received errors, but watch still working, use this event listenner to skip error
            // console.log('error:', err);
          })
        })
      }
      keysArray.map(watch)
      return result
    } catch (e) {
      throw new Error(e.stack)
    }
  }
}

const redisInstance = async () => {
  const { redis: redisConfig } = await config.get('redis')
  const redis = new Redis(redisConfig)

  return redis
}

export { dbForComponent, dbForRepl, redisInstance, config, api, mq, oss, elasticsearch }
