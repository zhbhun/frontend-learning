'use strict';

var _commonjsExports = require('./commonjs-exports');

var ce = _interopRequireWildcard(_commonjsExports);

var _commonjsModuleExports = require('./commonjs-module-exports');

var cme = _interopRequireWildcard(_commonjsModuleExports);

var _esExport = require('./es-export');

var ee = _interopRequireWildcard(_esExport);

var _esExportDefault = require('./es-export-default');

var eed = _interopRequireWildcard(_esExportDefault);

var _esExportAndDefault = require('./es-export-and-default');

var eead = _interopRequireWildcard(_esExportAndDefault);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

console.log(ce); // { a: 1, b: 2, default: { a: 1, b: 2 } }

console.log(cme); // { a: 1, b: 2, default: { a: 1, b: 2 } }

console.log(ee); // { a: 1, b: 2 }

console.log(eed); // { default: { a: '1', b: '2' } }

console.log(eead); // { a: 1, b: 2, default: { a: '1', b: '2' } }
console.log('---');