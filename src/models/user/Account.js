module.exports = function({ Profile }) {
  this.hasOne(Profile, {as: 'Profile', constraints: false, foreignKey: 'accountId'})
}