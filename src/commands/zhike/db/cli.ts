import { Utils } from 'zignis'

export const command = 'cli <dbKey>'
export const desc = 'pgcli/mycli connector'

export const builder = function(yargs: any) {}

export const handler = async function(argv: any) {
  const { consul } = await Utils.invokeHook('components')
  const config = await consul.get(argv.dbKey)
  let dbConfig = Utils._.get(config, argv.dbKey)

  if (!dbConfig) {
    Utils.error('Invalid db key!')
  }

  const cmd = dbConfig.dialect === 'mysql' || dbConfig.port === 3306 ? 'mycli' : 'pgcli'

  if (!Utils.shell.which(cmd)) {
    Utils.error(`Sorry, ${cmd} needs to be installed first!`)
  }

  if (dbConfig.options) {
    dbConfig = Object.assign({}, dbConfig, dbConfig.options)
  }

  if (dbConfig.user && !dbConfig.username) {
    dbConfig.username = dbConfig.user
  }

  if (!dbConfig.username || !dbConfig.host || !dbConfig.port || !dbConfig.database) {
    Utils.error('Db config in Consul is missing some key info! (host, port, database, username are required)')
  }

  const dialect = dbConfig.dialect || (cmd === 'mycli' ? 'mysql' : 'postgres')
  const connectionString = `${dialect}://${dbConfig.username}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`
  Utils.exec(`${cmd} ${connectionString}`)
}
