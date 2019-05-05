/* @flow*/
function add(num1, num2) {
  return num1 + num2;
}
function minus(num1, num2) {
  return num1 - num2;
}
function multiply(num1, num2) {
  return num1 * num2;
}
function divide(num1, num2) {
  return num1 / num2;
}
console.log(add(3, 'a')); // 31
// no error
console.log(minus(3, 'a')); // NaN
/*
scene/simple.js:6
  6:   return num1 - num2;
                     ^^^^ string. The operand of an arithmetic operation must be a number.
*/
console.log(multiply(3, 'a')); // NaN
/*
  9:   return num1 * num2;
                     ^^^^ string. The operand of an arithmetic operation must be a number.
*/
console.log(divide(3, 'a')); // NaN
/*
scene/simple.js:12
 12:   return num1 / num2;
                     ^^^^ string. The operand of an arithmetic operation must be a number.
*/
