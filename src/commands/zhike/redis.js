const co = require('co')
const thunkify = require('thunkify-wrap')
const _ = require('lodash')
const Consul = require('zhike-consul')
const consulConfig = require('../../../consul.json')
const Utils = require('../../../../zignis/src/common/utils')

exports.command = 'redis cmd key [...arguments]'
exports.desc = 'zhike redis review, cmd could be get, set, hget, hset and so on.'

exports.builder = function(yargs) {
  // yargs.default('quiet', false).alias('q', 'quiet')
}

exports.handler = function(argv) {
  co(function*() {
    const env = process.env.NODE_ENV ? process.env.NODE_ENV : 'development' // development/production/test

    // const keysPrefix = []
    // argv.keys.map((key) => {
    //   keysPrefix.push(key.split('.')[0])
    // })
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
    const cache = require('redis').createClient(
      config.redis.port,
      config.redis.host,
      { password: config.redis.password ? config.redis.password : undefined }
    )

    console.log('here')

    switch (argv.cmd) {
      case 'get':
        const ret = yield thunkify(cache.get.bind(cache))(argv.key);
        console.log(ret)
        break;
      case 'set':
        if (env === 'production') {
          console.warn('Write options can not be done on production')
          return;
        }
        yield thunkify(cache.setex.bind(cache))(argv.key, argv.expires, argv.value);
        break;
      case 'mget':
        yield thunkify(cache.mget.bind(cache))(key)
        break;
      case 'hget':

        break;
      case 'hset':
        if (env === 'production') {
          console.warn('Write options can not be done on production')
          return;
        }
        break;
      case 'hmset':

        break;
      case 'hgetall':

        break;
      case 'expire':

        break;
    }

    process.exit(0)

    // if (argv.quiet) {
    //   console.log(JSON.stringify(pickNeededFromPull, null, 2));
    // }
    // else {
    //   Utils.log(pickNeededFromPull)
    // }
  })
}
