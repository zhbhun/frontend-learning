'use strict';

var _asap2 = require('babel-runtime/core-js/asap');

var _asap3 = _interopRequireDefault(_asap2);

var _clearImmediate2 = require('babel-runtime/core-js/clear-immediate');

var _clearImmediate3 = _interopRequireDefault(_clearImmediate2);

var _setImmediate2 = require('babel-runtime/core-js/set-immediate');

var _setImmediate3 = _interopRequireDefault(_setImmediate2);

var _observable = require('babel-runtime/core-js/observable');

var _observable2 = _interopRequireDefault(_observable);

var _weakSet = require('babel-runtime/core-js/weak-set');

var _weakSet2 = _interopRequireDefault(_weakSet);

var _set = require('babel-runtime/core-js/set');

var _set2 = _interopRequireDefault(_set);

var _weakMap = require('babel-runtime/core-js/weak-map');

var _weakMap2 = _interopRequireDefault(_weakMap);

var _map = require('babel-runtime/core-js/map');

var _map2 = _interopRequireDefault(_map);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _symbol = require('babel-runtime/core-js/symbol');

var _symbol2 = _interopRequireDefault(_symbol);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

// ## Builtins
// -----------------------------------------------------------------------------

// Symbol
new _symbol2['default']('');

// Promise
new _promise2['default']();

// Map
new _map2['default']();

// WeakMap
new _weakMap2['default']();

// Set
new _set2['default']();

// WeakSet
new _weakSet2['default']();

// Observable
new _observable2['default']();

// setImmediate
(0, _setImmediate3['default'])();

// clearImmediate
(0, _clearImmediate3['default'])();

// asap
(0, _asap3['default'])();