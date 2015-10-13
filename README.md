# emitter-domain
Allows for improved domain error handling for emitters

## Domain EventEmitter Error Handling in Node
By default in node.js, EventEmitter errors are implicitely handled by the Domain in which the EventEmitter is created.

To handle EventEmitter errors in an alternate Domain it must be added explicitely using `domain.add`, but sometimes this isn't possible. This can make EventEmitter errors hard to trace:
##### EventEmitter Handler Error Example
```js
var Domain = require('domain')

var emitter
var domain1 = Domain.create()
domain1.on('error', handleCreateErr)
domain1.run(function () {
  emitter = createEmitter()
})

var domain2 = Domain.create()
domain2.on('error', handleEmitterErr)
domain2.run(function () {
  emitter.on('foo', function fooHandler () {
    throw new Error('boom') // gets handled by domain1
  })
  emitter.emit('foo')
})

function handleCreateErr (err) {
  console.error('error creating event emitter', err.stack)
}
function handleEmitterErr (err) {
  console.error('error using event emitter', err.stack)
}
```
Above, the error in `fooHandler` gets handled by `domain1` and `handleCreateErr`.
##### EventEmitter Emit Error Example
```js
var Domain = require('domain')

var emitter
var domain1 = Domain.create()
domain1.on('error', handleCreateErr)
domain1.run(function () {
  emitter = createEmitter()
})

var domain2 = Domain.create()
domain2.on('error', handleEmitterErr)
domain2.run(function () {
  emitter.emit('error', new Error('boom')) // get handled by domain1
})

function handleCreateErr (err) {
  console.error('error creating event emitter', err.stack)
}
function handleEmitterErr (err) {
  console.error('error using event emitter', err.stack)
}
```
Above, the error emitted gets handled by `domain1` and `handleCreateErr`.


## Examples using EmitterDomains
Any EventEmitters created w/in EmitterDomains emit errors more predictably.
##### EventEmitter Handler Error Example w/ EmitterDomain
```js
var EmitterDomain = require('emitter-domain')
var Domain = require('domain')

var emitter
var domain1 = EmitterDomain.create()
domain1.on('error', handleCreateErr)
domain1.run(function () {
  emitter = createEmitter()
})

var domain2 = Domain.create()
domain2.on('error', handleEmitterErr)
domain2.run(function () {
  emitter.on('foo', function fooHandler () {
    throw new Error('boom') // gets handled by domain2 !
  })
  emitter.emit('foo')
})

function handleCreateErr (err) {
  console.error('error creating event emitter', err.stack)
}
function handleEmitterErr (err) {
  console.error('error using event emitter', err.stack)
}
```
Above, the error in `fooHandler` gets handled by `domain2` and `handleEmitterErr`!
##### EventEmitter Emit Error Example w/ EmitterDomain
```js
var EmitterDomain = require('emitter-domain')
var Domain = require('domain')

var emitter
var domain1 = Domain.create()
domain1.on('error', handleCreateErr)
domain1.run(function () {
  emitter = createEmitter()
})

var domain2 = Domain.create()
domain2.on('error', handleEmitterErr)
domain2.run(function () {
  emitter.emit('error', new Error('boom')) // get handled by domain2 !
})

function handleCreateErr (err) {
  console.error('error creating event emitter', err.stack)
}
function handleEmitterErr (err) {
  console.error('error using event emitter', err.stack)
}
```
Above, the error emitted gets handled by `domain2` and `handleEmitterErr`!

## TLDR;

As event emitters are used throughout an application, it can be hard to handle their errors with domains. EmitterDomains make event emitter errors bubble to domains wrapping the currently executing code.

## License
MIT