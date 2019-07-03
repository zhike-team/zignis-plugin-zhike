import { Utils } from 'zignis'

export const command = 'elasticsearch <op>'
export const desc = 'zhike elasticsearch tools'
export const aliases = 'es'

export const builder = function(yargs: any) {
  yargs.option('params', { default: {}, describe: 'Please reference client.cat.indices', alias: 'p' })
  yargs.option('debug', { describe: 'Show debug info' })
  // yargs.commandDir('es')
}

export const handler = async function(argv: any) {
  try {
    if (argv.debug) {
      Utils.log(argv)
    }
    const { elasticsearch } = await Utils.invokeHook('components')
    const client = await elasticsearch()
    const func = Utils._.get(client, argv.op)
    if (Utils._.isFunction(func)) {
      const ret = await func(argv.params)
      Utils.log(ret.body)
    } else {
      Utils.error(
        'Invalid elasticsearch api function name, please refer to: https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html'
      )
    }
  } catch (e) {
    return Utils.error(e.stack)
  }
}
