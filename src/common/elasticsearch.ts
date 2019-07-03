import { Utils } from 'zignis'
import { Client } from '@elastic/elasticsearch'

let client: any = null
const es = async () => {
  if (client) {
    return client
  }

  const { consul } = await Utils.invokeHook('components')
  const { elasticsearch } = await consul.get('elasticsearch')

  client = new Client({ node: `${elasticsearch.host}:${elasticsearch.port}` })
  return client
}

export = es
