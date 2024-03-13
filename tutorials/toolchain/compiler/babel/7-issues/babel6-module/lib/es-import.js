'use strict';

var _commonjsExports = require('./commonjs-exports');

var _commonjsExports2 = _interopRequireDefault(_commonjsExports);

var _commonjsModuleExports = require('./commonjs-module-exports');

var _commonjsModuleExports2 = _interopRequireDefault(_commonjsModuleExports);

var _esExport = require('./es-export');

var _esExport2 = _interopRequireDefault(_esExport);

var _esExportDefault = require('./es-export-default');

var _esExportDefault2 = _interopRequireDefault(_esExportDefault);

var _esExportAndDefault = require('./es-export-and-default');

var _esExportAndDefault2 = _interopRequireDefault(_esExportAndDefault);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

console.log(_commonjsExports2.default); // { a: 1, b: 2 }

console.log(_commonjsModuleExports2.default); // { a: 1, b: 2 }

console.log(_esExport2.default); // undefined

console.log(_esExportDefault2.default); // { a: '1', b: '2' }

console.log(_esExportAndDefault2.default);
console.log('---'); // { a: '1', b: '2' }