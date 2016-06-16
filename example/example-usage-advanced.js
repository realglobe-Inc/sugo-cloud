#!/usr/bin/env node

/**
 * This is an example to setup cloud server with advanced options
 */

'use strict'

const sugoCloud = require('sugo-cloud')

const co = require('co')

co(function * () {
  let cloud = yield sugoCloud({
    port: 3000,
    // HTTP route handler
    routes: {
      '/api/user/:id': {
        'GET': (ctx) => { /* ... */ }
      }
    },
    // Custom koa middlewares
    middlewares: [
      co.wrap(function * customMiddleware (ctx, next) {
        /* ... */
        yield next()
      })
    ],
    // Using redis server as storage
    storage: {
      // Redis setup options (see https://github.com/NodeRedis/node_redis)
      redis: {
        host: '127.0.0.1',
        port: '6379',
        db: 1
      }
    }
  })

  console.log(`SUGO Cloud started at port: ${cloud}`)

  return cloud
}).catch((err) => console.error(err))
