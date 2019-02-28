
const path = require('path')
const { Utils } =  require('zignis')
const Sequelize = require('sequelize')
const Op = Sequelize.Op

const getMemberType = function (userAdaptationService) {
  userAdaptationService.startDate = userAdaptationService.startAt
  userAdaptationService.expireDate = userAdaptationService.endAt
  userAdaptationService.expired = !userAdaptationService.expireDate || (new Date(userAdaptationService.expireDate) < new Date()) || userAdaptationService.validity <= 0
  // result type 0 体验 1 付费
  if ((userAdaptationService.expireDate === null || userAdaptationService.expireDate === 0 || userAdaptationService.validity === 0) && userAdaptationService.type === 0) { // eslint-disable-line no-magic-numbers
    return 'TRIAL'
  } else if (userAdaptationService.expired === false && userAdaptationService.type === 0) { // eslint-disable-line no-magic-numbers
    return 'GIVEN'
  } else if (userAdaptationService.expired === false && (userAdaptationService.type === 1 || userAdaptationService.type === 2)) {
    // type为2是公司内部人员（产品、运营等）购买或走接口购买给的备注信息
    // TODO: 如果后续需要具体区分付费未付费，需谨慎考虑此字段
    return 'PAID'
  } else {
    return 'EXPIRED'
  }


}

const processSelectedUser = function * (user, argv) {
  const { api, config, db } = yield Utils.invokeHook('components')
  const API = api('zignis-plugin-zhike:user')

  // 获取基本信息
  const userCard = []

  userCard.push(['Id', user.id || 'Unknown'])
  userCard.push(['Phone', user.phone || 'Unknown'])
  userCard.push(['CountryCode', user.countryCode || 'Unknown'])
  userCard.push(['Email', user.email || 'Unknown'])
  userCard.push(['Salt', user.salt || 'Unknown'])
  userCard.push(['Status', user.status ? '正常' : '冻结'])
  userCard.push(['CreatedAt', user.createdAt || 'Unknown'])
  userCard.push(['Group', user.groupId || 'Unknown'])
  userCard.push(['TempPassword', user.tempPassword || 'Unknown'])
  userCard.push(['ExpiredAt', user.expiredAt || 'Unknown'])
  userCard.push(['TokenPc', user.tokenPc || 'Unknown'])
  userCard.push(['TokenMobile', user.tokenMobile || 'Unknown'])

  Utils.info('基本信息：')
  Utils.log(Utils.table(userCard))

  if (argv.group === 1) {
    // 获取智适应
    const examIds = [1, 2, 3, 5]

    const bumblebeeDb = yield db.load('db.bumblebee', 'bumblebeeDb')
    const { Examination } = bumblebeeDb.models
    const examinations = yield Examination.findAll({
      raw: true,
      attributes: ['id', 'name'],
      where: {
        id: examIds,
        visible: 1
      }
    })
    const configRes = yield config.get(['zhikeApi.url', 'smartstudyBackendPrivate.token', 'athenePrivate.athene'])
    const zhikeApiUrl = Utils._.get(configRes, 'zhikeApi.url')
    const atheneApiUrl = Utils._.get(configRes, 'athenePrivate.athene')
    const zhikeApiAdminKey = Utils._.get(configRes, 'smartstudyBackendPrivate.token')

    const headers = ['考试', '开始时间', '结束时间', '有效期天数', '类型', '版本']
    const rows = [headers]
    for (let examId of examIds) {
      const adaptationCheck = yield API.get(`http:${zhikeApiUrl}/user/adaptation/service?examinationId=${examId}&adminKey=${zhikeApiAdminKey}&userIds=${user.id}`)
      if (adaptationCheck.length === 0) continue
      userAdaptationService = adaptationCheck.find(i => i.examinationId === examId)
      rows.push([
        examinations.find(i => i.id === examId).name,
        userAdaptationService.startAt,
        userAdaptationService.endAt,
        userAdaptationService.validity,
        {0: '试用', 1: '付费', 2: '测试'}[userAdaptationService.type],
        getMemberType(userAdaptationService)
      ])
    }

    if (rows.length > 1) {
      Utils.info('智适应：')
      Utils.log(Utils.table(rows))
    }

    // 获取最近订单

    const userOrders = yield API.get(`${atheneApiUrl}/api/order/list?page=1&pageSize=5&status=1&filterField=userId&filterValue=${user.id}&noLoginTower=not_login_kktabcje1688fdiq`)

    if (userOrders.rows.length > 0) {
      Utils.info('最近订单：')
      const headers = ['订单号', '订单类型', '订单平台', '订单来源', '商品名称', '订单金额', '实际支付', '支付方式', '下单时间', '支付状态']
      const rows = [headers]
      userOrders.rows.map(record => {
        rows.push([
          record.id,
          record.type == 1 ? '商品订单' : '充值订单',
          record.plat == 1 ? '网站' : (record.plat == 2 ? 'app' : '线下'),
          record.source,
          record.products.map(p => `(${p.productId})-${p.productName}`).join(', '),
          record.totalAmount,
          record.paymentMoney,
          record.payments.map(p => p.methodName).join(', '),
          record.createdAt,
          record.status == 1 ? '支付成功' : 
            record.status == 2 ? '待支付' : 
            record.status == 3 ? '已取消' : 
            record.status == 4 ? '已提交' : 
            record.status == 5 ? '线下 订单核准' : 
            record.status == 6 ? '分次支付' : 
            record.status == 7 ? '已退款' : 
            record.status == 8 ? '已作废' : '部分退款'
          
        ])
      })
      Utils.log(Utils.table(rows))
    }
  }
}

