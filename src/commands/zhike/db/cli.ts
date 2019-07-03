import { Utils } from 'zignis'

export const command = 'cli <dbKey>'
export const desc = 'pgcli/mycli connector'

export const builder = function(yargs: any) {}

export const handler = async function(argv: any) {
  const { consul } = await Utils.invokeHook('components')
  const config = await consul.get(argv.dbKey)
  const db = Utils._.get(config, argv.dbKey)

  if (!db) {
    Utils.error('Invalid db key!')
  }

  const cmd = db.dialect === 'mysql' || db.port === 3306 ? 'mycli' : 'pgcli'

  if (!Utils.shell.which(cmd)) {
    Utils.error(`Sorry, ${cmd} needs to be installed first!`)
  }

  if (!db.username || !db.host || !db.port || !db.database) {
    Utils.error('Db config in Consul is missing some key info! (host, port, database, username are required)')
  }

  const dialect = db.dialect || (cmd === 'mycli' ? 'mysql' : 'postgres')
  const connectionString = `${dialect}://${db.username}:${db.password}@${db.host}:${db.port}/${db.database}`
  Utils.exec(`${cmd} ${connectionString}`)
}
