const { components } = require('../../../')
const { Utils } = require('zignis')
const inquirer = require('inquirer')
const co = require('co')

exports.command = 'product <productId>'
exports.desc = 'get product info'

exports.builder = function(yargs) {}

exports.handler = function(argv) {
  co(function*() {
    const { db } = yield components()
    const atheneDb = yield db.load('db.athene', 'athene')

    const choices = ['Product', 'CrmProduct', 'UskidProduct']
    const answers = yield inquirer.prompt([
      {
        type: 'list',
        name: 'selected',
        message: `Please choose a product type to continue:`,
        choices: choices.map(c => {
          return { name: c, value: c }
        }),
        validate: function(answers) {
          if (answers.length < 1) {
            return 'Please choose at least one.'
          }
          return true
        }
      }
    ])

    const ProductTable = atheneDb.models[answers.selected]
    const product = yield ProductTable.findOne({
      raw: true,
      where: {
        id: argv.productId
      }
    })

    if (answers.selected === 'Product') {
      product.courses = JSON.parse(product.courses)
      product.overview = JSON.parse(product.overview)
    }
    Utils.log(product)
    process.exit(0)
  })
}
