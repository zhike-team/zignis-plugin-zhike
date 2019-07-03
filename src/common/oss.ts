import { Utils } from 'zignis'
import OSS from 'ali-oss'

let client: any = null
const oss = async () => {
  if (client) {
    return client
  }

  const { consul } = await Utils.invokeHook('components')
  const { oss } = await consul.get('oss')

  client = new OSS({
    accessKeyId: oss.key,
    accessKeySecret: oss.secret,
    endpoint: oss.endpoint,
    bucket: oss.bucket
  })

  return client
}

export = oss
