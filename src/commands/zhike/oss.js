
const { Utils } = require('zignis')

exports.command = 'oss'
exports.desc = 'oss tools'
// exports.aliases = ''

exports.builder = function (yargs) {
  Utils.extendSubCommand('oss', 'zignis-plugin-zhike', yargs, __dirname)
  // yargs.option('option', {default, describe, alias})
}

exports.handler = function (argv) {
  console.log('Start to draw your dream code!')
}
