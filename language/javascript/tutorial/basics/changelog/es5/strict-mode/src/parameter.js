// 函数的参数不能有同名属性，否则报错
(function() {
  var statement = `
    function temp(a, a) {
      console.log(a);
    };
    temp(1, 2);
  `;

  (function () {
    // 2
    eval(statement);
  })();

  (function () {
    'use strict';
    // Uncaught SyntaxError: Duplicate parameter name not allowed in this context
    eval(statement);
  })();
})();


