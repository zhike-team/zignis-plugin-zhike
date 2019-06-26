const { Utils } = require('zignis')
const { Client } = require('@elastic/elasticsearch')

let client = null
const elasticsearch = () => {
  return Utils.co(function * () {
    if (client) {
      return client
    }

    const { consul } = yield Utils.invokeHook('components')
    const { elasticsearch } = yield consul.get('elasticsearch')

    client = new Client({ node: `${elasticsearch.host}:${elasticsearch.port}` })
    return client
  })
}

module.exports = elasticsearch