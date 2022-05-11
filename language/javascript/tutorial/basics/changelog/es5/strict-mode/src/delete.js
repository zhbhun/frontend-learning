// 不能删除变量 delete prop，会报错，只能删除属性 delete global[prop] - SyntaxError
// 不能删除不可删除的属性，否则报错 - TypeError
(function() {
  var statement = `
    console.log(delete alert);
    var a = {};
    Object.defineProperty(a, "b", { writable: false, confurable: false, value: 1})
    console.log(delete a.b);
  `;

  (function () {
    // false
    // false
    eval(statement);
  })();

  (function () {
    'use strict';
    // Uncaught SyntaxError: Delete of an unqualified identifier in strict mode.
    // Uncaught TypeError: Cannot delete property 'b' of #<Object>
    eval(statement);
  })();
})();
