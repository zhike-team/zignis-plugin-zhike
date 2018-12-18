const path = require('path')
const fs = require('fs')
const co = require('co')
const OSS = require('ali-oss');
const { Utils } = require('zignis')
const { components } = require('../../../../')

exports.command = 'put <target> <files..>'
exports.desc = 'upload files'
exports.aliases = 'upload'

exports.builder = function (yargs) {
  yargs.option('simulate', { default: false, describe: 'Just simulate to show what files will be uploaded', alias: 'dry' })
  yargs.option('prefix', { default: false, describe: 'Only upload prefix matched file, and also prefix will be cut off' })
}

exports.handler = function (argv) {
  co(function* () {
    if (argv.prefix && argv.prefix[argv.prefix.length - 1] !== '/') {
      Utils.error('--prefix must be end with "/"')
    }

    const { consul } = yield components()
    const { oss } = yield consul.get('oss')

    const client = new OSS({
      accessKeyId: oss.key,
      accessKeySecret: oss.secret,
      endpoint: oss.endpoint,
      bucket: oss.bucket,
    })

    let matchedFiles = []
    argv.files && argv.files.forEach(filePattern => {
      Utils.glob
      .sync(filePattern).forEach(filePath => {
        matchedFiles.push(filePath)
      })
    })

    matchedFiles = matchedFiles.filter(filePath => {
      stat = fs.statSync(filePath)

      if (argv.prefix && filePath.indexOf(argv.prefix) !== 0) {
        return false
      }

      return !stat.isDirectory()
    })

    if (matchedFiles.length === 0) {
      Utils.error('Nothing to upload!')
    }

    if (argv.simulate) {
      matchedFiles.forEach(filePath => Utils.log(filePath))
      process.exit(0)
    }

    for (let filePath of matchedFiles) {
      let name = filePath
      if (argv.prefix) {
        name = filePath.substring(argv.prefix.length)
      }
      name = `${argv.target}/${name}`
      const result = yield client.put(name, filePath)
      if (result && result.res) {
        if (result.res.status === 200) {
          Utils.log(`${Utils.chalk.cyan(filePath)} uploaded to ${Utils.chalk.cyan(name)} ${Utils.chalk.green('successfully!')}`)
        } else {
          Utils.log(`${Utils.chalk.cyan(filePath)} uploaded to ${Utils.chalk.cyan(name)} ${Utils.chalk.red('failed!')}`)
        }
      }
    }

    process.exit(0)

  }).catch((e) => Utils.error(e.stack))
}