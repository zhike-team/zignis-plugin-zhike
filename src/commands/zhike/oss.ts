import { Utils } from 'zignis'

export const command = 'oss'
export const desc = 'zhike oss tools'

export const builder = function(yargs: any) {
  Utils.extendSubCommand('zhike/oss', 'zignis-plugin-zhike', yargs, __dirname)
}

export const handler = function(argv: any) {}
