# 开发目的

`zignis-plugin-zhike` 是一个基于 `Zignis` 扩展机制开发的插件，开发这个插件的目的是能把整个智课技术架构常用的基础设施都接入进来，只要是基于智课技术开发的项目，大部分功能都是可用的。基于 `Zignis` 的扩展性，在技术栈有更新时，可以继续完善此插件；在不方面放入此插件时，可以在这个插件的基础上开发新的插件进行扩展。

# 命令列表

```
zignis zhike

zhike related commands

命令：
  zignis zhike consul [keys..]          zhike consul config review [aliases: config]
  zignis zhike k8s <op> [keyword]       zhike k8s tools [aliases: kubectl, docker, pod]
  zignis zhike redis cmd [arguments..]  zhike redis tool, use ioredis [aliases: cache]
```

# 命令说明

**zignis zhike consul**

`consul` 命令的用处是随时查看公司 Consul 里集中管理的配置。可以在后面同时获取多个 key。在获取配置的时候 `.` 的作用是分层获取配置。比如 `oss` Key 层级下有个 `prefix` 那么在用命令获取时，只要使用 `oss.prefix` 即可取出这个信息。

另外，需要注意的是 `/` 没有任何其他用途，可以直接参与 key 的命名，而且公司一部分 key 就是这样命名的。

所有和 `consul` 配置相关的命令或者钩子扩展都是能够自动识别环境的，因为是基于 `NODE_ENV` 环境变量进行判断的。

**zignis zhike k8s**

`k8s` 命令的用处是封装了几个常用的 `kubectl` 命令，并且能够兼容开发和线上两个环境。k8s 命令有两个依赖，一个是需要用户本地安装了 `kubectl` 二进制命令；另一个是设置好授权配置文件，需要在 `.bashrc` 或 `.zshrc` 等系统用户配置文件中设置两个全局常量，ZIGNIS_ZHIKE_K8S_DEV 和 ZIGNIS_ZHIKE_K8S_PROD，需要配置的是绝对路径。

k8s 的别名还有：kubectl, docker, pod 等，为了执行时敲打起来更加通顺流程。

```
k8s list|ls [keyword] 查看 pod 列表，keyword关键字可以缩小列表范围，keyword 前面加上 `~` 可以进行模糊搜索，后面的命令也有这个特点
k8s bash|exec|rsh [keyword] 用 bash 登录到容器中，如果筛选结果只有一个 pod，可以直接进入，如果有多个，则需要选择。
k8s logs|log [keyword] 用于显示 pod 日志，可以在 keyword 筛选结果里再次进行多选，集合多个 pod 的日志一起事实查看日志。
```

命令有一个选项 --namespace|-n，用于指定选择的 k8s 命名空间，默认是 c-dev，公司的线上环境的命名空间是 c-production。

**zignis zhike redis**

redis 命令用于获取公司 redis 服务里的缓存数据，也可以执行其他简单的 redis 命令，基于 ioredis 开发，所以里面包含的所有方法都可以试试，但是复杂的命令由于受到命令行的限制，无法有效输入。此命令有个选项是 `--json`，当 Redis 里的值是 JSON 数据的时候，可以被 parse 从而格式化显示。

# 实现 repl 钩子

`Node.js` 内置的 `node` 命令的 `REPL` 里可以用来尝试一些基本的 node 和 javascript 的用法，但是这还远远不够，我们希望 REPL 可以对项目开发有帮助，可以操作公司技术架构的各种基础设施。

本插件通过 `Zignis` 的 repl 钩子，为 REPL 注入了一个 `zhike` 对象，通过操作这个对象，可以实现与命令行相同的功能，甚至更加强大。对于异步操作同时支持 `await` 和 `yield` 两种触发方式。下面以 `await` 为例，简单介绍一下：

```
$ zignis repl
>>> await zhike.consul('oss')
>>> await zhike.redis.keys('*')
>>> await zhike.redis.get('REDIS_KEY')
>>> await zhike.db.load('db/social', 'social')
>>> let { WechatUser } = zhike.db.instances.social.models
>>> await WechatUser.count()
```

其中 zhike.db 的用法是专门针对公司的关系型数据库集群，基于 `Sequelize` 进行的封装，不需要自定义或者同步 schema，直接就可以使用，支持 mysql 和 postgres 两个数据库引擎，有过还有其他引擎，也可以基于 `Sequelize` 来进行扩展。

# 基于插件开发项目

这个插件还有一个作用是，可以直接用于做项目开发，主要使用的是通过 components 暴露出来的对 配置，缓存和数据库的封装，可以在开发时直接操作数据库，不需要写太多和数据库初始化相关的逻辑。以下的代码演示了基本的使用方法。

**yield/co style:**

```
const co = require('co')
const path = require('path')

const { components } = require('zignis-plugin-zhike')
co(function* () {
  const zhike = yield components()
  const db = yield zhike.db.load('db/social', 'social', zhike.db.associate(path.resolve('./model')))
  const { WechatUser, WechatApplication } = db.models
  const user = yield WechatUser.findOne({
    raw: true,
    where: {
      id: 13
    },
    include: [
      {
        model: WechatApplication,
        as: 'wechatApplication',
        required: true,
      }
    ]
  })
  console.log(user)
  
  const ossConfig = yield zhike.consul('oss')
  console.log('config', ossConfig)

  const redisKeys = yield zhike.redis.keys('*')
  console.log('redisKeys', redisKeys)
})
```

**async/await style:**

```
const { components } = require('zignis-plugin-zhike')
const path = require('path')

const start = async function () {
  const zhike = await components()
  const db = await  zhike.db.load('db/social', 'social', zhike.db.associate(path.resolve('./model')))
  const { WechatUser, WechatApplication } = db.models
  const user = await  WechatUser.findOne({
    raw: true,
    where: {
      id: 13
    },
    include: [
      {
        model: WechatApplication,
        as: 'wechatApplication',
        required: true,
      }
    ]
  })
  console.log('user', user)

  const ossConfig = await zhike.consul('oss')
  console.log('config', ossConfig)

  const redisKeys = await zhike.redis.keys('*')
  console.log('redisKeys', redisKeys)
}

start()
```

很多项目其实已经有了自己的数据库机制的封装，所以不强求大家使用这个插件的机制，但是如果是在项目中写 `Zignis` 的项目相关的插件，就有两个选择，一个是把当前项目的初始化脚本导入获得项目环境，另一个就是使用本插件带来的基础设施，相比较而言，前者对项目的其他公共代码更友好，但对封装抽象的情况有要求，后者开箱即用，但很多业务逻辑可能需要重写一遍，正常情况下，建议综合考虑。
