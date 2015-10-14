var Domain = require('domain')
var EventEmitter = require('events').EventEmitter
var isFunction = require('101/is-function')
var pluck = require('101/pluck')
require('set-prototype-of')

module.exports = BoundEmitter

/*
 * BoundEmitters are used as the context of EventEmitter.prototype.emit
 * to use the active domain for emit and use domain-bound events handlers
 * without modifying the original event emitter
 */
function BoundEmitter (emitter, type) {
  // set the proto to be the emitter
  Object.setPrototypeOf(this, emitter)
  // specify a special property so we can determine instance of
  this.__boundEmitter = BoundEmitter
  // set domain to be the active domain
  this.domain = Domain.active
  // optimization: if there aren't any handlers for the event
  // there is no need to bind handlers to domains
  if (EventEmitter.listenerCount(emitter, type)) {
    // use domain bound handlers in place of handlers
    var _events = this._events = {}
    Object.setPrototypeOf(_events, emitter._events)
    var handlers = emitter._events[type]
    if (isFunction(handlers)) {
      // handlers is a single handler
      _events[type] = handlers.__boundEmitterDomain
    } else {
      // handlers is an array of handlers
      _events[type] = handlers.map(pluck('__boundEmitterDomain'))
    }
  }
}

BoundEmitter.isBoundEmitter = function (emitter) {
  return emitter.__boundEmitter === BoundEmitter
}

BoundEmitter.unbindIfBound = function (emitter) {
  return BoundEmitter.isBoundEmitter(emitter)
    ? BoundEmitter.unbind(emitter)
    : emitter
}

BoundEmitter.unbind = function (boundEmitter) {
  return Object.getPrototypeOf(boundEmitter) // the emitter is the proto of the emitContext
}
