// arguments 不会自动反映函数参数的变化
(function() {
  var statement = `
    (function(a) {
      a = 2;
      console.log(arguments[0]);
    })(1);
  `;

  (function () {
    // 2
    eval(statement);
  })();

  (function () {
    'use strict';
    // 1
    eval(statement);
  })();
})();
