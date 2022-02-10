// 不能使用 with 语句
(function() {
  var statement = `
    with(document) {
      console.log(body);
    }
  `;

  (function () {
    // document.body
    eval(statement);
  })();

  (function () {
    'use strict';
    // Uncaught SyntaxError: Strict mode code may not include a with statement
    eval(statement);
  })();
})();
