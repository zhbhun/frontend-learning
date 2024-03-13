import * as ce from './commonjs-exports';
console.log(ce); // { a: 1, b: 2, default: { a: 1, b: 2 } }
import * as cme from './commonjs-module-exports';
console.log(cme); // { a: 1, b: 2, default: { a: 1, b: 2 } }
import * as ee from './es-export';
console.log(ee); // { a: 1, b: 2 }
import * as eed from './es-export-default';
console.log(eed); // { default: { a: '1', b: '2' } }
import * as eead from './es-export-and-default';
console.log(eead); // { a: 1, b: 2, default: { a: '1', b: '2' } }
console.log('---');
