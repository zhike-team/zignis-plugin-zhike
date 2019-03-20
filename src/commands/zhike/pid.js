const co = require('co')
const path = require('path')
const { Utils } = require('zignis')

exports.command = 'pid <pid>'
exports.desc = 'zhike pid info'
// exports.aliases = ''

exports.builder = function(yargs) {
  // yargs.option('option', {default, describe, alias})
}

exports.handler = function(argv) {
  if ([8, 10].indexOf(argv.pid.length) === -1) {
    Utils.error('Invalid pid')
  }
  co(function*() {
    const { db } = yield Utils.invokeHook('components')
    const crmDb = yield db.load('db.crm2', 'crm', db.associate(path.resolve(__dirname, '../../models/crm2')))
    const {
      Crm2PidMap,
      CrmDataImportInterface,
      Crm2MarketActivity,
      BindHmsr,
      BindHmpl,
      BindHmmd,
      BindHmkw,
      BindSite
    } = crmDb.models

    if (argv.pid.length === 8) {
      const pid = yield Crm2PidMap.findOne({
        raw: true,
        attributes: ['pid', 'utmSource', 'utmCampaign', 'utmMedium', 'utmTerm', 'utmContent'],
        where: {
          pid: argv.pid
        },
        include: [
          {
            model: Crm2MarketActivity,
            attributes: ['name']
          }
        ]
      })

      if (!pid) {
        Utils.error('Invalid pid')
      }

      const keys = Object.keys(pid)
      const outputTable = [keys]
      outputTable.push(
        keys.map(function(field) {
          return pid[field]
        })
      )

      console.log(Utils.table(outputTable))
      process.exit(0)
    } else if (argv.pid.length === 10) {
      const pid = yield CrmDataImportInterface.findOne({
        raw: true,
        attributes: ['pid'],
        where: {
          pid: argv.pid
        },
        include: [
          {
            model: Crm2MarketActivity,
            attributes: ['name']
          },
          {
            model: BindHmsr,
            attributes: ['name']
          },
          {
            model: BindHmpl,
            attributes: ['name']
          },
          {
            model: BindHmmd,
            attributes: ['name']
          },
          {
            model: BindHmkw,
            attributes: ['name']
          },
          {
            model: BindSite,
            attributes: ['name']
          }
        ]
      })

      const keys = Object.keys(pid)
      const outputTable = [keys]
      outputTable.push(
        keys.map(function(field) {
          return pid[field]
        })
      )

      console.log(Utils.table(outputTable))
      process.exit(0)
    }
  }).catch(e => {
    Utils.error(e.stack)
  })
}
