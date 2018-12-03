const { Utils } = require('zignis')

exports.command = 'db <op>'
exports.desc = 'zhike db tools'
exports.aliases = 'database'

exports.builder = function(yargs) {
  Utils.extendSubCommand('zhike/db', 'zignis-plugin-zhike', yargs, __dirname)
}

exports.handler = function(argv) {}
