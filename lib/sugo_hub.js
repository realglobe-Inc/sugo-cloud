/**
 * Hub server of SUGOS
 * @class SugoHub
 * @param {Object} [options] - Optional settings
 * @param {string|Object} [options.storage] -  Storage options
 * @param {string} [config.keys] - Koa keys
 * @param {Object} [options.endpoints] - Endpoint settings
 * @param {Object} [config.context] - Koa context prototype
 * @param {string} [config.public] - Public directories.
 * @param {Object} [options.socketIoOptions] - Option object of Socket.IO constructor
 * @param {Object} [options.localActors] - Local actor instances
 * @param {string|boolean} [options.logFile=false] - File name to save logs.
 * @see https://github.com/koajs/koa#readme
 * @see https://github.com/socketio/socket.io#readme
 */
'use strict'

const asleep = require('asleep')
const sgSocket = require('sg-socket')
const sgServer = require('sg-server')
const debug = require('debug')('sg:hub')
const {redisAdaptor, authAdaptor} = require('./adaptors')
const newStorage = require('./helpers/new_storage')
const ioInterceptor = require('./helpers/io_interceptor')

const {ActorConnector, CallerConnector, ObserverConnector} = require('./connectors')
const {ActorService, CallerService, ObserverService, InvocationService} = require('./services')
const {ActorEndpoint, CallerEndpoint} = require('./endpoints')

const {ReservedEvents} = require('sg-socket-constants')

const {CONNECTION} = ReservedEvents

const {HubUrls} = require('sugo-constants')
const {ACTOR_URL, CALLER_URL, OBSERVER_URL} = HubUrls
const hubLogger = require('./logging/hub_logger')
const {localMixin, clusterMixin} = require('./mixins')
const {unlessProduction} = require('asenv')

const DEFAULT_LOG_FILE = 'var/log/sugo-hub.log'
const DEFAULT_STORAGE = 'var/sugos/hub'

const SugoHubBase = [
  clusterMixin,
  localMixin
].reduce((Class, mixin) => mixin(Class), class Base {})

/** @lends sugoHub */
class SugoHub extends SugoHubBase {
  constructor (options = {}) {
    super()
    unlessProduction(() => {
      const {port} = options
      if (typeof port !== 'undefined') {
        throw new Error('[SUGO-Hub] `sugoHub({ port })` is no longer supported. Use `sugoHub({}).listen(port)` instead.')
      }
    })

    const {
      prefix = 'sugo-hub',
      interceptors,
      endpoints,
      middlewares,
      context,
      keys,
      setup,
      teardown,
      authenticate = false,
      socketIoOptions = {},
      logFile = DEFAULT_LOG_FILE,
      localActors = {},
      storage: storageConfig = DEFAULT_STORAGE
    } = options

    const logger = hubLogger(logFile)
    const storage = newStorage(storageConfig)

    const server = sgServer({
      endpoints,
      middlewares,
      context,
      keys,
      async setup () {
        await setup && setup()
      },
      async teardown () {
        await teardown && teardown()
      },
      static: options.static || options.public
    })

    const io = sgSocket(server, socketIoOptions)
    const actorIO = io.of(ACTOR_URL)
    const callerIO = io.of(CALLER_URL)
    const observerIO = io.of(OBSERVER_URL)

    if (storageConfig.redis) {
      const {url, host, port, requestsTimeout} = storageConfig.redis
      this.closeRedisAdaptor = redisAdaptor(io, {
        url, host, port, requestsTimeout, prefix
      })
    }

    if (authenticate) {
      authAdaptor(actorIO, {authenticate})
      authAdaptor(callerIO, {authenticate})
      authAdaptor(observerIO, {authenticate})
    }

    const actorService = new ActorService(storage)
    const callerService = new CallerService(storage)
    const observerService = new ObserverService(storage)
    const invocationService = new InvocationService(storage)

    const actorConnector = new ActorConnector({logger})
    const callerConnector = new CallerConnector({logger})
    const observerConnector = new ObserverConnector({logger})

    const scope = {
      actorService,
      callerService,
      observerService,
      invocationService,
      actorIO,
      callerIO,
      observerIO
    }

    const actorEndpoint = new ActorEndpoint(scope)
    const callerEndpoint = new CallerEndpoint(scope)

    server.addEndpoints({
      [ACTOR_URL]: {GET: actorEndpoint.list()},
      [CALLER_URL]: {GET: callerEndpoint.list()}
    })

    // Register interceptors
    for (const url of Object.keys(interceptors || {})) {
      const interceptor = ioInterceptor(...[].concat(interceptors[url] || []))
      io.of(url).use(interceptor)
    }

    // Handle SUGO-Actor connections
    actorIO.on(CONNECTION, (socket) => actorConnector.handleConnection(socket, scope))

    // Handle SUGO-Caller connections
    callerIO.on(CONNECTION, (socket) => callerConnector.handleConnection(socket, scope))

    // Handle SUGO-Observer connections
    observerIO.on(CONNECTION, (socket) => observerConnector.handleConnection(socket, scope))

    Object.assign(this, {
      io,
      logger,
      storage,
      server,
      actorService,
      callerService,
      localActors
    })
  }

  /**
   * Listen to port
   * @param {number} port
   * @param {function} [callback]
   * @returns {*}
   */
  async listen (port, callback) {
    debug('listen', {port})
    const {
      server,
      localActors
    } = this
    port = port || this.port
    this.listening = true
    this.port = port
    await server.listen(port)
    callback && callback()
    await this.connectLocalActors(localActors)
    return this
  }

  /**
   * Close hub
   * @returns {*}
   */
  async close () {
    debug('close')
    const {
      server,
      storage,
      localActors
    } = this
    this.listening = false
    await this.disconnectLocalActors(localActors)
    await server.close()
    if (this.closeRedisAdaptor) {
      await this.closeRedisAdaptor().catch(() => null)
    }
    await asleep(300) // Wait to flush
    await storage.quit()
    return this
  }
}

Object.assign(SugoHub, {
  newStorage,
  ACTOR_URL,
  CALLER_URL,
  OBSERVER_URL
})

module.exports = SugoHub
