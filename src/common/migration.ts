import util from 'util'
import beautify from 'js-beautify'
import tosource from 'tosource'

import { Utils } from 'zignis'

const MIGRATION_TEMPLATE =
  // args: up & down
  `'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {
    %s
  },

  down: function (queryInterface, Sequelize) {
    %s
  }
};
`

const TYPESCRIPT_MIGRATION_TEMPLATE =
  // args: up & down
  `'use strict';

export = {
  up: function (queryInterface: any, Sequelize: any) {
    %s
  },

  down: function (queryInterface: any, Sequelize: any) {
    %s
  }
};
`

const CREATE_TABLE_TEMPLATE = `return queryInterface.createTable('%s', %s);` // args: tablename & attrs
const DROP_TABLE_TEMPLATE = `return queryInterface.dropTable('%s');` // args: tablename
const RENAME_TABLE_TEMPLATE = `return queryInterface.renameTable('%s', '%s')` // args: tablename before, tablename after
const PROCESS_MULTI_FIELDS = `return Promise.all(\n%s)` // args: fields ops
const CREATE_FIELD_TEMPLATE_NOT_RETURN = `queryInterface.addColumn('%s', '%s', %s)` // args: tablename, fieldname, type
const DROP_FIELD_TEMPLATE_NOT_RETURN = `queryInterface.removeColumn('%s', '%s');` // args: tablename, fieldname
const CREATE_FIELD_TEMPLATE = `return queryInterface.addColumn('%s', '%s', %s)` // args: tablename, fieldname, type
const DROP_FIELD_TEMPLATE = `return queryInterface.removeColumn('%s', '%s');` // args: tablename, fieldname
const MODIFY_FIELD_TEMPLATE = `return queryInterface.changeColumn('%s', '%s', %s)` // args: tablename, fieldname, type
const RENAME_FIELD_TEMPLATE = `return queryInterface.renameColumn('%s', '%s', '%s')` // args: tablename, fieldname before, field name after
const CREATE_FIELD_INDEX_TEMPLATE = `return queryInterface.addIndex('%s', ['%s'], {name: '%s', type: 'UNIQUE'})` // args: tablename, fieldname, index name
const REMOVE_FIELD_INDEX_TEMPLATE = `return queryInterface.removeIndex('%s', '%s')` // args: tablename, fieldname, type

const schemaInfo = {
  getForeignKeysQuery: function(tableName: string) {
    return `SELECT \
      o.conname AS constraint_name,
      (SELECT nspname FROM pg_namespace WHERE oid=m.relnamespace) AS source_schema,
      m.relname AS source_table,
      (SELECT a.attname FROM pg_attribute a WHERE a.attrelid = m.oid AND a.attnum = o.conkey[1] AND a.attisdropped = false) AS source_column,
      (SELECT nspname FROM pg_namespace WHERE oid=f.relnamespace) AS target_schema,
      f.relname AS target_table,
      (SELECT a.attname FROM pg_attribute a WHERE a.attrelid = f.oid AND a.attnum = o.confkey[1] AND a.attisdropped = false) AS target_column,
      o.contype,
      (SELECT d.adsrc AS extra FROM pg_catalog.pg_attribute a LEFT JOIN pg_catalog.pg_attrdef d ON (a.attrelid, a.attnum) = (d.adrelid,  d.adnum)
      WHERE NOT a.attisdropped AND a.attnum > 0 AND a.attrelid = o.conrelid AND a.attnum = o.conkey[1] LIMIT 1)
    FROM pg_constraint o
    LEFT JOIN pg_class c ON c.oid = o.conrelid
    LEFT JOIN pg_class f ON f.oid = o.confrelid
    LEFT JOIN pg_class m ON m.oid = o.conrelid
    WHERE o.conrelid = (SELECT oid FROM pg_class WHERE relname = '${tableName}'  LIMIT 1)`
  },

  isForeignKey: function(record: { [propName: string]: string }, column: string) {
    return (
      Utils._.isObject(record) &&
      Utils._.has(record, 'contype') &&
      record.contype === 'f' &&
      record.source_column === column
    )
  },

  isUnique: function(record: { [propName: string]: string }, column: string) {
    return (
      Utils._.isObject(record) &&
      Utils._.has(record, 'contype') &&
      record.contype === 'u' &&
      record.source_column === column
    )
  },

  isPrimaryKey: function(record: { [propName: string]: string }, column: string) {
    return (
      Utils._.isObject(record) &&
      Utils._.has(record, 'contype') &&
      record.contype === 'p' &&
      record.source_column === column
    )
  },

  isSerialKey: function(record: { [propName: string]: string }, column: string) {
    return (
      Utils._.isObject(record) &&
      schemaInfo.isPrimaryKey(record, column) &&
      (Utils._.has(record, 'extra') &&
        Utils._.startsWith(record.extra, 'nextval') &&
        Utils._.includes(record.extra, '_seq') &&
        Utils._.includes(record.extra, '::regclass'))
    )
  }
}

