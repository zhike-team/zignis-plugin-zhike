exports.command = 'db <op>'
exports.desc = 'zhike db tools'
// exports.alias = ''

exports.builder = function(yargs) {
  yargs.commandDir('db')
  // yargs.option('option', {default, describe, alias})
}

exports.handler = function(argv) {}
