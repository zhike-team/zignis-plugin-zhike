module.exports = function ({ Word }) {
  this.belongsTo(Word, { foreignKey: 'wordId' })
}