const genFieldType = function(_attr: string) {
  let val
  _attr = Utils._.lowerCase(_attr)
  if (_attr === 'boolean' || _attr === 'bit(1)' || _attr === 'bit') {
    val = 'Sequelize.BOOLEAN'
  } else if (_attr.match(/^(smallint|mediumint|tinyint|int|integer)/)) {
    let length = _attr.match(/\(\d+\)/)
    let length_0
    if (length) {
      length_0 = length[0]
    }
    val = 'Sequelize.INTEGER' + (!Utils._.isNull(length_0) ? `(${length_0})` : '')

    let unsigned = _attr.match(/unsigned/i)
    if (unsigned) val += '.UNSIGNED'

    let zero = _attr.match(/zerofill/i)
    if (zero) val += '.ZEROFILL'
  } else if (_attr.match(/^bigint/)) {
    val = 'Sequelize.BIGINT'
  } else if (_attr.match(/^letchar|varchar|character varying/)) {
    let length = _attr.match(/\d+/)
    let length_0
    if (length) {
      length_0 = length[0]
    }
    val = 'Sequelize.STRING' + (!Utils._.isNull(length_0) && Number(length_0) != 255 ? `(${length_0})` : '')
  } else if (_attr.match(/^str|string|letying|nletchar/)) {
    val = 'Sequelize.STRING'
  } else if (_attr.match(/^char/)) {
    let length = _attr.match(/\d+/)
    let length_0
    if (length) {
      length_0 = length[0]
    }
    val = 'Sequelize.CHAR' + (!Utils._.isNull(length_0) && Number(length_0) != 255 ? `(${length_0})` : '')
  } else if (_attr.match(/^real/)) {
    val = 'Sequelize.REAL'
  } else if (_attr.match(/text|ntext$/)) {
    val = 'Sequelize.TEXT'
  } else if (_attr.match(/^(date|timestamp)/)) {
    val = 'Sequelize.DATE'
  } else if (_attr.match(/^(time)/)) {
    val = 'Sequelize.TIME'
  } else if (_attr.match(/^(float|float4)/)) {
    val = 'Sequelize.FLOAT'
  } else if (_attr.match(/^decimal/)) {
    val = 'Sequelize.DECIMAL'
  } else if (_attr.match(/^(float8|double precision|numeric)/)) {
    val = 'Sequelize.DOUBLE'
  } else if (_attr.match(/^uuid|uniqueidentifier/)) {
    val = 'Sequelize.UUIDV4'
  } else if (_attr.match(/^jsonb/)) {
    val = 'Sequelize.JSONB'
  } else if (_attr.match(/^json/)) {
    val = 'Sequelize.JSON'
  } else if (_attr.match(/^geometry/)) {
    val = 'Sequelize.GEOMETRY'
  } else if (_attr.match(/^array/)) {
    val = 'Sequelize.ARRAY'
  }

  return val
}

const validateDataType = function(dataType: string, sequelize: any) {
  if (/^\w+\(\d+\)$/.test(dataType)) {
    dataType = dataType.replace(/\(\d+\)/, '')
  }

  const DataTypes = sequelize.Sequelize.DataTypes
  if (!DataTypes[dataType.toUpperCase()]) {
    Utils.error(`Unknown type '${dataType}'`)
  }

  return dataType
}

const formatAttributes = function(attribute: string) {
  let result
  const split = attribute.split(':')
  const validAttributeFunctionType = 'array'

  if (split.length === 2) {
    result = { fieldName: split[0], dataType: split[1], dataFunction: null }
  } else if (split.length === 3) {
    const isValidFunction = validAttributeFunctionType === split[1].toLowerCase()
    const isValidValue = validAttributeFunctionType !== split[2].toLowerCase()

    if (isValidFunction && isValidValue) {
      result = { fieldName: split[0], dataType: split[2], dataFunction: split[1] }
    }
  }
  return result
}

