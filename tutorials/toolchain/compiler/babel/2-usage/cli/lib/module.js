"use strict";

require("core-js/modules/es6.object.keys");

require("core-js/modules/web.dom.iterable");

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _exportNames = {
  sum: true,
  pi: true,
  e: true
};
Object.defineProperty(exports, "sum", {
  enumerable: true,
  get: function get() {
    return math.sum;
  }
});
Object.defineProperty(exports, "pi", {
  enumerable: true,
  get: function get() {
    return math.pi;
  }
});
Object.defineProperty(exports, "e", {
  enumerable: true,
  get: function get() {
    return _mathplusplus.e;
  }
});
exports.default = void 0;

var math = _interopRequireWildcard(require("lib/math"));

Object.keys(math).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return math[key];
    }
  });
});

var _mathplusplus = _interopRequireWildcard(require("lib/mathplusplus"));

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

/* Support for exporting/importing values from/to modules without global namespace pollution.
 */
//  lib/math.js
function sum(x, y) {
  return x + y;
}

var pi = 3.141593; //  someApp.js

console.log('2π = ' + math.sum(math.pi, math.pi)); //  otherApp.js

console.log('2π = ' + (0, math.sum)(_mathplusplus.pi, _mathplusplus.pi));
/* Marking a value as the default exported value and mass-mixin of values.
 */
//  lib/mathplusplus.js

var e = 2.71828182846;

var _default = function _default(x) {
  return Math.exp(x);
}; //  someApp.js


exports.default = _default;
console.log('e^{π} = ' + (0, _mathplusplus.default)(_mathplusplus.pi));