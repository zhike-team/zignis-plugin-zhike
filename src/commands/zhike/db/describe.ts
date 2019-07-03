import { Utils } from 'zignis'

const getPostgresFieldsCommentContent = async (db: any, tableName: string) => {
  const result = await db.query(
    'SELECT A.attnum,' +
      ' A.attname AS name,' +
      ' format_type ( A.atttypid, A.atttypmod ) AS type,' +
      ' A.attnotnull AS notnull,' +
      ' COALESCE ( P.indisprimary, FALSE ) AS primarykey,' +
      ' f.adsrc AS defaultvalue,' +
      ' d.description AS comment ' +
      ' FROM' +
      ' pg_attribute' +
      ' A LEFT JOIN pg_index P ON P.indrelid = A.attrelid ' +
      ' AND A.attnum = ANY ( P.indkey )' +
      ' LEFT JOIN pg_description d ON d.objoid = A.attrelid ' +
      ' AND d.objsubid = A.attnum' +
      ' LEFT JOIN pg_attrdef f ON f.adrelid = A.attrelid ' +
      ' AND f.adnum = A.attnum ' +
      ' WHERE' +
      ' A.attnum > 0 ' +
      ' AND NOT A.attisdropped ' +
      ` AND A.attrelid = '${tableName}' :: regclass -- table may be schema-qualified ORDER BY A.attnum;`,
    {
      type: db.QueryTypes.SELECT
    }
  )
  const set = new Set()
  return result
    .map((item: any) => {
      let content: any = {}

      // 内容
      content.key = item.name
      if (set.has(item.name)) {
        return null
      }
      set.add(item.name)
      // 注释
      content.comment = item.comment
      if (content.key === 'createdAt') {
        content.comment = '创建时间'
      }
      if (content.key === 'updatedAt') {
        content.comment = '更新时间'
      }
      if (content.key === 'deletedAt') {
        content.comment = '删除时间'
      }

      // 类型转换映射,如果说枚举值不够后续再修改
      switch (item.type) {
        case 'integer':
          content.type = 'number'
          break
        case 'text':
          content.type = 'text'
          break
        case 'json':
          content.type = 'json'
          break
        case 'integer[]':
          content.type = 'number[]'
          break
        case 'text[]':
          content.type = 'text[]'
          break
        default:
          if (/timestamp/.test(item.type)) {
            content.type = 'date'
          } else if (/character/.test(item.type)) {
            let length = item.type.match(/\d+/)[0]
            content.type = length ? `text(${length})` : 'text'
          } else if (/boolean/.test(item.type)) {
            content.type = 'boolean'
          } else if (/double/.test(item.type)) {
            content.type = 'double'
          } else if (/float/.test(item.type)) {
            content.type = 'float'
          }
      }

      // 可以为空
      content.require = item.notnull ? true : false
      content.primaryKey = item.primarykey ? true : false
      content.defaultValue =
        item.defaultvalue && `${item.defaultvalue}_`.indexOf('nextval') !== -1 ? '默认自增' : item.defaultvalue
      return content
    })
    .filter(Utils._.identity)
}

export const command = 'describe <dbKey> <tableName>'
export const desc = 'db table describe, tableName could be without prefix'
export const aliases = ['d', 'desc']

export const builder = function(yargs: any) {
  yargs.option('quiet', { default: false, describe: 'Only show field name', alias: 'q' })
}

export const handler = async function(argv: any) {
  try {
    const { db, config } = await Utils.invokeHook('components')
    let dbInstance
    try {
      dbInstance = await db.load(argv.dbKey)
    } catch (e) {
      Utils.error(e.message)
    }

    let dbConfig = Utils._.get(await config.get(argv.dbKey), argv.dbKey)
    if (dbConfig.options) {
      dbConfig = Object.assign({}, dbConfig, dbConfig.options)
    }

    const queryInterface = dbInstance.getQueryInterface()
    const tables = await queryInterface.showAllTables()

    let tableName = argv.tableName

    if (tables.indexOf(tableName) === -1 && dbConfig.prefix) {
      tableName = dbConfig.prefix + tableName
      if (tables.indexOf(tableName) === -1) {
        Utils.error('Table not found')
      }
    }

    const tableDescribed = await queryInterface.describeTable(tableName)
    let fieldsCommentContent: any
    if (dbConfig.dialect === 'postgresql' || dbConfig.dialect === 'postgres') {
      fieldsCommentContent = await getPostgresFieldsCommentContent(dbInstance, tableName)
    }

    let outputTable = [['field', 'type', 'allowNull', 'defaultValue', 'primaryKey', 'comment']]
    Object.keys(tableDescribed).forEach(function(field) {
      const info = tableDescribed[field]

      const foundField = fieldsCommentContent && Utils._.find(fieldsCommentContent, { key: field })
      const line = [field, info.type, info.allowNull, info.defaultValue, info.primaryKey]

      if (foundField) {
        line.push(foundField.comment ? foundField.comment : '')
      } else {
        line.push('')
      }

      outputTable.push(line)
    })

    if (argv.quiet) {
      outputTable.slice(1).forEach(function(field) {
        console.log(field[0])
      })
    } else {
      console.log(Utils.table(outputTable))
    }

    process.exit(0)
  } catch (e) {
    Utils.error(e.stack)
  }
}