exports.command = 'user <userId>'
exports.desc = 'zhike user info'
// exports.aliases = ''

exports.builder = function (yargs) {
  yargs.option('group', { default: 1, describe: 'which zhike account group to query.' })
  yargs.option('status', { default: 1, describe: 'which zhike account status to query.' })
  // yargs.commandDir('user')
}

exports.handler = function (argv) {
  Utils.co(function * () {
    const { db } = yield Utils.invokeHook('components')
    const userDb = yield db.load('db.user', 'userDb', db.associate(path.resolve(__dirname, '../../models/user')))
    const { Account, Profile } = userDb.models

    const orConds = []
    if (Utils._.isNaN(Number(argv.userId))) {
      orConds.push({ email: `${argv.userId}` })
    } else {
      orConds.push({ id: Number(argv.userId) })
      orConds.push({ phone: Number(argv.userId) })
      orConds.push({ cellphone: `${argv.userId}` })
    }

    const where = { [Op.or]: orConds }
    where.groupId = argv.group

    if (argv.status !== 'all') {
      where.status = Number(argv.status)
    }

    const users = yield Account.findAll({
      // logging: console.log,
      raw: true,
      include: [
        {
          model: Profile,
          as: 'Profile',
          required: true
        }
      ],
      where: {
        [Op.or]: orConds,
        groupId: 1,
        status: 1
      },
      limit: 10
    })

    if (!users || users.length === 0) {
      Utils.error('User not found')
    }

    if (users.length === 1) {
      yield processSelectedUser(users[0], argv)
    } else {
      const answers = yield Utils.inquirer
        .prompt([
          {
            type: 'list',
            name: 'selected',
            message: `Please choose a user to continue:`,
            choices: users.map(u => {
              return { name: `(${u.id}) - ${u.phone}:${u.email} - ${u['Profile.nickname']}`, value: u }
            }),
            validate: function(answers) {
              if (answers.length < 1) {
                return 'Please choose at least one.'
              }
              return true
            }
          }
        ])

      yield processSelectedUser(answers.selected, argv)
    }

    Utils.info('Done!', true)

  }).catch(e => Utils.error(e.stack))
}
