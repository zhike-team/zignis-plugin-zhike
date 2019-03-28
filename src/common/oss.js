const { Utils } = require('zignis')
const OSS = require('ali-oss');

let client = null
const oss = () => {
  return Utils.co(function * () {
    if (client) {
      return client
    }

    const { consul } = yield Utils.invokeHook('components')
    const { oss } = yield consul.get('oss')

    client = new OSS({
      accessKeyId: oss.key,
      accessKeySecret: oss.secret,
      endpoint: oss.endpoint,
      bucket: oss.bucket,
    })

    return client
  })
}

module.exports = oss