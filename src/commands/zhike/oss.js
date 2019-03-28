
const { Utils } = require('zignis')

exports.command = 'oss'
exports.desc = 'zhike oss tools'
// exports.aliases = ''

exports.builder = function (yargs) {
  Utils.extendSubCommand('zhike/oss', 'zignis-plugin-zhike', yargs, __dirname)
}

exports.handler = function (argv) {
  console.log('Start to draw your dream code!')
}
