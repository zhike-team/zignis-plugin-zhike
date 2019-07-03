import { Utils } from 'zignis'

export const command = 'list'
export const desc = 'list queue names'
export const aliases = 'ls'

export const builder = function(yargs: any) {}

export const handler = async function(argv: any) {
  try {
    const { consul } = await Utils.invokeHook('components')
    const config = await consul.get('mq')
    const rows = [[Utils.chalk.green('Key'), Utils.chalk.green('Name'), Utils.chalk.green('Region')]]
    Object.keys(config.mq.aliMns).forEach(key => {
      if (Utils._.isObject(config.mq.aliMns[key])) {
        rows.push([Utils.chalk.cyan(key), config.mq.aliMns[key].name, config.mq.aliMns[key].region])
      }
    })
    console.log(Utils.table(rows))
    process.exit(0)
  } catch (e) {
    return Utils.error(e.stack)
  }
}
