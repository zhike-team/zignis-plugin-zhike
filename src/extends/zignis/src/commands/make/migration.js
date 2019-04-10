
const migrationCommand = require('../../../../../commands/zhike/db/generate')

migrationCommand.command = 'migration <dbKey> <tableName> [fieldName]'
migrationCommand.desc = 'Generate a db migration'
migrationCommand.aliases = []

module.exports = migrationCommand