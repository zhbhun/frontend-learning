'use strict';

var _dog = require('./dog');

var _dog2 = _interopRequireDefault(_dog);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var toby = new _dog2.default('Toby');
// const toby = new Dog(123); // flow error

/* eslint-disable no-console */

console.log(toby.bark());