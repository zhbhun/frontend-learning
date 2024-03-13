"use strict";

/* Block-scoped variables (and constants) without hoisting. */
for (var i = 0; i < a.length; i++) {
  var x = a[i];
}

for (var _i = 0; _i < b.length; _i++) {
  var y = b[_i];
}

var callbacks = [];

var _loop = function _loop(_i2) {
  callbacks[_i2] = function () {
    return _i2 * 2;
  };
};

for (var _i2 = 0; _i2 <= 2; _i2++) {
  _loop(_i2);
}

callbacks[0]() === 0;
callbacks[1]() === 2;
callbacks[2]() === 4;
/* Block-scoped function definitions. */

{
  var foo = function foo() {
    return 1;
  };

  foo() === 1;
  {
    var _foo = function _foo() {
      return 2;
    };

    _foo() === 2;
  }
  foo() === 1;
}