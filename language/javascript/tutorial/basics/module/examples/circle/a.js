import b, { b1 } from "./b.js";

export var a1 = "a1...";

export default "a...";

console.log("++ a", b, b1); // ++ a b... a1...

setTimeout(() => {
  console.log("-- a", b, b1); // -- a b... a1...
}, 0);
