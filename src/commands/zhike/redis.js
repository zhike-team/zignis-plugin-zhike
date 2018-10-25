const co = require('co')
const thunkify = require('thunkify-wrap')
const _ = require('lodash')
const Consul = require('zhike-consul')
const consulConfig = require('../../../consul.json')
const Utils = require('../../../../zignis/src/common/utils')
const Redis = require('ioredis')

exports.command = 'redis cmd [arguments..]'
exports.desc = 'zhike redis review, cmd could be get, set, hget, hset and so on.'

exports.builder = function(yargs) {
  // yargs.default('quiet', false).alias('q', 'quiet')
}

exports.handler = function(argv) {
  co(function*() {
    const env = process.env.NODE_ENV ? process.env.NODE_ENV : 'development' // development/production/test

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
    const cache = new Redis(config.redis)
    const ret = yield cache[argv.cmd].apply(cache, argv.arguments)

    if (argv.json) {
      Utils.log(JSON.parse(ret))
    } else {
      Utils.log(ret)

    }

    process.exit(0)
  })
}
