const { Utils } = require('zignis')

exports.command = 'zhike'
exports.desc = 'Zhike related commands'

exports.builder = function(yargs) {
  // yargs.commandDir('zhike')
  Utils.extendSubCommand('zhike', 'zignis-plugin-zhike', yargs, __dirname)
}

exports.handler = function(argv) {}
