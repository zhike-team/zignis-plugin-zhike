
const co = require('co')
const OSS = require('ali-oss');
const { Utils } = require('zignis')

exports.command = 'get <fileName> <filePath>'
exports.desc = 'get oss file'
exports.aliases = 'download'

exports.builder = function (yargs) {
}

exports.handler = function (argv) {
  co(function* () {

    const { consul } = yield Utils.invokeHook('components')
    const { oss } = yield consul.get('oss')

    const client = new OSS({
      accessKeyId: oss.key,
      accessKeySecret: oss.secret,
      endpoint: oss.endpoint,
      bucket: oss.bucket,
    })

    const result = yield client.get(argv.fileName, argv.filePath)
    if (result.res.status === 200) {
      Utils.log(Utils.chalk.green(`${argv.fileName} downloaded to ${argv.filePath} successfully!`))
    }
    process.exit(0)

  }).catch((e) => Utils.error(e.stack))
}

