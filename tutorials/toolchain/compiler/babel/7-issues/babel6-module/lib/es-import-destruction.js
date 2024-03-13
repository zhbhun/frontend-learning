'use strict';

var _commonjsExports = require('./commonjs-exports');

var _commonjsModuleExports = require('./commonjs-module-exports');

var _esExport = require('./es-export');

var _esExportDefault = require('./es-export-default');

var _esExportAndDefault = require('./es-export-and-default');

console.log(_commonjsExports.a, _commonjsExports.b); // 1 2

console.log(_commonjsModuleExports.a, _commonjsModuleExports.b); // 1 2

console.log(_esExport.a, _esExport.b); // 1 2

console.log(_esExportDefault.a, _esExportDefault.b); // undefined undefined

console.log(_esExportAndDefault.a, _esExportAndDefault.b); // 1 2
console.log('---');