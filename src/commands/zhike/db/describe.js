const co = require('co')
const { Utils } = require('zignis')
const { components } = require('../../../../')

exports.command = 'describe <dbKey> <tableName>'
exports.desc = 'db table describe, tableName could be without prefix'
exports.aliases = 'desc'

exports.builder = function(yargs) {
  yargs.option('quiet', { default: false, describe: 'Only show field name', alias: 'q' })
}

exports.handler = function(argv) {
  co(function*() {
    const { db, config } = yield components()
    let dbInstance
    try {
      dbInstance = yield db.load(argv.dbKey)
    } catch (e) {
      Utils.error(e.message)
    }

    const dbConfig = Utils._.get(yield config(argv.dbKey), argv.dbKey)

    const queryInterface = dbInstance.getQueryInterface()
    const tables = yield queryInterface.showAllTables()

    let tableName = argv.tableName

    if (tables.indexOf(tableName) === -1 && dbConfig.prefix) {
      tableName = dbConfig.prefix + tableName
      if (tables.indexOf(tableName) === -1) {
        Utils.error('Table not found')
      }
    }

    const tableDescribed = yield queryInterface.describeTable(tableName)

    let outputTable = [['field', 'type', 'allowNull', 'defaultValue', 'primaryKey', 'comment']]
    Object.keys(tableDescribed).forEach(function(field) {
      const info = tableDescribed[field]
      outputTable.push([field, info.type, info.allowNull, info.defaultValue, info.primaryKey, ''])
    })

    if (argv.quiet) {
      outputTable.slice(1).forEach(function(field) {
        console.log(field[0])
      })
    } else {
      console.log(Utils.table(outputTable))
    }

    process.exit(0)
  })
}
