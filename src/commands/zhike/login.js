const co = require('co')
const path = require('path')

const { Utils } = require('zignis')
const DatabaseLoader = require('../../common/db')
const db = new DatabaseLoader({ loadReturnInstance: true })

exports.command = 'login <userId>'
exports.desc = 'way to login zhike'

exports.builder = function (yargs) {
}

exports.handler = function (argv) {
  co(function* () {
    const userDatabase = yield db.load('db.user', 'user', db.associate(path.resolve(__dirname, '../../models/user')))
    const { Account, Profile } = userDatabase.models
    const user = yield Account.findOne({
      raw: true,
      include: [{
        model: Profile,
        as: 'Profile',
        required: true
      }],
      where: {
        id: argv.userId
      }
    })

    if (!user) {
      console.log('User not found');
      return;
    }

    const ssUserCookie = {
      id: user.id,
      token: user.tokenPc || user.tokenMobile,
      name: user['Profile.nickname']
    }

    const text = Utils.chalk.underline.bold.cyan('使用方法：先打开智课网，然后打开开发者工具，最后将下面的 JS 代码 copy 到浏览器 Console 中执行和刷新即可登录。')
    console.log(text)
    console.log('')
    console.log(`document.cookie='ss_user=${encodeURIComponent(JSON.stringify(ssUserCookie))};domain=.smartstudy.com;path=/;'`)
    console.log('')
    
    process.exit(0)

  })
}
