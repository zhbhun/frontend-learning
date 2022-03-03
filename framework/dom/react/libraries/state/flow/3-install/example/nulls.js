/* @flow */

function length(x) {
  return x.length;
}

var total = length("Hello") + length(null);


/*
// Changing the return type to number fixes the error
function foo(x: string, y: number): number {
  return x.length * y;
}

foo("Hello", 42);
*/
