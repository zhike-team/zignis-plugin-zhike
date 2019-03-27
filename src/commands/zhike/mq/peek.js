
const { Utils } = require('zignis')
const MQ = require('../../../common/mq')

exports.command = 'peek <queueName>'
exports.desc = 'show top message on the queue'
// exports.aliases = ''

exports.builder = function (yargs) {
  // yargs.option('option', { default, describe, alias })
  // yargs.commandDir('peek')
}

exports.handler = async function (argv) {
  const mq = new MQ(argv.queueName)

  let ret
  try {
    const queue = await mq.connect()
    ret = await queue.peekP(1)
  } catch (e) {
    Utils.error(e.Error.Message)
  }

  Utils.log(ret)

  process.exit(0)
}
