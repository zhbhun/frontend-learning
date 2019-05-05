// 没有块作用域
(function () {
  function f(shouldInitialize: boolean) {
    if (shouldInitialize) {
      var x = 10;
    }
    for (var y = 0; y < 100; y++) {
      y++;
    }
    return x + y;
  }
  f(true);  // returns '10'
  f(false); // returns 'undefined'

  // var declarations are accessible anywhere within their containing function, module, namespace, or global scope - all which we’ll go over later on - regardless of the containing block. Some people call this var-scoping or function-scoping. Parameters are also function scoped.
})();

// 可以重复声明变量
(function () {
  function f(x) {
    var x;
    var x;

    if (true) {
      var x;
    }
  }
})();

// 嵌套循环问题
(function () {
  function sumMatrix(matrix: number[][]) {
    var sum = 0;
    for (var i = 0; i < matrix.length; i++) {
      var currentRow = matrix[i];
      for (var i = 0; i < currentRow.length; i++) { // 会覆盖外层循环的变量 i
        sum += currentRow[i];
      }
    }

    return sum;
  }

  // Maybe it was easy to spot out for some, but the inner for-loop will accidentally overwrite the variable i because i refers to the same function-scoped variable. As experienced developers know by now, similar sorts of bugs slip through code reviews and can be an endless source of frustration.
})();

// 变量捕捉怪异
(function () {
  for (var i = 0; i < 10; i++) {
    setTimeout(function () { console.log(i); }, 100 * i);
  }
  /*
  10
  10
  10
  10
  10
  10
  10
  10
  10
  10
  */

  // Every function expression we pass to setTimeout actually refers to the same i from the same scope.
  // setTimeout will run a function after some number of milliseconds, but only after the for loop has stopped executing; By the time the for loop has stopped executing, the value of i is 10. So each time the given function gets called, it will print out 10!
})();

// 可以先赋值后声明
(function () {
  a++;
  var a;
})();
