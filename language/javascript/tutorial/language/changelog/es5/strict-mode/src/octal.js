// 不能使用前缀 0 表示八进制数，否则报错
(function() {
  var statement = `
    console.log(010);
  `;

  (function () {
    // 8
    eval(statement);
  })();

  (function () {
    'use strict';
    // Uncaught SyntaxError: Octal literals are not allowed in strict mode.
    eval(statement);
  })();
})();
