import AliMNS from 'ali-mns'
import { Utils } from 'zignis'

const queues: { [propName: string]: any } = {}
const mq = async (queueName: string) => {
  if (!queueName) {
    throw new Error('queueName is necessary!')
  }

  if (queues[queueName]) {
    return queues[queueName]
  }

  const { consul } = await Utils.invokeHook('components')
  const config = await consul.get('mq')

  const accountId = config.mq.aliMns.accountId
  const accessKeyId = config.mq.aliMns.accessKeyId
  const accessKeySecret = config.mq.aliMns.accessKeySecret
  const account = new AliMNS.Account(accountId, accessKeyId, accessKeySecret)

  queues[queueName] = new AliMNS.MQ(config.mq.aliMns[queueName].name, account, config.mq.aliMns[queueName].region)

  return queues[queueName]
}

export = mq
