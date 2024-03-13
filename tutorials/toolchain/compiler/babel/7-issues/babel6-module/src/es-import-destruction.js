import { a as ca, b as cb } from './commonjs-exports';
console.log(ca, cb); // 1 2
import { a as cma, b as cmb } from  './commonjs-module-exports';
console.log(cma, cmb); // 1 2
import { a as ea, b as eb } from './es-export';
console.log(ea, eb); // 1 2
import { a as eda, b as edb } from './es-export-default';
console.log(eda, edb); // undefined undefined
import { a as eada, b as eadb } from './es-export-and-default';
console.log(eada, eadb); // 1 2
console.log('---');
