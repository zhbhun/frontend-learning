import a, { a1 } from "./a.js";

export var b1 = "a1...";

export default "b...";

// 循环依赖的时候，后引入的模块不能直接使用前引入的模块导出值
// console.log("++ b", a, a1); // Uncaught ReferenceError: Cannot access 'a' before initialization

setTimeout(() => {
  console.log("-- b", a, a1); // -- b a... a1...
}, 0);
