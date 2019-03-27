
const { Utils } = require('zignis')

exports.command = 'list'
exports.desc = 'list queue names'
exports.aliases = 'ls'

exports.builder = function (yargs) {
  // yargs.option('option', { default, describe, alias })
  // yargs.commandDir('list')
}

exports.handler = async function (argv) {
  const { consul } = await Utils.invokeHook('components')
  const config = await consul.get('mq')

  Object.keys(config.mq.aliMns).forEach(key => {
    if (Utils._.isObject(config.mq.aliMns[key])) {
      console.log(`${Utils.chalk.cyan(key)}: [${Utils.chalk.green(config.mq.aliMns[key].name)} - ${config.mq.aliMns[key].region}]`)
    }
  })

  process.exit(0)

}
