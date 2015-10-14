var Domain = require('domain')
var DomainClass = Domain.Domain
var EventEmitter = require('events').EventEmitter
var isFunction = require('101/is-function')
var pluck = require('101/pluck')
var wrap = require('./lib/create-wrap.js')
var Wrap = wrap.Wrap
require('set-prototype-of')
var isEmitterDomain = function (o) {
  return o instanceof EmitterDomain
}

module.exports = EmitterDomain

function EmitterDomain () {
  EmitterDomain.wrapEventEmitterMethods()
  DomainClass.apply(this, arguments)
}

require('util').inherits(EmitterDomain, DomainClass)

EmitterDomain.create = 
  EmitterDomain.createDomain = 
    function () {
      return new EmitterDomain()
    }

EmitterDomain.wrapEventEmitterMethods = function () {
  var onAlreadyWrapped = EventEmitter.prototype.on instanceof Wrap

  if (!onAlreadyWrapped) {
    wrap(EventEmitter.prototype, 'on', function (on, args) {
      // `this` is the event emitter instance
      var listener = args[1]
      if (!isEmitterDomain(this.domain) || !isFunction(listener)) {
        return on.apply(this, args) // default behavior
      }
      listener.__boundEmitterDomain = Domain.active
        ? Domain.active.bind(listener) // create domain bound listener to be used in emit
        : listener

      return on.apply(this, args)
    })
    EventEmitter.prototype.addListener = EventEmitter.prototype.on
  }

  var emitAlreadyWrapped = EventEmitter.prototype.emit instanceof Wrap

  if (!emitAlreadyWrapped) {
    wrap(EventEmitter.prototype, 'emit', function (emit, args) {
      var ctx = this
      var eventType = args[0]
      // `this` is the event emitter instance
      if (isEmitterDomain(this.domain)) {
        ctx = createCtxForEmit(this, eventType)
      }

      return emit.apply(ctx, args)
    })
  }
}
function createCtxForEmit (emitter, type) {
  // use active domain in place of emitter domain
  var ctx = {
    domain: Domain.active
  }
  Object.setPrototypeOf(ctx, emitter)
  // no need to copy events if there aren't any handlers for the event
  if (EventEmitter.listenerCount(emitter, type)) {
    // use domain bound handlers in place of handlers
    var _events = ctx._events = {}
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

  return ctx
}

EmitterDomain.restoreEventEmitterMethods = function () {
  if (EventEmitter.prototype.on instanceof Wrap) {
    EventEmitter.prototype.addListener =
      EventEmitter.prototype.on.restore()
  }
  if (EventEmitter.prototype.emit instanceof Wrap) {
    EventEmitter.prototype.emit.restore()
  }
}
