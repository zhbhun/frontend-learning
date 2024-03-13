import ce from './commonjs-exports';
console.log(ce); // { a: 1, b: 2 }
import cme from './commonjs-module-exports';
console.log(cme); // { a: 1, b: 2 }
import ee from './es-export';
console.log(ee); // undefined
import eed from './es-export-default';
console.log(eed); // { a: '1', b: '2' }
import eead from './es-export-and-default';
console.log(eead);
console.log('---'); // { a: '1', b: '2' }
