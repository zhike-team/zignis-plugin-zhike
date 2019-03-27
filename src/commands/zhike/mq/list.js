
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

  const rows = [[
    Utils.chalk.green('Key'),
    Utils.chalk.green('Name'),
    Utils.chalk.green('Region'),
  ]]

  Object.keys(config.mq.aliMns).forEach(key => {
    if (Utils._.isObject(config.mq.aliMns[key])) {
      rows.push([
        Utils.chalk.cyan(key),
        config.mq.aliMns[key].name,
        config.mq.aliMns[key].region
      ])
    }
  })

  console.log(Utils.table(rows))

  process.exit(0)

}
