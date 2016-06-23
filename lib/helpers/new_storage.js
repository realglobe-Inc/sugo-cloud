/**
 * Create a new storage
 * @param {Object|string} config - Storage config
 * @function newStorage
 */
'use strict'

const sgStorage = require('sg-storage')

/** @lends newStorage */
function newStorage (config) {
  if (config.redis) {
    return sgStorage.redis(config.redis)
  }
  console.warn(`
[sugo-cloud][warning] SHOULD USE REDIS SERVER.
By default, sugo-cloud uses json files to manage connections.
This is handy but may cause performance slow down on production. 
Please consider use redis options. (See https://github.com/realglobe-Inc/sugo-cloud#advanced-usage) 
`)
  return sgStorage(config)
}

module.exports = newStorage