import ce, { a as ca, b as cb } from './commonjs-exports';
console.log(ce, ca, cb); // { a: 1, b: 2 } 1 2
import cme, { a as cma, b as cmb } from  './commonjs-module-exports';
console.log(cme, cma, cmb); // { a: 1, b: 2 } 1 2
import ee, { a as ea, b as eb } from './es-export';
console.log(ee, ea, eb); // undefined 1 2
import eed, { a as eda, b as edb } from './es-export-default';
console.log(eed, eda, edb); // { a: '1', b: '2' } undefined undefined
import eead, { a as eada, b as eadb } from './es-export-and-default';
console.log(eead, eada, eadb); // { a: '1', b: '2' } 1 2
console.log('---');
