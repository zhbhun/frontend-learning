// 源代码
/*
class Counter {
  #x = 0;

  #increment() {
    this.#x++;
  }

  onClick() {
    this.#increment();
  }
}

const c = new Counter();
c.onClick(); // 正常
// c.#increment(); // Unexpected character '#'
*/

// babel
function _classPrivateMethodGet(receiver, privateSet, fn) {
  if (!privateSet.has(receiver)) {
    throw new TypeError("attempted to get private field on non-instance");
  }
  return fn;
}

function _classPrivateFieldSet(receiver, privateMap, value) {
  var descriptor = privateMap.get(receiver);
  if (!descriptor) {
    throw new TypeError("attempted to set private field on non-instance");
  }
  if (descriptor.set) {
    descriptor.set.call(receiver, value);
  } else {
    if (!descriptor.writable) {
      throw new TypeError("attempted to set read only private field");
    }
    descriptor.value = value;
  }
  return value;
}

function _classPrivateFieldGet(receiver, privateMap) {
  var descriptor = privateMap.get(receiver);
  if (!descriptor) {
    throw new TypeError("attempted to get private field on non-instance");
  }
  if (descriptor.get) {
    return descriptor.get.call(receiver);
  }
  return descriptor.value;
}

class Counter {
  constructor() {
    _increment.add(this);

    _x.set(this, {
      writable: true,
      value: 0
    });
  }

  onClick() {
    _classPrivateMethodGet(this, _increment, _increment2).call(this);
  }
}

var _x = new WeakMap();

var _increment = new WeakSet();

var _increment2 = function _increment2() {
  var _this$x;

  _classPrivateFieldSet(
    this,
    _x,
    (_this$x = +_classPrivateFieldGet(this, _x)) + 1
  ),
    _this$x;
};

const c = new Counter();
c.onClick(); // 正常
// c.#increment(); // Unexpected character '#'
