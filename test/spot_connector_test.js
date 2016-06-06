/**
 * Test case for spotConnector.
 * Runs with mocha.
 */
'use strict'

const SpotConnector = require('../lib/connectors/spot_connector.js')
const assert = require('assert')
const co = require('co')

describe('spot-connector', () => {
  before(() => co(function * () {

  }))

  after(() => co(function * () {

  }))

  it('Spot connector', () => co(function * () {
    assert.ok(SpotConnector)
  }))
})

/* global describe, before, after, it */
