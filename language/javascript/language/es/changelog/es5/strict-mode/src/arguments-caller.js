// 不能使用 arguments.caller
(function() {
  var statement = `
    (function() {
      console.log(arguments.caller);
      (function() {
        console.log(arguments.caller);
      })()
    })();
  `;

  (function () {
    // undefined
    // undefined
    eval(statement);
  })();

  (function () {
    'use strict';
    // Uncaught TypeError: 'caller', 'callee', and 'arguments' properties may not be accessed on strict mode functions or the arguments objects for calls to them
    eval(statement);
  })();
})();
