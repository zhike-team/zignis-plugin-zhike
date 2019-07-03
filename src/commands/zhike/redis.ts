import Consul from 'zhike-consul'
import Redis from 'ioredis'
import { Utils } from 'zignis'

const consulConfig = require('../../../consul.json')

export const command = 'redis cmd [arguments..]'
export const desc = 'zhike redis tools'
export const aliases = 'cache'

export const builder = function(yargs: any) {
  yargs.option('json', {
    default: false,
    describe: 'json parse before output'
  })
  yargs.option('silent', {
    default: false,
    describe: 'do not console log the result'
  })
}

export const handler = async function(argv: any) {
  try {
    const env = process.env.NODE_ENV ? process.env.NODE_ENV : 'development' // development/production/test
    const consul = new Consul(
      ['redis'],
      consulConfig[env].host,
      consulConfig[env].port,
      {},
      {
        output: false,
        timeout: 5000
      }
    )
    const data = await consul.pull(env)
    const config = data.CFG
    const cache: { [propName: string]: any } = new Redis(config.redis)
    const ret = await cache[argv.cmd].apply(cache, argv.arguments)
    if (!argv.silent) {
      if (argv.json) {
        Utils.log(JSON.parse(ret))
      } else {
        Utils.log(ret)
      }
      process.exit(0)
    }
    return ret
  } catch (e) {
    Utils.error(e.stack)
  }
}
