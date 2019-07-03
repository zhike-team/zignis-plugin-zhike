import { Utils } from 'zignis'

export const command = 'mq'
export const desc = 'zhike mq tools'

export const builder = function(yargs: any) {
  Utils.extendSubCommand('zhike/mq', 'zignis-plugin-zhike', yargs, __dirname)
}

export const handler = async function(argv: any) {}
