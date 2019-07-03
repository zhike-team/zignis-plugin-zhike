import { Utils } from 'zignis'

export const command = 'db <op>'
export const desc = 'zhike db tools'
export const aliases = 'database'

export const builder = function(yargs: any) {
  Utils.extendSubCommand('zhike/db', 'zignis-plugin-zhike', yargs, __dirname)
}

export const handler = function(argv: any) {}
