import { Utils } from 'zignis'
import yargs from 'yargs'

export const command = 'zhike'
export const desc = 'Zhike related commands'

export const builder = function(yargs: yargs.Argv) {
  Utils.extendSubCommand('zhike', 'zignis-plugin-zhike', yargs, __dirname)
}

export const handler = function(argv: yargs.Arguments) {}
