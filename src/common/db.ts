import { Sequelize, Model, Op } from 'sequelize'
import { Utils } from 'zignis'
import fs from 'fs'
import * as consulCommand from '../commands/zhike/consul'

class DatabaseLoader {
  options: { [propName: string]: any }
  instances: { [propName: string]: any }
  constructor(options: { [propName: string]: any }) {
    this.options = Object.assign(
      {},
      {
        loadReturnInstance: false,
        loadReturnModels: false,
        readonly: false
      },
      options
    )
    this.instances = {}
  }

  get Sequelize() {
    return Sequelize
  }

  get Op(): typeof Op {
    return Op
  }

  /**
   * 获取数据库配置，可以直接被 Sequelize CLI 解析
   * @param {string|array} consulKey
   */
  async config(consulKey: string | string[]) {
    let dbConfig
    if (Utils._.isObject(consulKey)) {
      dbConfig = consulKey
    } else if (Utils._.isString(consulKey)) {
      const { result } = await consulCommand.handler({ keys: [consulKey], silent: true })
      dbConfig = Utils._.get(result, consulKey)
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

    return dbConfig
  }

  /**
   * 实例化数据库连接，数据库配置可以从 consul 取，也可以直接传给 load 方法
   * @param {string|array} consulKey
   * @param {string} instanceKey
   * @param {function} callback
   */
  async load(consulKey: string | { [propName: string]: any }, instanceKey: any = '', callback: any, opts: any = {}) {
    let that = this
    opts = Object.assign({}, {
      raw: false,
      extendModelClass: false // 后面逐步迁移到使用 init 的方式初始化模型的机制
    }, opts)
    try {
      if (Utils._.isFunction(instanceKey) || Utils._.isArray(instanceKey)) {
        callback = instanceKey
        opts = callback
        instanceKey = <string>consulKey
      } else if (Utils._.isObject(instanceKey)) {
        callback = null
        opts = instanceKey
        instanceKey = <string>consulKey
      } else if (Utils._.isString(instanceKey)) {
        if (Utils._.isObject(callback)) {
          opts = callback
          callback = instanceKey
          instanceKey = ''
        }
        instanceKey = instanceKey || (Utils._.isString(consulKey) ? consulKey : Utils.md5(JSON.stringify(consulKey)))
      } else {
        throw new Error('Undefined argument type!')
      }

      if (Utils._.isObject(callback)) {
        opts = callback
        callback = null
      }

      // init db only once
      if (that.instances[instanceKey]) {
        if (that.options.loadReturnInstance) {
          return that.instances[instanceKey]
        }

        if (that.options.loadReturnModels && that.instances[instanceKey].models) {
          return that.instances[instanceKey].models
        }

        return that
      }

      let dbConfig: any
      if (Utils._.isObject(consulKey)) {
        if (!instanceKey) {
          throw new Error('The second parameter:instanceKey is required!')
        }
        dbConfig = consulKey
      } else {
        const { result } = await consulCommand.handler({ keys: [consulKey], silent: true })
        dbConfig = Utils._.get(result, consulKey)
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
        host: dbConfig.host,
        port: dbConfig.port,
        timezone: '+08:00',
        logging: undefined,
        pool: {
          max: Utils._.isObject(dbConfig.pool) ? (dbConfig.pool.max || 50) : (dbConfig.pool || 50)
        },
        query: {
          raw: opts.raw || false
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

      await sequelize.authenticate()

      that.instances[instanceKey] = sequelize

      const queryInterface = sequelize.getQueryInterface()
      const tables = await queryInterface.showAllTables()
      const tableInfos = await Promise.all(
        tables.map((table: string) => {
          return queryInterface.describeTable(table).catch(() => false);
        })
      )

      const combinedTableInfos = Utils._.zipObject(tables, tableInfos)
      Object.keys(combinedTableInfos).forEach(table => {
        const tableInfo: any = combinedTableInfos[table]
        if (!tableInfo) return
        const newTableInfo: { [propName: string]: any } = {}
        const newTableFields: any[] = []
        let tableAutoIncrementFieldExisted = false
        Object.keys(tableInfo).map(field => {
          const newField = field.replace(/(_.)/g, function(word) {
            return word[1].toUpperCase()
          })

          tableInfo[field].field = field
          // for PG, check autoIncrement rule
          if (/^nextval\(.*?::regclass\)$/.test(tableInfo[field].defaultValue)) {
            delete tableInfo[field].defaultValue
            tableInfo[field].autoIncrement = true
            tableInfo[field].allowNull = true // This seems a Sequelize bug, for primaryKey, use this to make create method work
            tableAutoIncrementFieldExisted = true
          }

          // Only one autoincrement field allowed, we should put autoIncrement at the first of the table
          if (tableAutoIncrementFieldExisted && tableInfo[field].autoIncrement) {
            delete tableInfo[field].autoIncrement
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
          let options: any = {
            tableName: table,
            modelName: modelNameUpper,
            sequelize
          }

          if (newTableFields.indexOf('createdAt') === -1) {
            options.createdAt = false
          } else {
            options.createdAt = 'created_at'
          }

          if (newTableFields.indexOf('updatedAt') === -1) {
            options.updatedAt = false
          } else {
            options.updatedAt = 'updated_at'
          }

          let model
          if (!opts.extendModelClass) {
            model = sequelize.define(modelNameUpper, newTableInfo, options)
          } else {
            let modelFilePath
            try {
              modelFilePath = require.resolve(`${callback}/${modelNameUpper}`)
            } catch (e) {
              if (e.code !== 'MODULE_NOT_FOUND') {
                console.error(e.message)
              }
            }
            if (Utils._.isString(callback) && modelFilePath && fs.existsSync(modelFilePath)) {
              model = (require(modelFilePath)).init(newTableInfo, options)
            } else {
              model = sequelize.define(modelNameUpper, newTableInfo, options)
            }
          }


          model.drop = forbiddenMethod // 以防误删表
          model.sync = forbiddenMethod

          if (that.options.readonly && Utils.getNodeEnv() === 'production') {
            model.upsert = forbiddenMethod
            model.truncate = forbiddenMethod
            model.destroy = forbiddenMethod
            model.restore = forbiddenMethod
            model.update = forbiddenMethod
            model.create = forbiddenMethod
            model.findOrCreate = forbiddenMethod
            model.bulkCreate = forbiddenMethod
            model.removeAttribute = forbiddenMethod
          }
        } catch (e) {}
      })

      if (!opts.extendModelClass) {
        // load 函数的callback参数可以是
        // 1, 一个回调函数的数组，
        // 2, 一组路径
        // 3，一个回调函数
        // 4，一个路径
        if (callback) {
          if (Utils._.isArray(callback)) {
            callback.map((cb: any) => {
              if (Utils._.isFunction(cb)) {
                cb(sequelize.models, sequelize)
              } else if (Utils._.isString(cb)) {
                // implicitly means to call this.associate, and cb is actually modealPath
                that.associate(cb)(sequelize.models, sequelize)
              }
            })
          } else {
            if (Utils._.isFunction(callback)) {
              callback(sequelize.models, sequelize)
            } else if (Utils._.isString(callback)) {
              // implicitly means to call this.associate, and callback is actually modealPath
              that.associate(callback)(sequelize.models, sequelize)
            }
          }
        }
      } else {
        Object.keys(sequelize.models).forEach(function (modelName) {
          let model: any = sequelize.models[modelName]
          if (Utils._.isFunction(model.associate)) {
            model.associate(sequelize.models)
          }
        })
      }

      if (that.options.loadReturnInstance) {
        return that.instances[instanceKey]
      }

      if (that.options.loadReturnModels && that.instances[instanceKey].models) {
        return that.instances[instanceKey].models
      }

      return that
    } catch (e) {
      throw new Error(e.stack)
    }
  }

  /**
   * 处理模型的关联关系
   * @param {string} modelPath
   */
  // @ts-ignore
  associate(modelPath: string) {
    return function(
      models: {
        [key: string]: typeof Model
      },
      sequelize: Sequelize
    ) {
      Object.keys(models).forEach(modelName => {
        if (fs.existsSync(`${modelPath}/${modelName}.js`)) {
          let model = sequelize.models[modelName]
          let modelExtend = require(`${modelPath}/${modelName}`)
          if (Utils._.isFunction(modelExtend)) {
            const ret = modelExtend.bind(model)(sequelize.models, sequelize)
            if (ret) {
              sequelize.models[modelName] = ret
            }
          } else {
            throw new Error('Model extension must be a function.')
          }
        }
      })
    }
  }
}

export = DatabaseLoader
