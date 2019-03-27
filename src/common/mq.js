const AliMNS = require('ali-mns')
const { Utils } = require('zignis')

class MQ {
  constructor(queueName) {
    this.queueName = queueName
  }

  async connect() {
    const { consul } = await Utils.invokeHook('components')
    const config = await consul.get('mq')

    const accountId = config.mq.aliMns.accountId
    const accessKeyId = config.mq.aliMns.accessKeyId
    const accessKeySecret = config.mq.aliMns.accessKeySecret
    const account = new AliMNS.Account(accountId, accessKeyId, accessKeySecret)

    const queue = new AliMNS.MQ(config.mq.aliMns[this.queueName].name, account, config.mq.aliMns[this.queueName].region)

    return queue
  }
}

module.exports = MQ