import { Utils } from 'zignis'
import mq from '../../../common/mq'

export const command = 'view <queueName> [key]'
export const desc = 'view queue attributes'

export const builder = function(yargs: any) {}

export const handler = async function(argv: any) {
  try {
    const queue = await mq(argv.queueName)
    const attrs = await queue.getAttrsP()
    if (argv.key && attrs.Queue[argv.key]) {
      console.log(attrs.Queue[argv.key])
      process.exit(0)
    }
    const rows = [[Utils.chalk.green('Key'), Utils.chalk.green('Value'), Utils.chalk.green('Description')]]
    const descriptions: any = {
      QueueName: 'Queue 的名称',
      CreateTime: 'Queue 的创建时间，从1970-1-1 00:00:00 到现在的秒值',
      LastModifyTime: '修改 Queue 属性信息最近时间，从1970-1-1 00:00:00 到现在的秒值',
      DelaySeconds: '发送消息到该 Queue 的所有消息默认将以 DelaySeconds 参数指定的秒数延后可被消费，单位为秒',
      MaximumMessageSize: '发送到该 Queue 的消息体的最大长度，单位为byte',
      MessageRetentionPeriod:
        '消息在该 Queue 中最长的存活时间，从发送到该队列开始经过此参数指定的时间后，不论消息是否被取出过都将被删除，单位为秒',
      PollingWaitSeconds: '当 Queue 消息量为空时，针对该 Queue 的 ReceiveMessage 请求最长的等待时间，单位为秒',
      ActiveMessages: '在该 Queue 中处于 Active 状态的消息总数，为近似值',
      InactiveMessages: '在该 Queue 中处于 Inactive 状态的消息总数，为近似值',
      DelayMessages: '在该 Queue 中处于 Delayed 状态的消息总数，为近似值',
      LoggingEnabled: '是否开启日志管理功能，True表示启用，False表示停用',
      VisibilityTimeout: '如果Worker在timeout时间内没能处理完Message，那么消息就有可能被其他Worker接收到并处理'
    }
    Object.keys(attrs.Queue).forEach((key: string) => {
      if (!Utils._.isObject(attrs.Queue[key])) {
        if (key === 'CreateTime' || key === 'LastModifyTime') {
          attrs.Queue[key] = Utils.day(attrs.Queue[key] * 1000).format('YYYY-MM-DD hh:mm:ss')
        }
        rows.push([key, attrs.Queue[key], descriptions[key]])
      }
    })
    console.log(Utils.table(rows))
    process.exit(0)
  } catch (e) {
    return Utils.error(e.stack)
  }
}
