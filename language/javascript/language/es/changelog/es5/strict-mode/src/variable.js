// 函数的参数不能有同名属性，否则报错
(function() {
  var statement = `
    console.log(temp);
    var temp = 0;
  `;

  (function () {
    // undefined
    eval(statement);
  })();

  (function () {
    'use strict';
    // undefined ?
    eval(statement);
  })();
})();
