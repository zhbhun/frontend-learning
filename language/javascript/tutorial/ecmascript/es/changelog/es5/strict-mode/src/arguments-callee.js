// arguments 不会自动反映函数参数的变化
(function() {
  var statement = `
    (function() {
      console.log(arguments.callee);
    })();
  `;

  (function () {
    // function...
    eval(statement);
  })();

  (function () {
    'use strict';
    // Uncaught TypeError: 'caller', 'callee', and 'arguments' properties may not be accessed on strict mode functions or the arguments objects for calls to them
    eval(statement);
  })();
})();
