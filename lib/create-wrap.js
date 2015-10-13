require('set-prototype-of')

module.exports = createWrap
module.exports.Wrap = Wrap

function createWrap (obj, path, proxy) {
  function wrap () {
    return proxy.call(this, wrap.fn, arguments)
  }
  Object.setPrototypeOf(wrap, new Wrap(obj, path))
  obj[path] = wrap
  return wrap
}

function Wrap (obj, path) {
  this.obj = obj
  this.path = path
  this.fn = obj[path]
}

require('util').inherits(Wrap, Function)

Wrap.prototype.restore = function () {
  this.obj[this.path] = this.fn
  return this.fn
}
