import { Utils } from 'zignis'
import mq from '../../../common/mq'

export const command = 'peek <queueName>'
export const desc = 'show top message on the queue'

export const builder = function(yargs: any) {}

export const handler = async function(argv: any) {
  try {
    const queue = await mq(argv.queueName)
    let ret
    try {
      ret = await queue.peekP(1)
    } catch (e) {
      Utils.error(e.Error.Message)
    }
    Utils.log(ret)
    process.exit(0)
  } catch (e_1) {
    return Utils.error(e_1.stack)
  }
}
