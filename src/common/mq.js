const AliMNS = require('ali-mns')
const { Utils } = require('zignis')

const queues = {}
const mq = (queueName) => {
  return Utils.co(function * () {
    if (!queueName) {
      throw new Error('queueName is necessary!')
    }
    
    if (queues[queueName]) {
      return queues[queueName]
    }
  
    const { consul } = yield Utils.invokeHook('components')
    const config = yield consul.get('mq')
  
    const accountId = config.mq.aliMns.accountId
    const accessKeyId = config.mq.aliMns.accessKeyId
    const accessKeySecret = config.mq.aliMns.accessKeySecret
    const account = new AliMNS.Account(accountId, accessKeyId, accessKeySecret)
  
    queues[queueName] = new AliMNS.MQ(config.mq.aliMns[queueName].name, account, config.mq.aliMns[queueName].region)
  
    return queues[queueName]
  })
}

module.exports = mq