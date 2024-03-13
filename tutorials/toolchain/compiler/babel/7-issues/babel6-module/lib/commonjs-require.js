'use strict';

console.log(require('./commonjs-exports')); // { a: 1, b: 2 }
console.log(require('./commonjs-module-exports')); // { a: 1, b: 2 }
console.log(require('./es-export')); // { a: 1, b: 2 }
console.log(require('./es-export-default')); // { default: { a: '1', b: '2' } }
console.log(require('./es-export-and-default')); // { a: 1, b: 2, default: { a: '1', b: '2' } }
console.log('---');