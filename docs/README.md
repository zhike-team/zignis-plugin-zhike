# 开发目的

`zignis-plugin-zhike` 是一个基于 `Zignis` 扩展机制开发的插件，开发这个插件的目的是能把整个智课技术架构常用的基础设施都接入进来，只要是基于智课技术开发的项目，大部分功能都是可用的。基于 `Zignis` 的扩展性，在技术栈有更新时，可以继续完善此插件；在不方面放入此插件时，可以在这个插件的基础上开发新的插件进行扩展。

# 命令列表

```
zignis zhike

Zhike related commands

命令：
  zignis zhike consul [keys..]          zhike consul config review                                     [aliases: config]
  zignis zhike cron [job]               zhike cron system
  zignis zhike db <op>                  zhike db tools                                               [aliases: database]
  zignis zhike k8s <op> [keyword]       zhike k8s tools                                               [aliases: kubectl]
  zignis zhike login <userId>           way to login zhike, <userId> could be user id, phone number or email
  zignis zhike order <orderId>          get zhike order info
  zignis zhike pid <pid>                zhike pid info
  zignis zhike product <productId>      get zhike product info
  zignis zhike redis cmd [arguments..]  zhike redis tools                                               [aliases: cache]
  zignis zhike slice <keyword>          get zhike slice info
  zignis zhike oss                      zhike oss tools
```

# 命令说明

**zignis zhike consul**

`consul` 命令的用处是随时查看公司 Consul 里集中管理的配置。可以在后面同时获取多个 key。在获取配置的时候 `.` 的作用是分层获取配置。比如 `oss` Key 层级下有个 `prefix` 那么在用命令获取时，只要使用 `oss.prefix` 即可取出这个信息。

另外，需要注意的是 `/` 没有任何其他用途，可以直接参与 key 的命名，而且公司一部分 key 就是这样命名的。

所有和 `consul` 配置相关的命令或者钩子扩展都是能够自动识别环境的，因为是基于 `NODE_ENV` 环境变量进行判断的。

**zignis zhike k8s**

`k8s` 命令的用处是封装了几个常用的 `kubectl` 命令，并且能够兼容开发和线上两个环境。k8s 命令有两个依赖，一个是需要用户本地安装了 `kubectl` 二进制命令；另一个是设置好授权配置文件，需要在 `.bashrc` 或 `.zshrc` 等系统用户配置文件中设置两个全局常量，ZIGNIS_ZHIKE_K8S_DEV 和 ZIGNIS_ZHIKE_K8S_PROD，需要配置的是绝对路径。

```
k8s list|ls|pods [keyword] 查看 pod 列表，keyword关键字可以缩小列表范围，keyword 前面加上 `~` 可以进行模糊搜索，后面的命令也有这个特点
k8s bash|exec|rsh [keyword] 用 bash 登录到容器中，如果筛选结果只有一个 pod，可以直接进入，如果有多个，则需要选择。
k8s logs|log [keyword] 用于显示 pod 日志，可以在 keyword 筛选结果里再次进行多选，集合多个 pod 的日志一起事实查看日志。
```

命令有一个选项 --namespace|-n，用于指定选择的 k8s 命名空间，默认是 c-dev，公司的线上环境的命名空间是 c-production。

**zignis zhike redis**

redis 命令用于获取公司 redis 服务里的缓存数据，也可以执行其他简单的 redis 命令，基于 ioredis 开发，所以里面包含的所有方法都可以试试，但是复杂的命令由于受到命令行的限制，无法有效输入。此命令有个选项是 `--json`，当 Redis 里的值是 JSON 数据的时候，可以被 parse 从而格式化显示。

**zignis zhike login**

login 命令用于提供一种让开发人员能够快速登录指定用户的方法，目前可以用于登录智课网，Smart 学习系统，选校帝，批改网

**zignis zhike order**

order 命令用于查看订单相关的信息，包括订单信息，商品信息，折扣信息，支付信息等

**zignis zhike product**

product 命令用于查看商品 参数是商品 ID，可以查看各种商品类型

**zignis zhike slice**

slice 命令用于查看智课视频切片相关信息

**zignis zhike pid**

