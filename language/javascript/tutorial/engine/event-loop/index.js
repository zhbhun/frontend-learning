// 下面两行，次轮循环执行
setTimeout(() => console.log(0), 10);
setImmediate(() => console.log(2));
setTimeout(() => console.log(1));
// 下面两行，本轮循环执行
Promise.resolve().then(() => console.log(3));
process.nextTick(() => console.log(4));
Promise.resolve().then(() => console.log(5));
(() => console.log(5))();
