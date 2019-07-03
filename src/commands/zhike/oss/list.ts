import oss from '../../../common/oss'
import { Utils } from 'zignis'

export const command = 'list [marker]'
export const desc = 'list keys'
export const aliases = 'ls'

export const builder = function(yargs: any) {
  yargs.option('prefix', { default: '', describe: 'search dir' })
  yargs.option('limit', { default: 10, describe: 'limit, max is 1000, default is 10' })
  yargs.option('pages', { default: 1, describe: 'pages to fetch, default is 1' })
}

export const handler = async function(argv: any) {
  argv.prefix = argv.prefix ? argv.prefix.replace(/^\/+/, '') : ''
  try {
    const client = await oss()
    let result
    let pages = Math.max(1, argv.pages)
    while (pages > 0) {
      pages--
      result = await client.list({
        marker: result && result.nextMarker ? result.nextMarker : argv.marker ? argv.marker : '',
        prefix: argv.prefix,
        'max-keys': argv.limit,
        delimiter: '/'
      })
      if (result.prefixes) {
        result.prefixes.forEach((item: any) => console.log(item))
      }
      if (result.objects) {
        result.objects.forEach((item: any) => console.log(item.name))
      }
    }
    process.exit(0)
  } catch (e) {
    return Utils.error(e.stack)
  }
}
