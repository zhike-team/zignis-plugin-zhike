# zignis-plugin-zhike

It's a plugin of Zignis for Zhike(SmartStudy). It includes the integrations of our technical infrastructions, and commands to do the quite often jobs, tools to extend more. At the same time, it's a good example to show how to develop a Zignis plugin.

**It's customized for just company Zhike internal use, it can not be used elsewhere.**

## Features

- Easy to use commands.
- Register a `zhike` object to REPL, it has `zhike.db`, `zhike.redis`, `zhike.consul` to use.
- As a package, it can be used in any projects, give abilities to access db, redis and consul.

## Installation & Usage

```
$ npm i zignis-plugin-zhike
$ zignis zhike help

大声直接的说出你的观点，哪怕它是错的。 -- 智课十诫

zignis zhike

zhike related commands

命令：
  zignis zhike consul [keys..]          zhike consul config review [aliases: config]
  zignis zhike cron [job]               zhike cron system
  zignis zhike db <op>                  zhike db tools       [aliases: database]
  zignis zhike k8s <op> [keyword]       zhike k8s tools       [aliases: kubectl]
  zignis zhike login <userId>           way to login zhike, <userId> could be user id, phone number or email
  zignis zhike order <orderId>          get zhike order info
  zignis zhike pid <pid>                zhike pid info
  zignis zhike product <productId>      get zhike product info
  zignis zhike redis cmd [arguments..]  zhike redis tools       [aliases: cache]
  zignis zhike slice <keyword>          get zhike slice info
  zignis zhike word [word]              personal word test
```