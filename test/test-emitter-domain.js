var Domain = require('domain')
var DomainClass = Domain.Domain
var EventEmitter = require('events').EventEmitter

var Lab = require('lab')
var expect = require('code').expect
var sinon = require('sinon')
var noop = require('101/noop')

var Wrap = require('../lib/create-wrap.js').Wrap

var lab = exports.lab = Lab.script()
var describe = lab.describe
var beforeEach = lab.beforeEach
var afterEach = lab.afterEach
var it = lab.it
// require('longjohn')

var EmitterDomain = require('../index.js')

describe('emitter-domain', function () {
  var ctx
  beforeEach(function (done) {
    ctx = {}
    done()
  })

  describe('EmitterDomain', function () {
    afterEach(function (done) {
      EmitterDomain.restoreEventEmitterMethods()
      done()
    })

    describe('create', function () {
      beforeEach(function (done) {
        sinon.stub(EmitterDomain, 'wrapEventEmitterMethods')
        done()
      })
      afterEach(function (done) {
        EmitterDomain.wrapEventEmitterMethods.restore()
        done()
      })

      it('should create an EmitterDomain instance', function (done) {
        var domain = EmitterDomain.create()
        expect(domain).to.be.an.instanceOf(EmitterDomain)
        expect(domain).to.be.an.instanceOf(DomainClass)
        sinon.assert.calledOnce(EmitterDomain.wrapEventEmitterMethods)
        done()
      })
    })

    describe('wrapEventEmitterMethods', function () {
      it('should wrap event emitter methods: on and emit', function (done) {
        EmitterDomain.wrapEventEmitterMethods()
        expect(EventEmitter.prototype.on).to.be.an.instanceof(Wrap)
        expect(EventEmitter.prototype.addListener).to.be.an.instanceof(Wrap)
        expect(EventEmitter.prototype.emit).to.be.an.instanceof(Wrap)
        expect(EventEmitter.prototype.on).to.equal(EventEmitter.prototype.addListener)
        done()
      })

      describe('invoke twice', function () {
        beforeEach(function (done) {
          EmitterDomain.wrapEventEmitterMethods()
          ctx.on = EventEmitter.prototype.on
          ctx.emit = EventEmitter.prototype.emit
          done()
        })

        it('should not wrap twice', function (done) {
          EmitterDomain.wrapEventEmitterMethods()
          expect(EventEmitter.prototype.on).to.equal(ctx.on)
          expect(EventEmitter.prototype.addListener).to.equal(ctx.on)
          expect(EventEmitter.prototype.emit).to.equal(ctx.emit)
          done()
        })
      })
    })

    describe('restoreEventEmitterMethods', function () {
      beforeEach(function (done) {
        ctx.on = EventEmitter.prototype.on
        ctx.emit = EventEmitter.prototype.emit
        EmitterDomain.wrapEventEmitterMethods()
        done()
      })

      it('should restore original methods', function (done) {
        EmitterDomain.restoreEventEmitterMethods()
        expect(EventEmitter.prototype.on).to.equal(ctx.on)
        expect(EventEmitter.prototype.addListener).to.equal(ctx.on)
        expect(EventEmitter.prototype.emit).to.equal(ctx.emit)
        done()
      })

      describe('invoke twice', function () {
        beforeEach(function (done) {
          EmitterDomain.restoreEventEmitterMethods()
          done()
        })

        it('should not restore twice', function (done) {
          EmitterDomain.restoreEventEmitterMethods()
          expect(EventEmitter.prototype.on).to.equal(ctx.on)
          expect(EventEmitter.prototype.addListener).to.equal(ctx.on)
          expect(EventEmitter.prototype.emit).to.equal(ctx.emit)
          done()
        })
      })
    })

    describe('wrapped event emitter emit', function () {
      it('should emit unhandled `error` event in the active domain ( not init domain)', function (done) {
        var initDomain = EmitterDomain.create()
        var emitter
        initDomain.run(function () {
          // initialize emitter w/in initDomain
          emitter = new EventEmitter()
        })
        // other domain
        var activeDomain = Domain.create()
        var err = new Error('boom')
        activeDomain.on('error', handleErr)
        activeDomain.run(function () {
          emitter.emit('error', err)
        })
        function handleErr (er) {
          expect(er).to.equal(err)
          done()
        }
      })
    })

    describe('wrapped event emitter on', function () {
      it('should bind handlers to the active domain when they were bound', function (done) {
        var initDomain = EmitterDomain.create()
        var emitter
        initDomain.run(function () {
          // initialize emitter w/in initDomain
          emitter = new EventEmitter()
        })
        var err = new Error('boom')
        var bindDomain = Domain.create()
        bindDomain.id = 'bind'
        bindDomain.on('error', handleHandlerErr)
        bindDomain.run(function () {
          emitter.on('something', function () {
            throw err
          })
        })
        // other domain
        var emitDomain = Domain.create()
        emitDomain.run(function () {
          emitter.emit('something')
        })
        function handleHandlerErr (er) {
          expect(er).to.equal(err)
          done()
        }
      })
      it('should handle many handlers', function (done) {
        var initDomain = EmitterDomain.create()
        var emitter
        initDomain.run(function () {
          // initialize emitter w/in initDomain
          emitter = new EventEmitter()
        })
        var err = new Error('boom')
        var bindDomain = Domain.create()
        bindDomain.id = 'bind'
        bindDomain.on('error', handleHandlerErr)
        bindDomain.run(function () {
          emitter.on('manyhandlers', noop)
          emitter.on('manyhandlers', function () {
            throw err
          })
        })
        // other domain
        var emitDomain = Domain.create()
        emitDomain.run(function () {
          emitter.emit('manyhandlers')
        })
        function handleHandlerErr (er) {
          expect(er).to.equal(err)
          done()
        }
      })
      it('should handle no handlers', function (done) {
        var initDomain = EmitterDomain.create()
        var emitter
        initDomain.run(function () {
          // initialize emitter w/in initDomain
          emitter = new EventEmitter()
        })
        // other domain
        var emitDomain = Domain.create()
        emitDomain.run(function () {
          emitter.emit('nohandlers')
        })
        done()
      })
      it('no active domain', function (done) {
        var initDomain = EmitterDomain.create()
        var emitter
        initDomain.run(function () {
          // initialize emitter w/in initDomain
          emitter = new EventEmitter()
        })
        // Exit all domains
        var domains = []
        while (Domain.active) {
          domains.push(Domain.active)
          Domain.active.exit()
        }
        // No domains
        emitter.on('hello', function () {
          expect(Domain.active).to.be.undefined()
          done()
        })
        emitter.emit('hello')
        // ReEnter all domains
        domains.forEach(function (domain) {
          domain.enter()
        })
      })
    })

    describe('complex emit and on calls', function () {
      it('should work through emits and ons and not propagate a bound emitter as the context', function (done) {
        var initDomain = EmitterDomain.create()
        var emitter
        initDomain.run(function () {
          // initialize emitter w/in initDomain
          emitter = new EventEmitter()
        })
        var emitDomain = Domain.create()
        emitDomain.title = 1
        emitDomain.run(function () {
          emitter.on('one', function () {
            expect(Domain.active).to.equal(emitDomain)
            this.emit('two')
          })
        })
        var emitDomain2 = Domain.create()
        emitDomain2.title = 2
        emitDomain2.run(function () {
          emitter.on('two', function () {
            expect(Domain.active).to.equal(emitDomain2)
            done()
          })
        })
        emitter.emit('one')
      })
    })
  })

  describe('restore', function () {})
})
