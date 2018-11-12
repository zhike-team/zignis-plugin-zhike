const { components } = require('../../../')
const { Utils } = require('zignis')

const co = require('co')

exports.command = 'order <orderId>'
exports.desc = 'get order info'

exports.builder = function(yargs) {}

exports.handler = function(argv) {
  co(function*() {
    const { db } = yield components()
    const orderDb = yield db.load('db.order', 'order')
    const { Order, OrderProduct, OrderPromotion } = orderDb.models

    const payDb = yield db.load('db.pay', 'pay')
    const { OrderPayment } = payDb.models

    const order = yield Order.findOne({
      raw: true,
      where: {
        id: `${argv.orderId}`
      }
    })

    const orderProducts = yield OrderProduct.findAll({
      raw: true,
      where: {
        orderId: `${argv.orderId}`
      }
    })

    const orderPromotions = yield OrderPromotion.findAll({
      raw: true,
      where: {
        orderId: `${argv.orderId}`
      }
    })

    const orderPayments = yield OrderPayment.findAll({
      raw: true,
      where: {
        orderId: `${argv.orderId}`
      },
      order: [['createdAt', 'ASC']]
    })

    console.log(Utils.chalk.cyan('Order:'))
    Utils.log(order)

    console.log(Utils.chalk.cyan('Products:'))
    Utils.log(orderProducts)

    console.log(Utils.chalk.cyan('Promotions:'))
    Utils.log(orderPromotions)

    console.log(Utils.chalk.cyan('Payments:'))
    Utils.log(orderPayments)

    process.exit(0)
  })
}
