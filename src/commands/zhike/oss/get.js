

const { Utils } = require('zignis')
const oss = require('../../../common/oss')
const path = require('path')
const fs = require('fs')

exports.command = 'get <fileName> <filePath>'
exports.desc = 'get oss file'
exports.aliases = 'download'

exports.builder = function (yargs) {
}

exports.handler = function (argv) {
  argv.prefix = argv.prefix ? argv.prefix.replace(/^\/+/, '') : ''
  argv.filePath = argv.filePath === '.' ? './' : argv.filePath

  // 确保目标目录存在
  let filePath = path.resolve(argv.filePath)
  let dir = filePath
  if (argv.filePath[argv.filePath.length - 1] !== '/') {
    dir = path.dirname(filePath)
  }
  Utils.fs.ensureDirSync(dir)
  
  // 构造文件名
  if (argv.filePath[argv.filePath.length - 1] === '/') {
    filePath = `${filePath}/${path.basename(argv.fileName)}`
  }

  return Utils.co(function* () {
    const client = yield oss()
    const result = yield client.get(argv.fileName, filePath)
    if (result.res.status === 200) {
      Utils.log(Utils.chalk.green(`${argv.fileName} downloaded to ${argv.filePath} successfully!`))
    }
    process.exit(0)
  }).catch((e) => Utils.error(e.stack))
}

