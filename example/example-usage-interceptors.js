#!/usr/bin/env node

/**
 * This is an example to setup cloud server with interceptors
 */

'use strict'

const sugoHub = require('sugo-hub')
const { ACTOR_URL, CALLER_URL, OBSERVER_URL } = sugoHub

const co = require('co')

co(function * () {
  let cloud = yield sugoHub({
    port: 3000,
    storage: { /* ... */ },
    endpoints: { /* ... */ },
    // Interceptor for web socket connections
    interceptors: {
      [ACTOR_URL]: [],
      [CALLER_URL]: [],
      [OBSERVER_URL]: []
    },
    middlewares: [ /* ... */ ],
    static: [ /* ... */ ]
  })

  console.log(`SUGO Cloud started at port: ${cloud.port}`)
}).catch((err) => console.error(err))
