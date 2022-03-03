// source
/*
const x = null;
const y = x ?? 500;
console.log(y); // 500
const n = 0
const m = n ?? 9000;
console.log(m) // 0
*/

// babel
const x = null;
const y = x !== null && x !== void 0 ? x : 500;
console.log(y); // 500

const n = 0;
const m = n !== null && n !== void 0 ? n : 9000;
console.log(m); // 0

