const co = require('co')
const Sequelize = require('sequelize')
const Op = Sequelize.Op
const { Utils } = require('zignis')

const format = function(file) {
  if (file.size >= 1024 * 1024 * 1024) {
    file.sizeText = (file.size / 1024 / 1024 / 1024).toFixed(2) + 'GB'
  } else if (file.size >= 1024 * 1024) {
    file.sizeText = (file.size / 1024 / 1024).toFixed(2) + 'MB'
  } else if (file.size >= 1024) {
    file.sizeText = (file.size / 1024).toFixed(2) + 'KB'
  } else if (file.size === 0) {
    file.sizeText = '---'
  } else {
    file.sizeText = file.size + 'B'
  }
  return file
}

const processSlice = function*(file, { FileFormat, Format }, argv) {
  const versions = yield FileFormat.findAll({
    raw: true,
    where: {
      fileId: file.id
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

    let url
    if (version.dest) {
      if ([7, 8].indexOf(version.formatId) !== -1) {
        url = `https://media7.smartstudy.com${JSON.parse(version.dest).cdn}/dest.mp4`
      } else if ([1, 3].indexOf(version.formatId) !== -1) {
        url = `https://media6.smartstudy.com${version.dest}/dest.mpd`
      } else if ([2, 4, 5].indexOf(version.formatId) !== -1) {
        url = `https://media6.smartstudy.com${version.dest}/dest.m3u8`
      }
    }

    versionsTable.push([version.id, format.name, version.status ? '已完成' : '未完成', url])
  }

  const fileFormat = format(file)
  console.log(Utils.chalk.cyan('Basic:'))
  Utils.log({
    id: file.id,
    name: file.name,
    fatherId: file.fatherId,
    size: fileFormat.sizeText,
    duration: `${file.duration / 60}分钟`,
    tips: file.tips ? JSON.parse(file.tips) : {}
  })

  if (versionsTable.length > 0) {
    console.log(Utils.chalk.cyan('Versions:'))
    if (argv.simple) {
      Utils.outputTable(versionsTable)
    } else {
      console.log(Utils.table(versionsTable))
    }
    
  }
}

exports.command = 'slice <keyword>'
exports.desc = 'get zhike slice info'

exports.builder = function(yargs) {
  yargs.option('fuzzy', {
    default: false,
    describe: 'match item in fuzzy mode'
  })

  yargs.option('simple', {
    default: false,
    describe: 'show versions using simple table'
  })
}

exports.handler = function(argv) {
  co(function*() {
    const { db } = yield Utils.invokeHook('components')
    const transcodeDb = yield db.load('db.transcode', 'transcode')
    const { File } = transcodeDb.models

    const orConds = []
    if (Utils._.isNaN(Number(argv.keyword))) {
      orConds.push({
        name: {
          [Op.like]: `%${argv.keyword}%`
        }
      })
    } else {
      orConds.push({ id: Number(argv.keyword) })
    }

    const files = yield File.findAll({
      raw: true,
      where: {
        [Op.or]: orConds
      },
      limit: 10
    })

    if (files.length === 1) {
      yield processSlice(files[0], transcodeDb.models, argv)
    } else {
      const answers = yield Utils.inquirer.prompt([
        {
          type: 'autocomplete',
          name: 'selected',
          message: `Please choose a file to continue:`,
          source: (answers, input) => {
            input = input || ''

            return new Promise(function(resolve) {
              if (argv.fuzzy) {
                resolve(
                  Utils.fuzzy.filter(input, files.map(file => `[${file.id}]-${file.name}`)).map(el => el.original)
                )
              } else {
                resolve(
                  files
                    .map(file => `[${file.id}]-${file.name}`)
                    .filter(item => item.toLowerCase().indexOf(input.toLowerCase()) > -1)
                )
              }
            })
          },
          validate: function(answers) {
            if (answers.length < 1) {
              return 'Please choose at least one.'
            }
            return true
          }
        }
      ])

      const matched = /^\[(\d+)\]-/.exec(answers.selected)
      const file = Utils._.find(files, { id: Number(matched[1]) })
      yield processSlice(file, transcodeDb.models, argv)
    }

    process.exit(0)
  }).catch(e => {
    Utils.error(e.stack)
  })
}
