/* Block-scoped variables (and constants) without hoisting. */
for (let i = 0; i < a.length; i++) {
  let x = a[i];
}
for (let i = 0; i < b.length; i++) {
  let y = b[i];
}

let callbacks = [];
for (let i = 0; i <= 2; i++) {
  callbacks[i] = function() {
    return i * 2;
  };
}
callbacks[0]() === 0;
callbacks[1]() === 2;
callbacks[2]() === 4;

/* Block-scoped function definitions. */

{
  function foo() {
    return 1;
  }
  foo() === 1;
  {
    function foo() {
      return 2;
    }
    foo() === 2;
  }
  foo() === 1;
}
