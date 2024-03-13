/* Intuitive and flexible destructuring of Arrays into individual variables during assignment.
 */
var list = [1, 2, 3];
var [a, , b] = (list[(b, a)] = [a, b]);

/* Intuitive and flexible destructuring of Objects into individual variables during assignment.
 */
var { op, lhs, rhs } = getASTNode();

/* Intuitive and flexible destructuring of Objects into individual variables during assignment.
 */
var {
  op: a,
  lhs: { op: b },
  rhs: c
} = getASTNode();

/* Simple and intuitive default values for destructuring of Objects and Arrays.
 */
var obj = { a: 1 };
var list = [1];
var { a, b = 2 } = obj;
var [x, y = 2] = list;

/* Intuitive and flexible destructuring of Arrays and Objects into individual parameters during function calls.
 */
function f([name, val]) {
  console.log(name, val);
}
function g({ name: n, val: v }) {
  console.log(n, v);
}
function h({ name, val }) {
  console.log(name, val);
}
f(['bar', 42]);
g({ name: 'foo', val: 7 });
h({ name: 'bar', val: 42 });

/* Fail-soft destructuring, optionally with defaults.
 */
var list = [7, 42];
var [a = 1, b = 2, c = 3, d] = list;
a === 7;
b === 42;
c === 3;
d === undefined;
