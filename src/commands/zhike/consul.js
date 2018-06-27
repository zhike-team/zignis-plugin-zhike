const co = require('co')
const Consul = require('zhike-consul')
const consulConfig = require('../../../consul.json')

exports.command = 'consul [keys..]'
exports.desc = 'zhike consul related'

exports.builder = function (yargs) {
}

exports.handler = function (argv) {

  co(function*() {
    const env = process.env.NODE_ENV ? process.env.NODE_ENV : 'development' // development/production/test
    const consul = new Consul(argv.keys, consulConfig[env].host, consulConfig[env].port, global, {
      output: false,
      timeout: 5000,
    })
    const data = yield consul.pull(env)
    console.log(JSON.stringify(data.CFG, null, 2));
  })
  
}
