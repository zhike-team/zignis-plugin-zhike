const Consul = require('zhike-consul')
const consulConfig = require('../../consul.json')
const Sequelize = require('sequelize')
const _ = require('lodash')

const instances = {}

module.exports = {
  get() {
    return instances
  },
  *load(consulKey, instanceKey = '') {
    const env = process.env.NODE_ENV ? process.env.NODE_ENV : 'development' // development/production/test
    const keysPrefix = [consulKey.split('.')[0]]

    delete global.CFG
    const consul = new Consul(keysPrefix, consulConfig[env].host, consulConfig[env].port, global, {
      output: false,
      timeout: 5000
    })

    const data = yield consul.pull(env)
    let dbConfig = _.get(data.CFG, consulKey)
    if (dbConfig.options) {
      dbConfig = Object.assign({}, dbConfig, dbConfig.options)
    }

    if (dbConfig.user && !dbConfig.username) {
      dbConfig.username = dbConfig.user
    }

    let sequelize = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, {
      dialect: dbConfig.dialect,
      host: dbConfig.host,
      port: dbConfig.port,
      timezone: '+08:00',
      logging: undefined,
      pool: {
        maxConnections: dbConfig.pool
      }
    })

    function forbiddenMethod() {
      throw new Error('Dangerous method forbidden!')
    }

    // 防止误操作，删除、清空整个库
    sequelize.drop = forbiddenMethod // 删除所有的表
    sequelize.truncate = forbiddenMethod // 清空所有的表
    sequelize.dropAllSchemas = forbiddenMethod // 删除所有的 postgres schema，即删掉整个数据库
    sequelize.dropSchema = forbiddenMethod // 删除一个 postgres schema，一般也相当于删掉整个数据库

    yield sequelize.authenticate()

    instanceKey = instanceKey || consulKey
    instances[instanceKey] = sequelize

    const interface = sequelize.getQueryInterface()
    const tables = yield interface.showAllTables()
    const tableInfos = yield Promise.all(
      tables.map(table => {
        return interface.describeTable(table)
      })
    )

    const combinedTableInfos = _.zipObject(tables, tableInfos)
    Object.keys(combinedTableInfos).forEach(table => {
      const tableInfo = combinedTableInfos[table]
      const newTableInfo = {}
      Object.keys(tableInfo).map(field => {
        const newField = field.replace(/(_.)/g, function(word) {
          return word[1].toUpperCase()
        })
        tableInfo[field].field = field
        newTableInfo[newField] = tableInfo[field]
      })
      const modelName =
        table.indexOf(dbConfig.prefix) > -1
          ? table.substring(dbConfig.prefix.length).replace(/(_.)/g, function(word) {
              return word[1].toUpperCase()
            })
          : table.replace(/(_.)/g, function(word) {
              return word[1].toUpperCase()
            })
      const modelNameUpper = modelName.replace(/( |^)[a-z]/g, L => L.toUpperCase())

      sequelize.define(modelNameUpper, newTableInfo, {
        tableName: table
      })
    })

    return true
  }
}
