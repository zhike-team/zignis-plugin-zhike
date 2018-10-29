const spawn = require('child_process').spawn
const _ = require('lodash')

class Kubectl {
  constructor(type, conf) {
    this.type = type
    this.binary = conf.binary || 'kubectl'
    this.kubeconfig = conf.kubeconfig || ''
    this.namespace = conf.namespace || ''
    this.endpoint = conf.endpoint || ''
  }

  generateCommandArgs(args) {
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

  generateCommand(args) {
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

  spawn(args, done) {
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
      stdout = [],
      stderr = []

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

  callbackFunction(primise, callback) {
    if (_.isFunction(callback)) {
      primise
        .then(data => {
          callback(null, data)
        })
        .catch(err => {
          callback(err)
        })
    }
  }

  command(cmd, callback) {
    if (_.isString(cmd)) cmd = cmd.split(' ')

    const promise = new Promise((resolve, reject) => {
      this.spawn(cmd, function(err, data) {
        if (err) return reject(err || data)

        resolve(
          cmd.join(' ').indexOf('--output=json') > -1 ? JSON.parse(data) : data
        )
      })
    })

    this.callbackFunction(promise, callback)

    return promise
  }

  list(selector, flags, done) {
    if (!this.type) throw new Error('not a function')

    if (typeof selector === 'object') {
      var args = '--selector='

      for (var key in selector) args += key + '=' + selector[key]

      selector = args + ''
    } else {
      done = selector
      selector = '--output=json'
    }

    if (_.isFunction(flags)) {
      done = flags
      flags = null
    }

    flags = flags || []

    const action = ['get', this.type, selector, '--output=json'].concat(flags)

    return this.command(action, done)
  }

  get(name, flags, done) {
    if (!this.type) throw new Error('not a function')

    if (_.isFunction(flags)) {
      done = flags
      flags = null
    }

    flags = flags || []

    const action = ['get', this.type, name, '--output=json'].concat(flags)

    return this.command(action, done)
  }

  create(filepath, flags, done) {
    if (!this.type) throw new Error('not a function')

    if (_.isFunction(flags)) {
      done = flags
      flags = null
    }

    flags = flags || []

    const action = ['create', '-f', filepath].concat(flags)

    return this.command(action, done)
  }

  delete(id, flags, done) {
    if (!this.type) throw new Error('not a function')

    if (_.isFunction(flags)) {
      done = flags
      flags = null
    }

    flags = flags || []

    const action = ['delete', this.type, id].concat(flags)

    return this.command(action, done)
  }

  update(filepath, flags, done) {
    if (!this.type) throw new Error('not a function')

    if (_.isFunction(flags)) {
      done = flags
      flags = null
    }

    flags = flags || []

    const action = ['update', '-f', filepath].concat(flags)

    return this.command(action, done)
  }

  apply(name, json, flags, done) {
    if (!this.type) throw new Error('not a function')

    if (_.isFunction(flags)) {
      done = flags
      flags = null
    }

    flags = flags || []
    const action = [
      'update',
      this.type,
      name,
      '--patch=' + JSON.stringify(json)
    ].concat(flags)

    return this.command(action, done)
  }

  rollingUpdateByFile(name, filepath, flags, done) {
    if (this.type !== 'replicationcontrollers')
      throw new Error('not a function')

    if (_.isFunction(flags)) {
      done = flags
      flags = null
    }

    flags = flags || []
    const action = [
      'rolling-update',
      name,
      '-f',
      filepath,
      '--update-period=0s'
    ].concat(flags)

    return this.command(action, done)
  }

  rollingUpdate(name, image, flags, done) {
    if (this.type !== 'replicationcontrollers')
      throw new Error('not a function')

    if (_.isFunction(flags)) {
      done = flags
      flags = null
    }

    flags = flags || []

    const action = [
      'rolling-update',
      name,
      '--image=' + image,
      '--update-period=0s'
    ].concat(flags)

    return this.command(action, done)
  }

  scale(name, replicas, flags, done) {
    if (this.type !== 'replicationcontrollers' && this.type !== 'deployments')
      throw new Error('not a function')

    if (_.isFunction(flags)) {
      done = flags
      flags = null
    }

    flags = flags || []
    const action = [
      'scale',
      '--replicas=' + replicas,
      'replicationcontrollers',
      name
    ].concat(flags)

    return this.command(action, done)
  }

  logs(name, flags, done) {
    if (this.type !== 'pods') throw new Error('not a function')

    var action = new Array('logs')

    if (name.indexOf(' ') > -1) {
      var names = name.split(/ /)
      action.push(names[0])
      action.push(names[1])
    } else {
      action.push(name)
    }

    if (_.isFunction(flags)) {
      done = flags
      flags = null
    }

    flags = flags || []

    return this.command(action.concat(flags), done)
  }

  describe(name, flags, done) {
    if (!this.type) throw new Error('not a function')

    var action = new Array('describe', this.type)

    if (name === null) {
      action.push(name)
    }

    if (_.isFunction(flags)) {
      done = flags
      flags = null
    }

    flags = flags || []

    return this.command(action.concat(flags), done)
  }

  portForward(name, portString, done) {
    if (this.type !== 'pods') throw new Error('not a function')

    var action = new Array('port-forward', name, portString)

    return this.command(action, done)
  }

  useContext(context, done) {
    var action = new Array('config', 'use-context', context)

    return this.command(action, done)
  }

  viewContext(done) {
    var action = new Array('config', '--output=json', 'view')

    this.command(action, done)
  }
}

exports.Kubectl = Kubectl
