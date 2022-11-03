const b = require("./b.cjs");

module.exports = "a...";

console.log("++ a", b);

setTimeout(() => {
  console.log("-- a", b);
}, 0);