const transformAttributes = function(flag: string, sequelize: any) {
  /*
    possible flag formats:
    - first_name:string,last_name:string,bio:text,reviews:array:string
    - 'first_name:string last_name:string bio:text reviews:array:string'
    - 'first_name:string, last_name:string, bio:text, reviews:array:string'
  */

  const attributeStrings = flag.replace(/,/g, ' ').split(/\s+/)

  return attributeStrings.map(attribute => {
    const formattedAttribute = formatAttributes(attribute)

    if (formattedAttribute) {
      try {
        // Add custom type names
        switch (formattedAttribute.dataType.toLowerCase()) {
          case 'int':
            formattedAttribute.dataType = 'integer'
          break
          case 'str':
            formattedAttribute.dataType = 'string'
          break
        }
        validateDataType(formattedAttribute.dataType, sequelize)
      } catch (err) {
        Utils.error(`Attribute '${attribute}' cannot be parsed: ${err.message}`)
      }
    }

    return formattedAttribute
  })
}

const genAttrForOneTable = async function(
  table: string,
  sequelize: any,
  dbConfig: { [propName: string]: any },
  options: { [propName: string]: any }
) {
  const queryInterface = sequelize.getQueryInterface()
  const tables = await queryInterface.showAllTables()

  const optionAttrs: { [propName: string]: any } = {}
  if (options.attributes) {
    const attrsTransformed = transformAttributes(options.attributes, sequelize)
    optionAttrs.id = {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: 'Sequelize.INTEGER'
    }

    attrsTransformed.forEach(attribute => {
      if (attribute) {
        optionAttrs[attribute.fieldName] = {
          type: attribute.dataFunction
            ? `Sequelize.${attribute.dataFunction.toUpperCase()}(Sequelize.${attribute.dataType.toUpperCase()})`
            : `Sequelize.${attribute.dataType.toUpperCase()}`
        }
      }
    })

    if (!options.disableTimestamps) {
      optionAttrs.createdAt = {
        allowNull: false,
        type: 'Sequelize.DATE'
      }
    }

    if (!options.disableTimestamps) {
      optionAttrs.updatedAt = {
        allowNull: false,
        type: 'Sequelize.DATE'
      }
    }
  }

  let attrs: { [propName: string]: any } = {}
  if (tables.indexOf(table) !== -1) {
    // get attrs from database
    let sql = schemaInfo.getForeignKeysQuery(table)
    let info

    if (dbConfig.options) {
      dbConfig = Object.assign({}, dbConfig, dbConfig.options)
    }

    if (dbConfig.dialect === 'postgresql' || dbConfig.dialect === 'postgres') {
      info = await sequelize.query(sql, {
        type: sequelize.QueryTypes.SELECT,
        raw: true
      })
    }

    attrs = await queryInterface.describeTable(table)
    for (let item in attrs) {
      const attr = attrs[item]
      if (info && schemaInfo.isSerialKey(info[0], item)) {
        attr.autoIncrement = true
        attr.defaultValue = null
      }

      if (Utils._.has(attr, 'primaryKey') && !attr.primaryKey) {
        delete attr.primaryKey
      }
      if (Array.isArray(attr.special) && attr.special.length === 0) {
        delete attr.special
      }
      if (attr.defaultValue === null) {
        delete attr.defaultValue
      }

      if (attr.allowNull) {
        delete attr.allowNull
      }

      attr.type = genFieldType(attr.type)
    }
  }

  return { attrs, optionAttrs }
}

export const genMigrationForTable = async function(table: string, sequelize: any, dbConfig: any, options: any) {
  let up, down
  if (options.rename) {
    const newName = dbConfig.prefix + options.rename
    up = util.format(RENAME_TABLE_TEMPLATE, table, newName)
    down = util.format(RENAME_TABLE_TEMPLATE, newName, table)
  } else {
    const { attrs, optionAttrs } = await genAttrForOneTable(table, sequelize, dbConfig, options)

    if (options.attributes) {
      up = util.format(CREATE_TABLE_TEMPLATE, table, tosource(optionAttrs).replace(/"(Sequelize(.*?))"/g, '$1'))
      down = util.format(DROP_TABLE_TEMPLATE, table)
    } else {
      if (attrs && Object.keys(attrs).length > 0) {
        up = util.format(CREATE_TABLE_TEMPLATE, table, tosource(attrs).replace(/"(Sequelize(.*?))"/g, '$1'))
        down = util.format(DROP_TABLE_TEMPLATE, table)
      } else {
        up = down = ''
      }
    }
  }
  if (options.reverse) {
    down = [up, (up = down)][0] // swap
  }

  if (options.onlyUp) {
    down = ''
  }
  const template = options.typescript ? TYPESCRIPT_MIGRATION_TEMPLATE : MIGRATION_TEMPLATE
  const migration = beautify(util.format(template, up, down), { indent_size: 2 })
  return migration
}

