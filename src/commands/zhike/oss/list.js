
const co = require('co')
const OSS = require('ali-oss');
const { Utils } = require('zignis')
const { components } = require('../../../../')

exports.command = 'list [marker]'
exports.desc = 'list keys'
exports.aliases = 'ls'

exports.builder = function (yargs) {
  yargs.option('prefix', {default: '', describe: 'search dir'})
  yargs.option('limit', {default: 10, describe: 'limit, max is 1000, default is 10'})
  yargs.option('pages', {default: 1, describe: 'pages to fetch, default is 1'})
}

exports.handler = function (argv) {
  co(function* () {

    const { consul } = yield components()
    const { oss } = yield consul.get('oss')

    const client = new OSS({
      accessKeyId: oss.key,
      accessKeySecret: oss.secret,
      endpoint: oss.endpoint,
      bucket: oss.bucket,

    })

    let result
    let pages = Math.max(1, argv.pages)
    while (pages > 0) {
      pages--
      result = yield client.list({
        'marker': result && result.nextMarker ? result.nextMarker : argv.marker ? argv.marker : '',
        'prefix': argv.prefix,
        'max-keys': argv.limit,
        'delimiter': '/'
      })

      if (result.prefixes) {
        result.prefixes.forEach(item => console.log(item))
      }
  
      if (result.objects) {
        result.objects.forEach(item => console.log(item.name))
      }
    }

    process.exit(0)

  }).catch((e) => Utils.error(e.stack))
}

