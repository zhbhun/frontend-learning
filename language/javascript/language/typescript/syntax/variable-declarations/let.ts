// 有块作用域
(function () {
  function f(shouldInitialize: boolean) {
    if (shouldInitialize) {
      let x = 10;
    }
    for (let y = 0; y < 100; y++) {
      y++;
    }
    return x + y;
  }
  // error TS2304: Cannot find name 'x'.
  // error TS2304: Cannot find name 'y'.

  // When a variable is declared using let, it uses what some call lexical-scoping or block-scoping. Unlike variables declared with var whose scopes leak out to their containing function, block-scoped variables are not visible outside of their nearest containing block or for-loop.
})();

// 不可以重复声明变量
function f(x) { // error TS2300: Duplicate identifier 'x'.
  let x; // error TS2300: Duplicate identifier 'x'.
  let x; // error TS2300: Duplicate identifier 'x'.

  if (true) {
    let x;
  }
}

// 嵌套循环问题
(function () {
  function sumMatrix(matrix: number[][]) {
    let sum = 0;
    for (let i = 0; i < matrix.length; i++) {
      let currentRow = matrix[i];
      for (let i = 0; i < currentRow.length; i++) { // i transform i_1
        sum += currentRow[i];
      }
    }

    return sum;
  }

  /*
  function sumMatrix(matrix) {
    var sum = 0;
    for (var i = 0; i < matrix.length; i++) {
        var currentRow = matrix[i];
        for (var i_1 = 0; i_1 < currentRow.length; i_1++) {
            sum += currentRow[i_1];
        }
    }
    return sum;
  }
  */
  // block-scoped variables are not visible outside of their nearest for-loop.
})();

// Variable capturing quirks
(function () {
  for (let i = 0; i < 10; i++) {
    setTimeout(function () { console.log(i); }, 100 * i);
  }
  /*
  0
  1
  2
  3
  4
  5
  6
  7
  8
  9
  */

  /*
  var _loop_1 = function (i) {
    setTimeout(function () { console.log(i); }, 100 * i);
  };
  for (var i = 0; i < 10; i++) {
    _loop_1(i);
  }
  */
})();

// catch 参数不会污染外部作用域
(function () {
  try {
    throw "oh no!";
  }
  catch (e) {
    console.log("Oh well.");
  }

  // error TS2304: Cannot find name 'e'.
  console.log(e);
})();

// 不可以先赋值后声明
(function () {
  a++;
  let a;
  // error TS2448: Block-scoped variable 'a' used before its declaration.
  // While these variables are “present” throughout their scope, all points up until their declaration are part of their temporal dead zone. This is just a sophisticated way of saying you can’t access them before the let statement, and luckily TypeScript will let you know that.
  // [Temporal dead zone and errors with let](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/let#Temporal_dead_zone_and_errors_with_let)

  // ---

  function foo() {
    // okay to capture 'a'
    return b;
  }
  // illegal call 'foo' before 'a' is declared
  // runtimes should throw an error here
  foo();
  let b;
  // Something to note is that you can still capture a block-scoped variable before it’s declared. The only catch is that it’s illegal to call that function before the declaration. If targeting ES2015, a modern runtime will throw an error; however, right now TypeScript is permissive and won’t report this as an error.
})();