export const genMigrationForField = async function(
  table: string,
  field: string,
  sequelize: any,
  dbConfig: any,
  options: any
) {
  let up, down
  if (options.rename) {
    up = util.format(RENAME_FIELD_TEMPLATE, table, field, options.rename)
    down = util.format(RENAME_FIELD_TEMPLATE, table, options.rename, field)
  } else {
    const { attrs, optionAttrs } = await genAttrForOneTable(table, sequelize, dbConfig, options)

    if (options.modify) {
      if (!optionAttrs || !optionAttrs[field]) {
        Utils.error(`No such field: ${table}.${field} in options.attributes`)
      }

      if (!attrs || !attrs[field]) {
        Utils.error(`No such field: ${table}.${field} in database`)
      }

      const attrStr = tosource(attrs[field]).replace(/"(Sequelize(.*?))"/g, '$1')
      const optionAttrStr = tosource(optionAttrs[field]).replace(/"(Sequelize(.*?))"/g, '$1')
      up = util.format(MODIFY_FIELD_TEMPLATE, table, field, optionAttrStr)
      down = util.format(MODIFY_FIELD_TEMPLATE, table, field, attrStr)
    } else {
      if (options.index) {
        up = util.format(CREATE_FIELD_INDEX_TEMPLATE, table, field, `${table}_${field}`)
        down = util.format(REMOVE_FIELD_INDEX_TEMPLATE, table, `${table}_${field}`)
      } else {
        let attrStr
        if (options.attributes) {
          let parseField = Utils.splitComma(field)
          if (parseField.length === 1) {
            if (!optionAttrs || !optionAttrs[field]) {
              Utils.error(`No such field: ${table}.${field} in options.attributes`)
            }
            attrStr = tosource(optionAttrs[field]).replace(/"(Sequelize(.*?))"/g, '$1')
  
            up = util.format(CREATE_FIELD_TEMPLATE, table, field, attrStr)
            down = util.format(DROP_FIELD_TEMPLATE, table, field)
          } else {
            up = util.format(PROCESS_MULTI_FIELDS, parseField.map(f => {
              if (!optionAttrs || !optionAttrs[f]) {
                return null
              } else {
                return util.format(CREATE_FIELD_TEMPLATE_NOT_RETURN, table, f, tosource(optionAttrs[f]).replace(/"(Sequelize(.*?))"/g, '$1'))
              }
            }).filter(l => l !== null).join(', \n'))
            down = util.format(PROCESS_MULTI_FIELDS, parseField.map(f => {
              if (!optionAttrs || !optionAttrs[f]) {
                return null
              } else {
                return util.format(DROP_FIELD_TEMPLATE_NOT_RETURN, table, f)
              }
            }).filter(l => l !== null).join(', \n'))
          }
        } else {
          if (attrs[field]) {
            attrStr = tosource(attrs[field]).replace(/"(Sequelize(.*?))"/g, '$1')
            up = util.format(CREATE_FIELD_TEMPLATE, table, field, attrStr)
            down = util.format(DROP_FIELD_TEMPLATE, table, field)
          } else {
            up = down = ''
          }
        }
      }
    }
  }

  if (options.reverse) {
    down = [up, (up = down)][0] // swap
  }

  if (options.onlyUp) {
    down = ''
  }

  const template = options.typescript ? TYPESCRIPT_MIGRATION_TEMPLATE : MIGRATION_TEMPLATE
  const migration = beautify(util.format(template, up, down), { indent_size: 2 })
  return migration
}

export const genFileSuffix = function(options: any) {
  if (options.fileSuffix) {
    return options.fileSuffix
  }
  let locals: any = { tableName: options.tableName }
  let action = 'create'
  let entity = 'table ${tableName}'
  let to = ''
  if (options.fieldName) {
    action = 'add'
    entity = 'field ${fieldName} for ' + entity
    locals.fieldName = options.fieldName
  }

  if (options.rename) {
    action = 'rename'
    to = 'to ${rename}'
    locals.rename = options.rename
  }

  if (options.modify) {
    action = 'modify'
  }

  if (options.index) {
    action = 'add index'
  }

  return Utils._.template(`${action} ${entity} ${to}`)(locals)
}
