const glob = require('glob')
const co = require('co')
const cron = require('node-cron')
const path = require('path')
const promisify = require('util.promisify')
const fs = require('fs')
const execFile = promisify(require('child_process').execFile)

const { components } = require('../../../')
const { Utils } = require('zignis')
const debug = Utils.debug('zignis-plugin-zhike:cron')

const DEFAULT_EXPIRE_MILLISECONDS = 60000

// 执行器
const shell = {
  // 执行单条系统命令
  exec: function*(action, initInfo) {
    try {
      if (typeof action === 'string') {
        debug(`Action: [${action}] executed!`)
        const parts = action.split(/\s+/g)
        const { stdout } = yield execFile(parts[0], parts.slice(1), {})
        debug(stdout)
      } else if (typeof action === 'function') {
        const name = action.name ? action.name : 'function'
        debug(`Action: [${name}] executed!`)
        yield action(initInfo)
      }
    } catch (e) {
      debug(e.stack)
    }
  },

  // 执行多条系统命令
  series: function*(actions, initInfo) {
    const loops = actions.concat()
    const execNext = function*() {
      yield shell.exec(loops.shift(), initInfo)
      if (loops.length > 0) {
        yield execNext()
      }
    }
    yield execNext()
  }
}

exports.command = 'cron [job]'
exports.desc = `zhike cron system`

exports.builder = function(yargs) {
}

exports.handler = function(argv) {
  if (!argv.cronDir || !fs.existsSync(argv.cronDir)) {
    console.log(Utils.chalk.red('"cronDir" missing in config file or not exist in current directory!'))
    return
  }

  const config = Utils.getCombinedConfig()
  co(function*() {

    // 通过 Hook 进行初始化动作
    const initInfo = yield Utils.invokeHook('zhike:cron')

    // run specific job for testing, ignore disabled property
    if (argv.job) {
      if (fs.existsSync(path.resolve(process.cwd(), argv.job))) {
        const jobModule = require(path.resolve(process.cwd(), argv.job))
        if (jobModule && jobModule.actions && Utils._.isArray(jobModule.actions)) {
          yield shell.series(jobModule.actions, initInfo)
          process.exit(0)
        } else {
          Utils.error('Job not valid')
        }
      } else {
        Utils.error('Job not found')
      }
    }

    const { redis } = yield components()

    // Redis锁，加锁
    const lock = function*(redisKey, redisValue, timeout) {
      return yield redis.eval(
        'return redis.call("set", KEYS[1], ARGV[1], "NX", "PX", ARGV[2])',
        1,
        redisKey,
        redisValue,
        timeout
      )
    }

    // Redis锁，解锁
    const unlock = function*(redisKey, redisValue) {
      return yield redis.eval(
        'if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end',
        1,
        redisKey,
        redisValue
      )
    }

    const jobs = {}
    glob
      .sync('*.js', {
        cwd: path.resolve(process.cwd(), config.cronDir)
      })
      .map(function(job) {
        jobs[job] = require(path.resolve(process.cwd(), config.cronDir, job))
      })

    // 注册计划任务
    if (Object.keys(jobs).length > 0) {
      Object.keys(jobs).forEach(key => {
        if (jobs[key].disabled) return // ignore disabled job
        cron.schedule(jobs[key].schedule, function() {
          const redisKey = `${config.name}:cronjob:${key}`
          const redisValue = Math.random()
          debug(`${new Date().toLocaleString()} - JOB: [${key}] started!`)

          co(function*() {
            const ok = yield lock(
              redisKey,
              redisValue,
              jobs[key].duration ? jobs[key].duration : DEFAULT_EXPIRE_MILLISECONDS
            )
            if (ok) {
              yield shell.series(jobs[key].actions, initInfo)
              yield unlock(redisKey, redisValue)
            } else {
              debug('lock acquire failed.')
            }
          })
        })
      })
    } else {
      Utils.error('No enabled cronjob found')
    }
  }).catch(function(e) {
    Utils.error(e.stack)
  })
}
