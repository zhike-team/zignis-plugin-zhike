const co = require('co')
const fs = require('fs')
const path = require('path')
const { Utils } = require('zignis')
const migration = require('../../../common/migration')

exports.command = 'generate <dbKey> <tableName> [fieldName]'
exports.desc = 'db migration generator'
exports.aliases = ['g', 'create']

exports.builder = function(yargs) {
  yargs.option('attributes', { default: false, describe: 'define attributes for table/field' })
  yargs.option('rename', { default: false, describe: 'rename table/field name' })
  yargs.option('modify', { default: false, describe: 'modify field defination' })

  yargs.option('only-up', { default: false, describe: 'empty down process' })
  yargs.option('simulate', { default: false, describe: 'only output in stdout', alias: 'dry' })
  yargs.option('reverse', { default: false, describe: 'reverse up and down' })
  yargs.option('migration-dir', { default: false, describe: 'change migration dir' })

  yargs.option('file-suffix', {
    default: false,
    describe: 'migration file suffix name, override the auto generated name'
  })
  yargs.option('index', { default: false, describe: 'add index' })

  yargs.option('typescript', { default: false, describe: 'typescript format migration file', alias: 'ts' })
}

exports.handler = function(argv) {
  co(function*() {
    const { db, config } = yield Utils.invokeHook('components')
    let dbInstance
    try {
      dbInstance = yield db.load(argv.dbKey)
    } catch (e) {
      Utils.error(e.message)
    }

    const dbConfig = Utils._.get(yield config.get(argv.dbKey), argv.dbKey)

    let tableName = dbConfig.prefix && argv.tableName.indexOf(dbConfig.prefix) !== 0 ? dbConfig.prefix + argv.tableName : argv.tableName

    let ret
    if (argv.fieldName) {
      ret = yield migration.genMigrationForField(tableName, argv.fieldName, dbInstance, dbConfig, argv)
    } else {
      ret = yield migration.genMigrationForTable(tableName, dbInstance, dbConfig, argv)
    }

    if (argv.simulate) {
      console.log(ret)
    } else {
      if (!argv.migrationDir || !fs.existsSync(argv.migrationDir)) {
        Utils.error('"migrationDir" missing in config file or not exist in current directory!')
      }

      const fileName = migration.genFileSuffix(argv)
      const filePrefix = Utils.day().format('YYYYMMDDHHmmssSSS')
      const migrationFile = path.resolve(
        argv.migrationDir,
        `${filePrefix}_${Utils._.kebabCase(fileName)}.${argv.typescript ? 'ts' : 'js'}`
      )
      if (fs.existsSync(migrationFile)) {
        Utils.error('File exist!')
      }

      if (!fs.existsSync(migrationFile)) {
        fs.writeFileSync(migrationFile, ret)
        console.log(Utils.chalk.green(`${migrationFile} created!`))
      }
    }

    process.exit(0)
  }).catch(e => {
    Utils.error(e.stack)
  })
}
