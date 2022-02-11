// 不能对只读属性赋值，否则报错
(function() {
  var statement = `
    window = 1;
    console.log(window);
  `;

  (function () {
    // window
    eval(statement);
  })();

  (function () {
    'use strict';
    // Uncaught TypeError: Cannot assign to read only property 'window' of object '#<Window>'
    eval(statement);
  })();
})();
