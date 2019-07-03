import { Utils } from 'zignis'

export const command = 'list <dbKey>'
export const desc = 'list all table of specific database'
export const aliases = ['l', 'ls']

export const builder = function(yargs: any) {}

export const handler = async function(argv: any) {
  try {
    const { db } = await Utils.invokeHook('components')
    let dbInstance
    try {
      dbInstance = await db.load(argv.dbKey)
    } catch (e) {
      Utils.error(e.message)
    }

    const queryInterface = dbInstance.getQueryInterface()
    const tables = await queryInterface.showAllTables()

    tables.forEach(function(table: string) {
      console.log(table)
    })
    process.exit(0)
  } catch (e) {
    Utils.error(e.stack)
  }
}
