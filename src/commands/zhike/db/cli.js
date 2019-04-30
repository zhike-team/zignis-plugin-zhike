
const { Utils } = require('zignis')

exports.command = 'cli <dbKey>'
exports.desc = 'pgcli/mycli connector'
// exports.aliases = ''

exports.builder = function (yargs) {
  // yargs.option('option', { default, describe, alias })
  // yargs.commandDir('cli')
}

exports.handler = async function (argv) {
  const { consul } = await Utils.invokeHook('components')
  const config = await consul.get(argv.dbKey)
  const db = Utils._.get(config, argv.dbKey)

  if (!db) {
    Utils.error('Invalid db key!')
  }

  const cmd = db.dialect === 'mysql' || db.port === 3306 ? 'mycli' : 'pgcli'

  if (!Utils.shell.which(cmd)) {
    Utils.error(`Sorry, ${cmd} needs to be installed first!`);
  }

  if (!db.username || !db.host || !db.port || !db.database) {
    Utils.error('Db config in Consul is missing some key info! (host, port, database, username are required)')
  }

  const dialect = db.dialect || (cmd === 'mycli' ? 'mysql' : 'postgres')
  const connectionString = `${dialect}://${db.username}:${db.password}@${db.host}:${db.port}/${db.database}`
  Utils.exec(`${cmd} ${connectionString}`)
}
