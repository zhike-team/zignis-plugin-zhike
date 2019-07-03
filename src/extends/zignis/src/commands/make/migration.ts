import * as migrationCommand from '../../../../../commands/zhike/db/generate'

export const command = 'migration <dbKey> <tableName> [fieldName]'
export const desc = 'Generate a db migration'
export const aliases = []

export const builder = migrationCommand.builder
export const handler = migrationCommand.handler
