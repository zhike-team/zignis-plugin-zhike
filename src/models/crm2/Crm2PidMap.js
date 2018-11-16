module.exports = function({ Crm2MarketActivity }) {
  this.belongsTo(Crm2MarketActivity, {
    constraints: false,
    foreignKey: 'marketActivityId'
  })
}
