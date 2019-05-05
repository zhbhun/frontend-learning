// eval 不会在它的外层作用域引入变量
(function() {
  var statement = `
    var temp = 1;
  `;

  (function () {
    eval(statement);
    // 1
    console.log(temp);
  })();

  (function () {
    'use strict';
    eval(statement);
    // Uncaught ReferenceError: temp is not defined
    console.log(temp);
  })();
})();
