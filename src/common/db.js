const Consul = require('zhike-consul')
const consulConfig = require('../../consul.json')
const Sequelize = require('sequelize')
const _ = require('lodash')
const co = require('co')
const fs = require('fs')

const { Utils } = require('zignis')

class DatabaseLoader {
  constructor(options) {
    this.options = Object.assign(
      {},
      {
        loadReturnInstance: false,
        readonly: false
      },
      options
    )
    this.instances = {}
  }

  get() {
    return this.instances
  }

  /**
   * 实例化数据库连接，数据库配置可以从 consul 取，也可以直接传给 load 方法
   * @param {string|array} consulKey 
   * @param {string} instanceKey 
   * @param {function} callback 
   */
  load(consulKey, instanceKey = '', callback) {
    let that = this
    return co(function*() {
      instanceKey = instanceKey || consulKey

      // init db only once
      if (that.instances[instanceKey]) {
        return that.instances[instanceKey]
      }

      let dbConfig
      if (_.isObject(consulKey)) {
        if (!instanceKey) {
          throw new Error('The second parameter:instanceKey is required!')
        }
        dbConfig = consulKey

      } else {
        const env = process.env.NODE_ENV ? process.env.NODE_ENV : 'development' // development/production/test
        const keysPrefix = [consulKey.split('.')[0]]

        const consul = new Consul(keysPrefix, consulConfig[env].host, consulConfig[env].port, {}, {
          output: false,
          timeout: 5000
        })

        const data = yield consul.pull(env)
        dbConfig = _.get(data.CFG, consulKey)
      }
      
      if (!dbConfig) {
        throw new Error('consulKey not exist')
      }

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
          // for PG, check autoIncrement rule 
          if (/^nextval\(.*?::regclass\)$/.test(tableInfo[field].defaultValue)) {
            delete tableInfo[field].defaultValue
            tableInfo[field].autoIncrement = true
          }

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
          model.sync = forbiddenMethod

          if (that.options.readonly && process.env.NODE_ENV === 'production') {
            model.upsert = forbiddenMethod
            model.truncate = forbiddenMethod
            model.destroy = forbiddenMethod
            model.restore = forbiddenMethod
            model.update = forbiddenMethod
            model.create = forbiddenMethod
            model.findOrCreate = forbiddenMethod
            model.findCreatefFnd = forbiddenMethod
            model.bulkCreate = forbiddenMethod
            model.removeAttribute = forbiddenMethod
          }
        } catch (e) {}
      })

      if (callback) {
        callback(sequelize)
      }

      if (that.options.loadReturnInstance) {
        return that.instances[instanceKey]
      }
    }).catch(e => {
      throw new Error(e.stack)
    })
  }

  associate(modelPath) {
    return function(sequelize) {
      Object.keys(sequelize.models).forEach(modelName => {
        if (fs.existsSync(`${modelPath}/${modelName}.js`)) {
          let model = sequelize.models[modelName]
          require(`${modelPath}/${modelName}`).bind(model)(sequelize.models)
        }
      })
    }
  }
}

module.exports = DatabaseLoader
