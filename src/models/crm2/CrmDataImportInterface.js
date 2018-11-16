module.exports = function({
  Crm2MarketActivity,
  BindHmsr,
  BindHmpl,
  BindHmmd,
  BindHmkw,
  BindSite
}) {
  this.belongsTo(Crm2MarketActivity, {
    constraints: false,
    foreignKey: 'marketActivityId'
  })

  this.belongsTo(BindHmsr, {
    constraints: false,
    foreignKey: 'hmsrId'
  })

  this.belongsTo(BindHmpl, {
    constraints: false,
    foreignKey: 'hmplId'
  })

  this.belongsTo(BindHmmd, {
    constraints: false,
    foreignKey: 'hmmdId'
  })

  this.belongsTo(BindHmkw, {
    constraints: false,
    foreignKey: 'hmkwId'
  })

  this.belongsTo(BindSite, {
    constraints: false,
    foreignKey: 'siteId'
  })
}
