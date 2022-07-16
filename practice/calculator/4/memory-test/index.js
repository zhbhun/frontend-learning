// var sizeof = require("object-sizeof");
const { NumberOperand } = require("./operand");

// // // 2B per character, 6 chars total => 12B
// // console.log(sizeof({ abc: "def" }));
// // console.log(sizeof(new NumberOperand(0)));

// // function allProperties(obj) {
// //   const stringProperties = [];
// //   for (var prop in obj) {
// //     stringProperties.push(prop);
// //   }
// //   if (Object.getOwnPropertySymbols) {
// //     var symbolProperties = Object.getOwnPropertySymbols(obj);
// //     Array.prototype.push.apply(stringProperties, symbolProperties);
// //   }
// //   return stringProperties;
// // }

// // console.log(allProperties(new NumberOperand(0)));

// const a = [new NumberOperand(0), new NumberOperand(1)];
// const b = a.slice(0);

// const c = {0: a[0], 1: a[1]}
// const d = {0: a[0], 1: a[1]}

// console.log(sizeof(a));
// // console.log(sizeof([a, b]));
// // console.log(sizeof([c, d]));
// // // console.log(sizeof(b));
// // // console.log(sizeof([a, b]));



const a = process.memoryUsage()
console.log(a)

const list =[]
for (let index = 0; index < 10000; index++) {
  list.push(new NumberOperand(index))
}

const b = process.memoryUsage()
console.log(b, b.heapUsed - a.heapUsed)

const history = []
for (let index = 0; index < 1000; index++) {
  history.push(list.slice(0))
}

const c = process.memoryUsage()
console.log(c, c.heapUsed - b.heapUsed)
