import { Utils } from 'zignis'
import oss from '../../../common/oss'
import path from 'path'

export const command = 'get <fileName> <filePath>'
export const desc = 'get oss file'
export const aliases = 'download'

export const builder = function(yargs: any) {}

export const handler = async function(argv: any) {
  argv.prefix = argv.prefix ? argv.prefix.replace(/^\/+/, '') : ''
  argv.filePath = argv.filePath === '.' ? './' : argv.filePath

  // 确保目标目录存在
  let filePath = path.resolve(argv.filePath)
  let dir = filePath
  if (argv.filePath[argv.filePath.length - 1] !== '/') {
    dir = path.dirname(filePath)
  }
  Utils.fs.ensureDirSync(dir)

  // 构造文件名
  if (argv.filePath[argv.filePath.length - 1] === '/') {
    filePath = `${filePath}/${path.basename(argv.fileName)}`
  }

  try {
    const client = await oss()
    const result = await client.get(argv.fileName, filePath)
    if (result.res.status === 200) {
      Utils.log(Utils.chalk.green(`${argv.fileName} downloaded to ${argv.filePath} successfully!`))
    }
    process.exit(0)
  } catch (e) {
    Utils.error(e.stack)
  }
}
