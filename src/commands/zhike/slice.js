const co = require('co')
const { components } = require('../../../')
const { Utils } = require('zignis')

const format = function (file) {
  if (file.size >= 1024 * 1024 * 1024) {
    file.sizeText = (file.size / 1024 / 1024 / 1024).toFixed(2) + 'GB';
  }
  else if (file.size >= 1024 * 1024) {
    file.sizeText = (file.size / 1024 / 1024).toFixed(2) + 'MB';
  }
  else if (file.size >= 1024) {
    file.sizeText = (file.size / 1024).toFixed(2) + 'KB'
  }
  else if (file.size === 0) {
    file.sizeText = '---';
  }
  else {
    file.sizeText = file.size + 'B';
  }
  return file;
};

exports.command = 'slice <fileId>'
exports.desc = 'get zhike slice info'

exports.builder = function (yargs) {
}

exports.handler = function (argv) {
  co(function* () {
    const { db } =  yield components()
    const transcodeDb = yield db.load('db.transcode', 'transcode')
    const { File, FileFormat, Format } = transcodeDb.models
    const file = yield File.findOne({
      raw: true,
      where: {
        id: argv.fileId
      }
    })
    const versions = yield FileFormat.findAll({
      raw: true,
      where: {
        fileId: argv.fileId
      }
    })

    const versionsTable = []

    for (let i = 0; i < versions.length; i++) {
      const version = versions[i]
      const format = yield Format.findOne({
        where: {
          id: version.formatId
        }
      })

      versionsTable.push([version.id, format.name, version.status ? '已完成' : '未完成', version.dest])
    }

    // console.log(file)
    console.log(Utils.chalk.cyan('Basic:'))
    Utils.log({
      id: file.id,
      name: file.name,
      fatherId: file.fatherId,
      size: format(file.size),
      duration: `${file.duration / 60}分钟`,
      tips: file.tips ? JSON.parse(file.tips) : {}
    })

    console.log(Utils.chalk.cyan('Versions:'))
    console.log(Utils.table(versionsTable))
    process.exit(0)
  })
}
