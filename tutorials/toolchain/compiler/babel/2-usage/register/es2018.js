const input = { x: 1, y: 2, a: 3, b: 4};
const { x, y, ...z } = input;

console.log(x);
console.log(y);
console.log(z);
