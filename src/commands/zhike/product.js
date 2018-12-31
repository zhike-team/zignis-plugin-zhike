const { components } = require('../../../')
const { Utils } = require('zignis')
const co = require('co')

exports.command = 'product <productId>'
exports.desc = 'get zhike product info'

exports.builder = function(yargs) {
  yargs.option('type', {
    default: 'Product',
    describe: 'set product type, could be:Product|CrmProductUskidProduct, default is Product'
  })

  yargs.option('select', {
    default: false,
    describe: 'choose product type, could be:Product|CrmProductUskidProduct, default is false, override type option'
  })
}

exports.handler = function(argv) {
  co(function*() {
    const { db } = yield components()
    const atheneDb = yield db.load('db.athene', 'athene')
    const choices = ['Product', 'CrmProduct', 'UskidProduct']

    if (choices.indexOf(argv.type) === -1) {
      console.log(Utils.chalk.red('product type not found'))
      return
    }

    let ProductType = argv.type
    if (argv.select) {
      const answers = yield Utils.inquirer.prompt([
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
      ProductType = answers.selected
    }

    const ProductTable = atheneDb.models[ProductType]
    const product = yield ProductTable.findOne({
      raw: true,
      where: {
        id: argv.productId
      }
    })

    switch (ProductType) {
      case 'Product':
        product.courses = product.courses && JSON.parse(product.courses)
        product.overview = product.overview && JSON.parse(product.overview)
        product.trailer = product.trailer && JSON.parse(product.trailer)
        break
      case 'CrmProduct':
        product.subTypeAddition = JSON.parse(product.subTypeAddition)
        break
    }

    Utils.log(product)
    process.exit(0)
  }).catch(e => {
    Utils.error(e.stack)
  })
}
