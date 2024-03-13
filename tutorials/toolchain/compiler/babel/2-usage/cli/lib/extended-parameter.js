"use strict";

require("core-js/modules/es6.array.from");

require("core-js/modules/es6.regexp.to-string");

require("core-js/modules/es7.symbol.async-iterator");

require("core-js/modules/es6.symbol");

require("core-js/modules/web.dom.iterable");

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

/* Simple and intuitive default values for function parameters.
 */
function f(x) {
  var y = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 7;
  var z = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 42;
  return x + y + z;
}

f(1) === 50;
/* Aggregation of remaining arguments into single parameter of variadic functions. */

function f(x, y) {
  return (x + y) * (arguments.length <= 2 ? 0 : arguments.length - 2);
}

f(1, 2, 'hello', true, 7) === 9;
/* Spreading of elements of an iterable collection (like an array or even a string) into both literal elements and individual function parameters. */

var params = ['hello', true, 7];
var other = [1, 2].concat(params); // [ 1, 2, "hello", true, 7 ]

function f(x, y) {
  return (x + y) * (arguments.length <= 2 ? 0 : arguments.length - 2);
}

f.apply(void 0, [1, 2].concat(params)) === 9;
var str = 'foo';

var chars = _toConsumableArray(str); // [ "f", "o", "o" ]