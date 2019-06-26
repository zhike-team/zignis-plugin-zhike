
const { Utils } = require('zignis')

exports.command = 'elasticsearch <op>'
exports.desc = 'zhike elasticsearch tools'
exports.aliases = 'es'

exports.builder = function (yargs) {
  yargs.option('params', { default: {}, describe: 'Please reference client.cat.indices', alias: 'p' })
  yargs.option('debug', { describe: 'Show debug info' })
  // yargs.commandDir('es')
}

exports.handler = function (argv) {
  return Utils.co(function* () {

    if (argv.debug) {
      Utils.log(argv)
    }
    const { elasticsearch } = yield Utils.invokeHook('components')
    const client = yield elasticsearch()

    const func = Utils._.get(client, argv.op)
    if (Utils._.isFunction(func)) {
      const ret = yield func(argv.params)
      Utils.log(ret.body)
    } else {
      Utils.error('Invalid elasticsearch api function name, please refer to: https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html')
    }

    
  }).catch((e) => Utils.error(e.stack))
}
