const Consul = require('zhike-consul')
const consulConfig = require('./consul.json')
const Redis = require('ioredis')
const consulCommand = require('./src/commands/zhike/consul')
module.exports = {
  * repl() {
    const env = process.env.NODE_ENV ? process.env.NODE_ENV : 'development' // development/production/test

    // add zhike redis instance
    const consul = new Consul(
      ['redis'],
      consulConfig[env].host,
      consulConfig[env].port,
      global,
      {
        output: false,
        timeout: 5000
      }
    )
    const data = yield consul.pull(env)
    const config = data.CFG
    const redis = new Redis(config.redis)
    return {
      redis,
      consul(keys) {
        keys = Array.isArray(keys) ? keys : keys.split(',')
        return consulCommand.handler({keys})
      }
    }
  }
}