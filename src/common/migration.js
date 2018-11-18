const path = require('path')
const fs = require('fs')
const util = require('util')
const _ = require('lodash')
const beautify = require('js-beautify')
const tosource = require('tosource')

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

const CREATE_TABLE_TEMPLATE = `return queryInterface.createTable('%s', %s);` // args: tablename & attrs
const DROP_TABLE_TEMPLATE = `return queryInterface.dropTable('%s');` // args: tablename
const RENAME_TABLE_TEMPLATE = `return queryInterface.renameTable('%s', '%s')` // args: tablename before, tablename after
const CREATE_FIELD_TEMPLATE = `return queryInterface.addColumn('%s', '%s', %s)` // args: tablename, fieldname, type
const MODIFY_FIELD_TEMPLATE = `return queryInterface.changeColumn('%s', '%s', %s)` // args: tablename, fieldname, type
const RENAME_FIELD_TEMPLATE = `return queryInterface.renameColumn('%s', '%s', '%s')` // args: tablename, fieldname before, field name after
const DROP_FIELD_TEMPLATE = `return queryInterface.removeColumn('%s', '%s');` // args: tablename, fieldname

const schemaInfo = {
  getForeignKeysQuery: function(tableName) {
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

  isForeignKey: function(record, column) {
    return _.isObject(record) && _.has(record, 'contype') && record.contype === 'f' && record.source_column === column
  },

  isUnique: function(record, column) {
    return _.isObject(record) && _.has(record, 'contype') && record.contype === 'u' && record.source_column === column
  },

  isPrimaryKey: function(record, column) {
    return _.isObject(record) && _.has(record, 'contype') && record.contype === 'p' && record.source_column === column
  },

  isSerialKey: function(record, column) {
    return (
      _.isObject(record) &&
      schemaInfo.isPrimaryKey(record, column) &&
      (_.has(record, 'extra') &&
        _.startsWith(record.extra, 'nextval') &&
        _.includes(record.extra, '_seq') &&
        _.includes(record.extra, '::regclass'))
    )
  }
}

const genFieldType = function(_attr) {
  let val
  _attr = _.lowerCase(_attr)
  if (_attr === 'boolean' || _attr === 'bit(1)' || _attr === 'bit') {
    val = 'Sequelize.BOOLEAN'
  } else if (_attr.match(/^(smallint|mediumint|tinyint|int)/)) {
    let length = _attr.match(/\(\d+\)/)
    if (length) {
      length = length[0]
    }
    val = 'Sequelize.INTEGER' + (!_.isNull(length) ? `(${length})` : '')

    let unsigned = _attr.match(/unsigned/i)
    if (unsigned) val += '.UNSIGNED'

    let zero = _attr.match(/zerofill/i)
    if (zero) val += '.ZEROFILL'
  } else if (_attr.match(/^bigint/)) {
    val = 'Sequelize.BIGINT'
  } else if (_attr.match(/^letchar|varchar|character varying/)) {
    let length = _attr.match(/\d+/)
    if (length) {
      length = length[0]
    }
    val = 'Sequelize.STRING' + (!_.isNull(length) && length != 255 ? `(${length})` : '')
  } else if (_attr.match(/^string|letying|nletchar/)) {
    val = 'Sequelize.STRING'
  } else if (_attr.match(/^char/)) {
    let length = _attr.match(/\d+/)
    if (length) {
      length = length[0]
    }
    val = 'Sequelize.CHAR' + (!_.isNull(length) && length != 255 ? `(${length})` : '')
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

const genAttrForOneTable = function*(table, sequelize, dbConfig) {
  const sequelizeInterface = sequelize.getQueryInterface()
  let attrs = yield sequelizeInterface.describeTable(table)

  let sql = schemaInfo.getForeignKeysQuery(table)
  let info

  if (dbConfig.options) {
    dbConfig = Object.assign({}, dbConfig, dbConfig.options)
  }

  if (dbConfig.dialect === 'postgresql' || dbConfig.dialect === 'postgres') {
    info = yield sequelize.query(sql, {
      type: sequelize.QueryTypes.SELECT,
      raw: true
    })
  }

  for (let item in attrs) {
    const attr = attrs[item]
    if (info && schemaInfo.isSerialKey(info[0], item)) {
      attr.autoIncrement = true
      attr.defaultValue = null
    }

    if (_.has(attr, 'primaryKey') && !attr.primaryKey) {
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
  return attrs
}

exports.genAttrForAllTables = function*(sequelize) {
  const sequelizeInterface = sequelize.getQueryInterface()
  const dir = path.join(__dirname, '..', 'src', 'models', 'attributes')
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir)
  }
  const tables = yield sequelizeInterface.showAllTables()
  console.log('update table attributes...\n')
  for (let i = 0; i < tables.length; i++) {
    const file = path.join(dir, tables[i])
    if (!fs.existsSync(file)) {
      const attrs = yield* genAttrForOneTable(tables[i], sequelize)
      fs.writeFileSync(file, JSON.stringify(attrs, null, 2).replace(/\n/g, '\n    '))
    }
  }
  console.log('update table attributes done.')
}

exports.genMigrationForTable = function*(table, sequelize, dbConfig, options) {
  let up, down
  if (options.rename) {
    const newName = dbConfig.prefix + options.rename
    up = util.format(RENAME_TABLE_TEMPLATE, table, newName)
    down = util.format(RENAME_TABLE_TEMPLATE, newName, table)
  } else {
    const attrs = yield genAttrForOneTable(table, sequelize, dbConfig)

    up = util.format(CREATE_TABLE_TEMPLATE, table, tosource(attrs).replace(/"(Sequelize(.*?))"/g, '$1'))
    down = util.format(DROP_TABLE_TEMPLATE, table)
  }
  if (options.reverse) {
    down = [up, (up = down)][0] // swap
  }

  if (options.onlyUp) {
    down = ''
  }
  const migration = beautify(util.format(MIGRATION_TEMPLATE, up, down), { indent_size: 2 })
  return migration
}

exports.genMigrationForField = function*(table, field, sequelize, dbConfig, options) {
  let up, down
  if (options.rename) {
    up = util.format(RENAME_FIELD_TEMPLATE, table, field, options.rename)
    down = util.format(RENAME_FIELD_TEMPLATE, table, options.rename, field)
  } else {
    const attrs = yield* genAttrForOneTable(table, sequelize, dbConfig)
    if (!attrs || !attrs[field]) {
      console.error(`No such field: ${table}.${field}`)
      return null
    }
    const attr = attrs[field]
    const attrStr = tosource(attr).replace(/"(Sequelize(.*?))"/g, '$1')
    if (options.modify) {
      up = `// @TODO`
      down = util.format(MODIFY_FIELD_TEMPLATE, table, field, attrStr)
    } else {
      up = util.format(CREATE_FIELD_TEMPLATE, table, field, attrStr)
      down = util.format(DROP_FIELD_TEMPLATE, table, field)
    }
  }

  if (options.reverse) {
    down = [up, (up = down)][0] // swap
  }

  if (options.onlyUp) {
    down = ''
  }

  const migration = beautify(util.format(MIGRATION_TEMPLATE, up, down), { indent_size: 2 })
  return migration
}
