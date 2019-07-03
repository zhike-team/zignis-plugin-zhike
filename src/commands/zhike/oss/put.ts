import fs from 'fs'
import OSS from 'ali-oss'
import { Utils } from 'zignis'

export const command = 'put <target> <files..>'
export const desc = 'upload files'
export const aliases = 'upload'

export const builder = function(yargs: any) {
  yargs.option('simulate', {
    default: false,
    describe: 'Just simulate to show what files will be uploaded',
    alias: 'dry'
  })
  yargs.option('prefix', {
    default: false,
    describe: 'Only upload prefix matched file, and also prefix will be cut off'
  })

  yargs.option('header-content-type', { default: false, describe: 'Set header: Content-Type' })
  yargs.option('header-cache-control', { default: false, describe: 'Set header: Cache-Control' })
  yargs.option('header-content-disposition', { default: false, describe: 'Set header: Content-Disposition' })
  yargs.option('header-content-encoding', { default: false, describe: 'Set header: Content-Encoding' })
  yargs.option('header-expires', { default: false, describe: 'Set header: Expires' })
}

export const handler = async function(argv: any) {
  try {
    if (argv.prefix && argv.prefix[argv.prefix.length - 1] !== '/') {
      Utils.error('--prefix must be end with "/"')
    }
    if (argv.target && argv.target[argv.target.length - 1] !== '/') {
      argv.target = `${argv.target}/`
    }
    const { consul } = await Utils.invokeHook('components')
    const { oss } = await consul.get('oss')
    const client = new OSS({
      accessKeyId: oss.key,
      accessKeySecret: oss.secret,
      endpoint: oss.endpoint,
      bucket: oss.bucket
    })
    let matchedFiles: string[] = []
    argv.files &&
      argv.files.forEach((filePattern: string) => {
        Utils.glob.sync(filePattern).forEach((filePath: string) => {
          matchedFiles.push(filePath)
        })
      })
    matchedFiles = matchedFiles.filter(filePath => {
      const stat = fs.statSync(filePath)
      if (argv.prefix && filePath.indexOf(argv.prefix) !== 0) {
        return false
      }
      return !stat.isDirectory()
    })
    if (matchedFiles.length === 0) {
      Utils.error('Nothing to upload!')
    }
    if (argv.simulate) {
      matchedFiles.forEach(filePath => Utils.log(filePath))
      process.exit(0)
    }
    const options: OSS.PutObjectOptions & {
      headers: {
        [propName: string]: any
      }
    } = {
      headers: {},
      callback: {
        url: '',
        host: '',
        body: ''
      }
    }
    if (argv.headerContentType) {
      options.mime = argv.headerContentType
    }
    if (argv.headerCacheControl) {
      options.headers['Cache-Control'] = argv.headerCacheControl
    }
    if (argv.headerContentDisposition) {
      options.headers['Content-Disposition'] = argv.headerContentDisposition
    }
    if (argv.headerContentEncoding) {
      options.headers['Content-Encoding'] = argv.headerContentEncoding
    }
    if (argv.headerExpires) {
      options.headers['Expires'] = argv.headerExpires
    }
    for (let filePath of matchedFiles) {
      let name = filePath
      if (argv.prefix) {
        name = filePath.substring(argv.prefix.length)
      }
      name = `${argv.target}${name}`
      const result = await client.put(name, filePath, options)
      if (result && result.res) {
        if (result.res.status === 200) {
          Utils.log(
            `${Utils.chalk.cyan(filePath)} uploaded to ${Utils.chalk.cyan(name)} ${Utils.chalk.green('successfully!')}`
          )
        } else {
          Utils.log(`${Utils.chalk.cyan(filePath)} uploaded to ${Utils.chalk.cyan(name)} ${Utils.chalk.red('failed!')}`)
        }
      }
    }
    process.exit(0)
  } catch (e) {
    return Utils.error(e.stack)
  }
}