pid 命令用于查看 Zhike pid 的详细信息

**zignis zhike oss**

oss 命令用于操作 oss，实现了上传，下载和列表等功能

**zignis zhike cron**

cron 命令用于执行项目的计划任务，具体的计划任务是以 node 模块的形式存在的，计划任务存放目录在项目的 `.zignisrc.json` 文件中声明 `cronDir`，目录必须存在。计划任务文件格式如下：

```
// 任务执行周期，基于 `node-cron` npm 包
exports.schedule = '* * * * *'
// 任务最大执行时间，单位ms，也是任务的锁定时间，在锁定时间内，多实例部署也不会并发执行。要保证设置与任务执行周期相符，比如每分钟执行一次，一次最大执行60s
exports.duration = 60000
// 计划任务子任务数组，里面每一项可以是函数，也可以是 shell 命令字符串，要保证所有子任务在上面的执行时间内完成
exports.actions = [demoAction]
// 临时禁用计划任务，而不用删除文件，默认不写，意思是启用
exports.disabled = true
```

以上计划任务文件可以不用手动创建，使用 `zignis make cron [name]` 即可自动创建基本的计划任务文件模板

另外，我们有时可能想用 pm2 启动计划任务，以便可以进行线上部署，可以按如下的方式操作：

```
// package.json
"scripts": {
  "cron": "zignis zhike cron",
},
```

```
// pm2.yml
apps:
  - script: npm
    args: 'run cron'
    name: cron
    exec_mode: fork
    watch: true
    ignore_watch: ['node_modules', '.git']
    env:
      NODE_ENV: development
      DEBUG: zignis-*
      DEBUG_HIDE_DATE: true
      DEBUG_COLORS: true
      DEBUG_DEPTH: 2
```

然后我们就可以通过 pm2 启动计划任务了：

```
$ pm2 start pm2.yml
```

**zignis zhike db**

db 命令提供了几个和数据库相关的子命令，提供了一些常用的功能：

```
db list|ls <dbKey> 列出某一个数据库所有的表名
db describe|desc <dbKey> <tableName> 显示某个数据库中的某个表的字段结构定义
db generate|gen|create <dbKey> <tableName> [fieldName] 可以自动生成基本的migration文件结构
db query <dbKey> <sql> 执行 SELECT SQL 语句
```

db migration 子命令的选项比较多，所以这里要列一下：

```
zignis zhike db generate <dbKey> <tableName> [fieldName]

db migrate tool

选项：
  --attributes               define attributes for table/field   [默认值: false]
  --rename                   rename table/field name             [默认值: false]
  --modify                   modify field defination             [默认值: false]
  --only-up                  empty down process                  [默认值: false]
  --simulate                 only output in stdout               [默认值: false]
  --reverse                  reverse up and down                 [默认值: false]
  --migration-dir            change migration dir                [默认值: false]
  --file-suffix                migration file suffix name, override the auto generated name                      [默认值: false]
  --index                    add index                           [默认值: false]
  --typescript, --ts         typescript format migration file    [默认值: false]
```

可能的 attributes 写法:

- first_name:string,last_name:string,bio:text,reviews:array:string
- 'first_name:string last_name:string bio:text reviews:array:string'
- 'first_name:string, last_name:string, bio:text, reviews:array:string'

# 钩子机制

## 定义的钩子

### `zhike_cron` 

可以为项目的所有计划任务脚本进行初始化，如果初始化资源不是通过全局变量传递的，这个钩子的返回值将传给每一个计划任务脚本

```
/**
  * hook:zhike_cron
  * 为计划任务进行统一初始化
  */
  async zhike_cron () {
    await init()
  }
```

## 实现的钩子

### 实现了核心的 `repl` 钩子

`Node.js` 内置的 `node` 命令的 `REPL` 里可以用来尝试一些基本的 node 和 javascript 的用法，但是这还远远不够，我们希望 REPL 可以对项目开发有帮助，可以操作公司技术架构的各种基础设施。

本插件通过 `Zignis` 的 repl 钩子，为 REPL 注入了一个 `zhike` 对象，通过操作这个对象，可以实现与命令行相同的功能，甚至更加强大。对于异步操作同时支持 `await` 和 `yield` 两种触发方式。下面以 `await` 为例，简单介绍一下：

