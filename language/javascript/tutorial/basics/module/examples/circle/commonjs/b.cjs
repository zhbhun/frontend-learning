const a = require("./a.cjs");

module.exports = "b...";

console.log("++ b", a);

setTimeout(() => {
  console.log("-- b", a, require("./a.cjs"));
}, 0);
