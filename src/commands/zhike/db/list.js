const co = require('co')
const { Utils } = require('zignis')
const { components } = require('../../../../')

exports.command = 'list <dbKey>'
exports.desc = 'list all table of specific database'
exports.aliases = ['l', 'ls']

exports.builder = function(yargs) {}

exports.handler = function(argv) {
  co(function*() {
    const { db } = yield components()
    let dbInstance
    try {
      dbInstance = yield db.load(argv.dbKey)
    } catch (e) {
      Utils.error(e.message)
    }

    const queryInterface = dbInstance.getQueryInterface()
    const tables = yield queryInterface.showAllTables()

    tables.forEach(function(table) {
      console.log(table)
    })
    process.exit(0)
  }).catch(e => {
    Utils.error(e.stack)
  })
}
