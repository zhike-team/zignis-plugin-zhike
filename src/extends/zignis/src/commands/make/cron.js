const fs = require('fs')
const path = require('path')
const { Utils } = require('zignis')
const _ = require('lodash')

exports.command = 'cron [name]'
exports.desc = 'Generate a zignis cron job file'
// exports.alias = ''

exports.builder = function(yargs) {
  // yargs.option('option', {default, describe, alias})
}

exports.handler = function(argv) {
  if (!argv.cronDir || !fs.existsSync(argv.cronDir)) {
    console.log(Utils.chalk.red('"cronDir" missing in config file or not exist in current directory!'))
    return
  }

  const filePrefix = Utils.day().format('YYYYMMDDHHmmssSSS')
  const cronFile = path.resolve(argv.cronDir, `${filePrefix}_${_.kebabCase(argv.name)}.js`)
  if (fs.existsSync(cronFile)) {
    console.log(Utils.chalk.red('Scritp file exist!'))
    return
  }

  const code = `
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

// 示例 Job Actions
const demoAction = async function demo() {
  console.log('Demo job action')
  await sleep(60000)
}

exports.schedule = '* * * * *'
exports.duration = 60000
exports.actions = [demoAction]
exports.disabled = false

`
  if (!fs.existsSync(cronFile)) {
    fs.writeFileSync(cronFile, code)
    console.log(Utils.chalk.green(`${cronFile} created!`))
  }
}
