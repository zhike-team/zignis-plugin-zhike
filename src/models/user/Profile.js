module.exports = function({ Account }) {
  this.belongsTo(Account, {as: 'Account', constraints: false, foreignKey: 'accountId'})
}