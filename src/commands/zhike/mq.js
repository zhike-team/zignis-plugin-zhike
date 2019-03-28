
const { Utils } = require('zignis')

exports.command = 'mq'
exports.desc = 'zhike mq tools'
// exports.aliases = ''

exports.builder = function (yargs) {
  // yargs.option('option', { default, describe, alias })
  Utils.extendSubCommand('zhike/mq', 'zignis-plugin-zhike', yargs, __dirname)
}

exports.handler = async function (argv) {
  console.log('Start to draw your dream code!')
  Utils.info('Finished successfully!', true)
}
