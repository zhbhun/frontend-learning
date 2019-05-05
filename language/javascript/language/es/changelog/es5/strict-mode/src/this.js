// 禁止 this 指向全局对象
(function() {
  var statement = `
    (function() {
      console.log(this);
    })();
  `;

  (function () {
    // window
    eval(statement);
  })();

  (function () {
    'use strict';
    // undefined
    eval(statement);
  })();
})();
