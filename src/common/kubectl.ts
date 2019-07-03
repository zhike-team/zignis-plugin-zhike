import cProcess from 'child_process'
import { Utils } from 'zignis'

const spawn = cProcess.spawn
export class Kubectl {
  type: string
  binary: string
  kubeconfig: string
  namespace: string
  endpoint: string
  constructor(type: string, conf: { [propName: string]: any }) {
    this.type = type
    this.binary = conf.binary || 'kubectl'
    this.kubeconfig = conf.kubeconfig || ''
    this.namespace = conf.namespace || ''
    this.endpoint = conf.endpoint || ''
  }

  generateCommandArgs(args: string[]) {
    const ops = new Array()

    if (this.kubeconfig) {
      ops.push('--kubeconfig=' + this.kubeconfig)
    } else {
      ops.push('-s')
      ops.push(this.endpoint)
    }

    if (this.namespace) {
      ops.push('--namespace=' + this.namespace)
    }
    return ops.concat(args)
  }

  generateCommand(args: string[]) {
    const ops = new Array()

    if (this.kubeconfig) {
      ops.push('--kubeconfig=' + this.kubeconfig)
    } else {
      ops.push('-s')
      ops.push(this.endpoint)
    }

    if (this.namespace) {
      ops.push('--namespace=' + this.namespace)
    }
    return `${this.binary} ${ops.concat(args).join(' ')}`
  }

  spawn(args: string[], done: any) {
    const ops = new Array()

    if (this.kubeconfig) {
      ops.push('--kubeconfig=' + this.kubeconfig)
    } else {
      ops.push('-s')
      ops.push(this.endpoint)
    }

    if (this.namespace) {
      ops.push('--namespace=' + this.namespace)
    }

    const kube = spawn(this.binary, ops.concat(args)),
      stdout: string[] = [],
      stderr: string[] = []

    kube.stdout.on('data', function(data) {
      stdout.push(data.toString())
    })

    kube.stderr.on('data', function(data) {
      stderr.push(data.toString())
    })

    kube.on('close', function(code) {
      if (!stderr.length) return done(null, stdout.join(''))

      done(stderr.join(''))
    })
  }

  callbackFunction(primise: any, callback: any) {
    if (Utils._.isFunction(callback)) {
      primise
        .then((data: any) => {
          callback(null, data)
        })
        .catch((err: Error) => {
          callback(err)
        })
    }
  }

  command(cmd: any, callback: any) {
    let cmds: string[]
    cmds = Utils._.isString(cmd) ? cmd.split(' ') : cmd

    const promise = new Promise((resolve, reject) => {
      this.spawn(<string[]>cmd, function(err: Error, data: any) {
        if (err) return reject(err || data)

        resolve(cmds.join(' ').indexOf('--output=json') > -1 ? JSON.parse(data) : data)
      })
    })

    this.callbackFunction(promise, callback)

    return promise
  }

  list(selector?: any, flags?: any, done?: any) {
    if (!this.type) throw new Error('not a function')

    if (typeof selector === 'object') {
      var args = '--selector='

      for (var key in selector) args += key + '=' + selector[key]

      selector = args + ''
    } else {
      done = selector
      selector = '--output=json'
    }

    if (Utils._.isFunction(flags)) {
      done = flags
      flags = null
    }

    flags = flags || []

    const action = ['get', this.type, selector, '--output=json'].concat(flags)

    return this.command(action, done)
  }

  get(name: string, flags: any, done: any) {
    if (!this.type) throw new Error('not a function')

    if (Utils._.isFunction(flags)) {
      done = flags
      flags = null
    }

    flags = flags || []

    const action = ['get', this.type, name, '--output=json'].concat(flags)

    return this.command(action, done)
  }

  create(filepath: string, flags: any, done: any): any {
    if (!this.type) throw new Error('not a function')

    if (Utils._.isFunction(flags)) {
      done = flags
      flags = null
    }

    flags = flags || []

    const action = ['create', '-f', filepath].concat(flags)

    return this.command(action, done)
  }

  delete(id: string, flags: any, done: any) {
    if (!this.type) throw new Error('not a function')

    if (Utils._.isFunction(flags)) {
      done = flags
      flags = null
    }

    flags = flags || []

    const action = ['delete', this.type, id].concat(flags)

    return this.command(action, done)
  }

  update(filepath: string, flags: any, done: any) {
    if (!this.type) throw new Error('not a function')

    if (Utils._.isFunction(flags)) {
      done = flags
      flags = null
    }

    flags = flags || []

    const action = ['update', '-f', filepath].concat(flags)

    return this.command(action, done)
  }

  apply(name: string, json: any, flags: any, done: any) {
    if (!this.type) throw new Error('not a function')

    if (Utils._.isFunction(flags)) {
      done = flags
      flags = null
    }

    flags = flags || []
    const action = ['update', this.type, name, '--patch=' + JSON.stringify(json)].concat(flags)

    return this.command(action, done)
  }

  rollingUpdateByFile(name: string, filepath: string, flags: any, done: any) {
    if (this.type !== 'replicationcontrollers') throw new Error('not a function')

    if (Utils._.isFunction(flags)) {
      done = flags
      flags = null
    }

    flags = flags || []
    const action = ['rolling-update', name, '-f', filepath, '--update-period=0s'].concat(flags)

    return this.command(action, done)
  }

  rollingUpdate(name: string, image: string, flags: any, done: any) {
    if (this.type !== 'replicationcontrollers') throw new Error('not a function')

    if (Utils._.isFunction(flags)) {
      done = flags
      flags = null
    }

    flags = flags || []

    const action = ['rolling-update', name, '--image=' + image, '--update-period=0s'].concat(flags)

    return this.command(action, done)
  }

  scale(name: string, replicas: string, flags: any, done: any) {
    if (this.type !== 'replicationcontrollers' && this.type !== 'deployments') throw new Error('not a function')

    if (Utils._.isFunction(flags)) {
      done = flags
      flags = null
    }

    flags = flags || []
    const action = ['scale', '--replicas=' + replicas, 'replicationcontrollers', name].concat(flags)

    return this.command(action, done)
  }

  logs(name: string, flags: any, done: any) {
    if (this.type !== 'pods') throw new Error('not a function')

    var action = new Array('logs')

    if (name.indexOf(' ') > -1) {
      var names = name.split(/ /)
      action.push(names[0])
      action.push(names[1])
    } else {
      action.push(name)
    }

    if (Utils._.isFunction(flags)) {
      done = flags
      flags = null
    }

    flags = flags || []

    return this.command(action.concat(flags), done)
  }

  describe(name: string, flags: any, done: any) {
    if (!this.type) throw new Error('not a function')

    var action = new Array('describe', this.type)

    if (name === null) {
      action.push(name)
    }

    if (Utils._.isFunction(flags)) {
      done = flags
      flags = null
    }

    flags = flags || []

    return this.command(action.concat(flags), done)
  }

  portForward(name: string, portString: string, done: any) {
    if (this.type !== 'pods') throw new Error('not a function')

    var action = new Array('port-forward', name, portString)

    return this.command(action, done)
  }

  useContext(context: any, done: any) {
    var action = new Array('config', 'use-context', context)

    return this.command(action, done)
  }

  viewContext(done: any) {
    var action = new Array('config', '--output=json', 'view')

    this.command(action, done)
  }
}
