/* @flow */

function foo(x) {
  return x.length;
}

var res = foo("Hello") + foo(42);

/*
function foo(x) {
  if (typeof x === 'string') {
    return x.length;
  } else {
    return x;
  }
}

var res = foo("Hello") + foo(42);
*/
