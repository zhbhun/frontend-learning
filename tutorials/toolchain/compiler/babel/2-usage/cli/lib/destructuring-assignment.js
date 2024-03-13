"use strict";

require("core-js/modules/es7.symbol.async-iterator");

require("core-js/modules/es6.symbol");

require("core-js/modules/web.dom.iterable");

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

function _iterableToArrayLimit(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

/* Intuitive and flexible destructuring of Arrays into individual variables during assignment.
 */
var list = [1, 2, 3];

var _list = list[(b, a)] = [a, b],
    _list2 = _slicedToArray(_list, 3),
    a = _list2[0],
    b = _list2[2];
/* Intuitive and flexible destructuring of Objects into individual variables during assignment.
 */


var _getASTNode = getASTNode(),
    op = _getASTNode.op,
    lhs = _getASTNode.lhs,
    rhs = _getASTNode.rhs;
/* Intuitive and flexible destructuring of Objects into individual variables during assignment.
 */


var _getASTNode2 = getASTNode(),
    a = _getASTNode2.op,
    b = _getASTNode2.lhs.op,
    c = _getASTNode2.rhs;
/* Simple and intuitive default values for destructuring of Objects and Arrays.
 */


var obj = {
  a: 1
};
var list = [1];
var a = obj.a,
    _obj$b = obj.b,
    b = _obj$b === void 0 ? 2 : _obj$b;

var _list3 = list,
    _list4 = _slicedToArray(_list3, 2),
    x = _list4[0],
    _list4$ = _list4[1],
    y = _list4$ === void 0 ? 2 : _list4$;
/* Intuitive and flexible destructuring of Arrays and Objects into individual parameters during function calls.
 */


function f(_ref) {
  var _ref2 = _slicedToArray(_ref, 2),
      name = _ref2[0],
      val = _ref2[1];

  console.log(name, val);
}

function g(_ref3) {
  var n = _ref3.name,
      v = _ref3.val;
  console.log(n, v);
}

function h(_ref4) {
  var name = _ref4.name,
      val = _ref4.val;
  console.log(name, val);
}

f(['bar', 42]);
g({
  name: 'foo',
  val: 7
});
h({
  name: 'bar',
  val: 42
});
/* Fail-soft destructuring, optionally with defaults.
 */

var list = [7, 42];

var _list5 = list,
    _list6 = _slicedToArray(_list5, 4),
    _list6$ = _list6[0],
    a = _list6$ === void 0 ? 1 : _list6$,
    _list6$2 = _list6[1],
    b = _list6$2 === void 0 ? 2 : _list6$2,
    _list6$3 = _list6[2],
    c = _list6$3 === void 0 ? 3 : _list6$3,
    d = _list6[3];

a === 7;
b === 42;
c === 3;
d === undefined;