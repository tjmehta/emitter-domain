var Domain = require('domain')
var DomainClass = Domain.Domain
var EventEmitter = require('events').EventEmitter
var isFunction = require('101/is-function')
var wrap = require('./lib/create-wrap.js')
var BoundEmitter = require('./lib/bound-emitter.js')
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
      // If this emit is invoked from a chain of events,
      // `this` could still be a BoundEmitter instead of
      // the emitter. Get the emitter if it is.
      var ctx = BoundEmitter.unbindIfBound(this)
      // `this` is the event emitter instance
      var listener = args[1]
      if (!isEmitterDomain(ctx.domain) || !isFunction(listener)) {
        return on.apply(ctx, args) // default behavior
      }
      // if active domain exists bind it to the listener
      // and save the bound function to use in emit
      listener.__boundEmitterDomain = Domain.active
        ? Domain.active.bind(listener) // create domain bound listener to be used in emit
        : listener

      return on.apply(ctx, args)
    })
    EventEmitter.prototype.addListener = EventEmitter.prototype.on
  }

  var emitAlreadyWrapped = EventEmitter.prototype.emit instanceof Wrap

  if (!emitAlreadyWrapped) {
    wrap(EventEmitter.prototype, 'emit', function (emit, args) {
      // If this emit is invoked from a chain of events,
      // `this` could still be a BoundEmitter instead of
      // the emitter. Get the emitter if it is.
      var ctx = BoundEmitter.unbindIfBound(this)
      var eventType = args[0]
      // `this` is the event emitter instance
      if (isEmitterDomain(ctx.domain)) {
        ctx = new BoundEmitter(ctx, eventType)
      }

      return emit.apply(ctx, args)
    })
  }
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
