const co = require('co')
const path = require('path')
const inquirer = require('inquirer')
const Sequelize = require('sequelize')
const Op = Sequelize.Op
const { Utils } = require('zignis')
const { components } = require('../../../')

exports.command = 'login <userId>'
exports.desc = 'way to login zhike'

exports.builder = function (yargs) {
}

const processSelectedUser = function (user) {
  const ssUserCookie = {
    id: user.id,
    token: user.tokenPc || user.tokenMobile,
    name: user['Profile.nickname']
  }

  const text = Utils.chalk.bold.cyan('使用方法：先打开智课网，然后打开开发者工具，最后将下面的 JS 代码 copy 到浏览器 Console 中执行和刷新即可登录。')
  console.log(text)
  console.log('')
  console.log(`document.cookie='ss_user=${encodeURIComponent(JSON.stringify(ssUserCookie))};domain=.smartstudy.com;path=/;'`)
  console.log('')
  process.exit(0)
}

exports.handler = function (argv) {
  co(function* () {
    const { db } = yield components()
    const userDatabase = yield db.load('db.user', 'user', db.associate(path.resolve(__dirname, '../../models/user')))
    const { Account, Profile } = userDatabase.models
    const users = yield Account.findAll({
      raw: true,
      include: [{
        model: Profile,
        as: 'Profile',
        required: true
      }],
      where: {
        [Op.or]: [
          { id: argv.userId },
          { phone: argv.userId },
          { cellphone: `${argv.userId}` }
        ],
        groupId: 1,
        status: 1
      },
      limit: 10
    })

    if (!users) {
      console.log('User not found');
      return;
    }

    if (users.length === 1) {
      processSelectedUser(users[0])
    } else {
      inquirer
        .prompt([
          {
            type: 'list',
            name: 'selected',
            message: `Please choose a user to continue:`,
            choices: users.map(u => {
              return { name: `(id: ${u.id}) - ${u.phone} - ${u['Profile.nickname']}`, value: u }
            }),
            validate: function(answers) {
              if (answers.length < 1) {
                return 'Please choose at least one.'
              }
              return true
            }
          }
        ])
        .then(function(answers) {
          processSelectedUser(answers.selected)
        })
        .catch(function(e) {
          console.log(e.stack)
        })
    }

  })
}
