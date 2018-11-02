const Consul = require('zhike-consul')
const consulConfig = require('../../consul.json')
const Sequelize = require('sequelize')
const _ = require('lodash')
const co = require('co')
const fs = require('fs')

class DatabaseLoader {
  constructor(options) {
    this.options = Object.assign({}, {
      loadReturnInstance: false
    }, options)
    this.instances = {}
  }

  get() {
    return this.instances
  }

  load(consulKey, instanceKey = '', callback) {
    let that = this
    return co(function* () {
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
        operatorsAliases: false,
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
      that.instances[instanceKey] = sequelize

      const queryInterface = sequelize.getQueryInterface()
      const tables = yield queryInterface.showAllTables()
      const tableInfos = yield Promise.all(
        tables.map(table => {
          return queryInterface.describeTable(table)
        })
      )

      const combinedTableInfos = _.zipObject(tables, tableInfos)
      Object.keys(combinedTableInfos).forEach(table => {
        const tableInfo = combinedTableInfos[table]
        const newTableInfo = {}
        const newTableFields = []
        Object.keys(tableInfo).map(field => {
          const newField = field.replace(/(_.)/g, function(word) {
            return word[1].toUpperCase()
          })
          tableInfo[field].field = field
          newTableInfo[newField] = tableInfo[field]
          newTableFields.push(newField)
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

        try {
          let options = {
            tableName: table
          }

          if (newTableFields.indexOf('createdAt') === -1) {
            options.createdAt = false
          }

          if (newTableFields.indexOf('updatedAt') === -1) {
            options.updatedAt = false
          }

          let model = sequelize.define(modelNameUpper, newTableInfo, options)
          model.drop = forbiddenMethod // 以防误删表
        } catch (e) {}
      })

      if (callback) {
        callback(sequelize)
      }

      if (that.options.loadReturnInstance) {
        return sequelize
      }
    })
  }

  associate(modelPath) {
    return function(sequelize) {
      Object.keys(sequelize.models).forEach((modelName) => {
        if (fs.existsSync(`${modelPath}/${modelName}.js`)) {
          let model = sequelize.models[modelName]
          require(`${modelPath}/${modelName}`).bind(model)(sequelize.models)
        }
      })
    }
  }
}

module.exports = DatabaseLoader
