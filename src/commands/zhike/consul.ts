import Consul from 'zhike-consul'
import yargs from 'yargs'
import { Utils } from 'zignis'

const consulConfig = require('../../../consul.json')
const env: string = Utils.getNodeEnv() // development/production/test
const consulCachedKV: { [propName: string]: any } = {}
const consulCachedInstance: { [propName: string]: any } = {}

export const command = 'consul <keys..>'
export const desc = 'zhike consul config review'
export const aliases = 'config'

export const builder = function(yargs: yargs.Argv) {
  yargs.option('quiet', {
    alias: 'q',
    default: false,
    describe: 'simple console log'
  })

  yargs.option('silent', {
    default: false,
    describe: 'not console log result'
  })
}

export const handler = async function(argv: {
  [propName: string]: any
}): Promise<{
  result?: any
  zhikeConsul?: any
  env?: any
}> {
  try {
    if (!argv.keys) {
      Utils.error('Please provide at least 1 key')
    }
    let keysPrefix: string[] = []
    argv.keys.map((key: string) => {
      keysPrefix.push(key.split('.')[0])
    })
    keysPrefix = Utils._.uniq(keysPrefix)
    const cacheKey = `${env}:${Utils.md5(JSON.stringify(keysPrefix))}`
    let data: any
    let consul
    if (consulCachedKV[cacheKey]) {
      data = consulCachedKV[cacheKey]
      consul = consulCachedInstance[cacheKey]
    } else {
      consul = new Consul(
        keysPrefix,
        consulConfig[env].host,
        consulConfig[env].port,
        {},
        {
          output: false,
          timeout: 5000
        }
      )
      try {
        data = await consul.pull(env)
      } catch (error) {
        Utils.error(`Consul pull ${consulConfig[env].host}:${consulConfig[env].port} failed: ${error}!`)
      }
      consulCachedKV[cacheKey] = data
      consulCachedInstance[cacheKey] = consul
    }
    const pickNeededFromPull = {}
    argv.keys.map((key: string) => {
      Utils._.set(pickNeededFromPull, key, Utils._.get(data.CFG, key))
    })
    if (!argv.silent) {
      if (argv.quiet) {
        console.log(JSON.stringify(pickNeededFromPull, null, 2))
      } else {
        Utils.log(pickNeededFromPull)
      }
    } else {
      return { result: pickNeededFromPull, zhikeConsul: consul, env }
    }
  } catch (e) {
    Utils.error(e.stack)
  }

  return {}
}
