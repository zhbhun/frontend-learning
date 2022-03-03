console.log(Number(undefined)); // NaN

console.log(Number(null)); // 0

console.log(Number(true)); // 1
console.log(Number(false)); // 0

console.log(Number('')); // 0
console.log(Number(' ')); // 0
console.log(Number(' \t')); // 0
console.log(Number(' \n')); // 0
console.log(Number(' 1 ')); // 1
console.log(Number('\n1\n')); // 1
console.log(Number('1')); // 1
console.log(Number('1.1')); // 1.1
console.log(Number('0b010')); // 2
console.log(Number('0o010')); // 8
console.log(Number('0x010')); // 16
console.log(Number('+1')); // 1
console.log(Number('-1')); // 0
console.log(Number('1e3')); // 1000

console.log(Number({}), {}.valueOf(), {}.toString()); // NaN {} "[object Object]"
console.log(Number([]), [].valueOf(), [].toString()); // 0 [] ""
console.log(Number([1]), [1].valueOf(), [1].toString()); // 1 [1] "1"
console.log(Number([1, 2]), [1, 2].valueOf(), [1, 2].toString()); // NaN [1, 2] "1,2"
console.log(Number(function () {})); // NaN
console.log(Number(new Date('2017', '01', '01')), new Date('2017', '01', '01').valueOf(), new Date('2017', '01', '01').toString()); // 1485878400000 1485878400000 "Wed Feb 01 2017 00:00:00 GMT+0800 (CST)"
console.log(Number(new RegExp('')), new RegExp('').valueOf(), new RegExp('').toString()); // NaN /(?:)/ "/(?:)/"
