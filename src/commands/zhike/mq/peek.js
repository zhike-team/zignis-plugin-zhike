
const { Utils } = require('zignis')
const mq = require('../../../common/mq')

exports.command = 'peek <queueName>'
exports.desc = 'show top message on the queue'
// exports.aliases = ''

exports.builder = function (yargs) {
  // yargs.option('option', { default, describe, alias })
  // yargs.commandDir('peek')
}

exports.handler = function (argv) {
  return Utils.co(function * () {
    const queue = yield mq(argv.queueName)

    let ret
    try {
      ret = yield queue.peekP(1)
    } catch (e) {
      Utils.error(e.Error.Message)
    }

    Utils.log(ret)

    process.exit(0)
  }).catch((e) => Utils.error(e.stack))
}
