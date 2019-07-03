import { Utils } from 'zignis'
import axios from 'axios'
import querystring from 'querystring'

const api = function(service: string) {
  const debug = Utils.debug(service)
  const API = axios.create({ headers: { 'x-service': service } })
  API.interceptors.request.use(
    function(config) {
      // Log API request info
      if (config.params) {
        debug('调用服务：', `${Utils._.upperCase(config.method)} ${config.url}?${querystring.stringify(config.params)}`)
      } else {
        debug('调用服务：', `${Utils._.upperCase(config.method)} ${config.url}`)
      }
      if (config.data) {
        debug('调用服务参数：', config.data)
      }
      return config
    },
    function(error) {
      // Do something with request error
      return Promise.reject(error)
    }
  )
  API.interceptors.response.use(function(response) {
    debug('调用服务返回：', response.data)
    let ret = response.data
    if (/^application\/json/i.test(response.headers['content-type'])) {
      if (typeof response.data.code === 'undefined') {
        ret = response.data // not standard zhike api
      } else if (response.data.code === 0) {
        ret = response.data.data // unwrap data
      } else {
        ret = Promise.reject(response.data) // code !== 0 视作失败
      }
    }

    return ret
  })

  return API
}

export = api