```
$ zignis repl
>>> await zhike.consul.get('oss')
>>> await zhike.redis.keys('*')
>>> await zhike.redis.get('REDIS_KEY')
>>> await zhike.db.load('db/social', 'social')
>>> let { WechatUser } = zhike.db.instances.social.models
>>> await WechatUser.count()
```

其中 zhike.db 的用法是专门针对公司的关系型数据库集群，基于 `Sequelize` 进行的封装，不需要自定义或者同步 schema，直接就可以使用，支持 mysql 和 postgres 两个数据库引擎，有过还有其他引擎，也可以基于 `Sequelize` 来进行扩展。

### 实现了核心的 `components` 钩子

为插件开发和项目开发提供支持，主要使用的是通过 components 暴露出来的对 配置服务，缓存和数据库的封装，可以在开发时直接操作数据库，不需要写太多和数据库初始化相关的逻辑。以下的代码演示了基本的使用方法。

**yield/co style:**

```
const co = require('co')
const path = require('path')

const { components } = require('zignis-plugin-zhike')
co(function* () {
  const zhike = yield components()
  const db = yield zhike.db.load('db/social', 'social', path.resolve('./model'))
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

  const ossConfig = yield zhike.consul.get('oss')
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

  const ossConfig = await zhike.consul.get('oss')
  console.log('config', ossConfig)

  const redisKeys = await zhike.redis.keys('*')
  console.log('redisKeys', redisKeys)
}

start()
```

很多项目其实已经有了自己的数据库机制的封装，所以不强求大家使用这个插件的机制，但是如果是在项目中写 `Zignis` 的项目相关的插件，就有两个选择，一个是把当前项目的初始化脚本导入获得项目环境，另一个就是使用本插件带来的基础设施，相比较而言，前者对项目的其他公共代码更友好，但对封装抽象的情况有要求，后者开箱即用，但很多业务逻辑可能需要重写一遍，正常情况下，建议综合考虑。

可以观察到，上面的示例代码中的 `zhike.db.load` 函数有三个参数，第一个是数据库命名空间，第二个是数据库别名，第三个是数据库表关联关系的声明，这个表关联关系的声明文件是经过抽象的，目的是让文件尽量简洁和可扩展：

```
// Profill.js
module.exports = function({ Account }) {
  this.belongsTo(Account, {as: 'Account', constraints: false, foreignKey: 'accountId'})
}
```

可以看到，这里声明文件非常简洁，模块对外暴露的是一个函数方法，接受了一个数据库模型对象，从里面可以解构出数据库里所有的模型，模型的名字是大写首字母且不包含表前缀的，函数体内部的 `this` 代表模型本身，表关联用的是 `Sequelize` 的语法，除了创建表关联，还可以在里面为模型添加类方法和实例方法。让模型扩展和关联生效我们需要将模型所在目录传给 `db.load` 方法的第三个参数，由于是在另一个模块文件中进行的处理，所以这里必须传入模型所在目录的绝对路径。

# 插件配置

## 默认配置

可以在 `$HOME/.zignis/.zignisrc.json` 文件中进行以下默认配置

```
{
    "commandDefault": {
        "zhike": {
          "k8s": {
            "namespace": "c-production", # 默认使用的 k8s 命名空间
            "binary": "/usr/local/bin/kubectl" # 默认使用的 kubectl 命令的绝对路径
          }
        }
    }
}
```

## 项目配置

项目根目录的配置一般可以有以下几项：

```
// 项目根目录的 .zignisrc.json
commandDir: 'bin/zignis/commands', // 命令目录
pluginDir: 'bin/zignis/plugins', // 插件目录
extendDir: 'bin/zignis/extends', // 插件扩展目录
scriptDir: 'bin/zignis/scripts', // 脚本目录
cronDir: 'bin/zignis/crons',  // 计划任务目录
migrationDir: 'bin/zignis/migrations' // 数据库迁移文件目录，大多数项目是有自己指定的目录的
```

可以通过 `zignis init` 进行初始化，不限于自动生成的几项，也可以根据项目需要添加新的配置项。
