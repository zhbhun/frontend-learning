"use strict";

var _getOwnPropertyNames = require("babel-runtime/core-js/object/get-own-property-names");

var _getOwnPropertyNames2 = _interopRequireDefault(_getOwnPropertyNames);

var _getOwnPropertyDescriptor = require("babel-runtime/core-js/object/get-own-property-descriptor");

var _getOwnPropertyDescriptor2 = _interopRequireDefault(_getOwnPropertyDescriptor);

var _isExtensible = require("babel-runtime/core-js/object/is-extensible");

var _isExtensible2 = _interopRequireDefault(_isExtensible);

var _isFrozen = require("babel-runtime/core-js/object/is-frozen");

var _isFrozen2 = _interopRequireDefault(_isFrozen);

var _isSealed = require("babel-runtime/core-js/object/is-sealed");

var _isSealed2 = _interopRequireDefault(_isSealed);

var _preventExtensions = require("babel-runtime/core-js/object/prevent-extensions");

var _preventExtensions2 = _interopRequireDefault(_preventExtensions);

var _freeze = require("babel-runtime/core-js/object/freeze");

var _freeze2 = _interopRequireDefault(_freeze);

var _seal = require("babel-runtime/core-js/object/seal");

var _seal2 = _interopRequireDefault(_seal);

var _keys = require("babel-runtime/core-js/object/keys");

var _keys2 = _interopRequireDefault(_keys);

var _assign = require("babel-runtime/core-js/object/assign");

var _assign2 = _interopRequireDefault(_assign);

var _getPrototypeOf = require("babel-runtime/core-js/object/get-prototype-of");

var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

var _defineProperties = require("babel-runtime/core-js/object/define-properties");

var _defineProperties2 = _interopRequireDefault(_defineProperties);

var _create = require("babel-runtime/core-js/object/create");

var _create2 = _interopRequireDefault(_create);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

// ## Object Static Method
// -----------------------------------------------------------------------------

// Object.create
(0, _create2["default"])({});

// Object.defineProperty
Object.defineProperty({}, "key", {
  enumerable: false,
  configurable: false,
  writable: false,
  value: "static"
});

// Object.defineProperties
(0, _defineProperties2["default"])({}, {
  "property1": {
    value: true,
    writable: true
  },
  "property2": {
    value: "Hello",
    writable: false
  }
  // etc. etc.
});

// Object.getPrototypeOf
(0, _getPrototypeOf2["default"])({});

// Object.assign
(0, _assign2["default"])({}, { age: 30 });

// Object.keys
(0, _keys2["default"])({});

// Object.seal
(0, _seal2["default"])({});

// Object.freeze
(0, _freeze2["default"])({});

// Object.preventExtensions
(0, _preventExtensions2["default"])({});

// Object.isSealed
(0, _isSealed2["default"])({});

// Object.isFrozen
(0, _isFrozen2["default"])({});

// Object.isExtensible
(0, _isExtensible2["default"])({});

// Object.getOwnPropertyDescriptor
(0, _getOwnPropertyDescriptor2["default"])({}, 'key');

// Object.getOwnPropertyNames
(0, _getOwnPropertyNames2["default"])({});