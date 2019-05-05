
/* @flow */

function foo(x: string, y: number): string {
  return x.length * y;
}

foo("Hello", 42);

/*
// Changing the return type to number fixes the error
function foo(x: string, y: number): number {
  return x.length * y;
}

foo("Hello", 42);
*/
