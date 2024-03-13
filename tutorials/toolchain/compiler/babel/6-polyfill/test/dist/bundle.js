/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/*!**********************!*\
  !*** ./src/index.js ***!
  \**********************/
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	// require('babel-polyfill');
	// # ES5
	// -----------------------------------------------------------------------------

	// ## Object
	// -----------------------------------------------------------------------------

	// Object.create
	// Object.create({});

	// Object.defineProperty
	Object.defineProperty({}, "key", {
	  enumerable: false,
	  configurable: false,
	  writable: false,
	  value: "static"
	});

	// // Object.defineProperties
	// Object.defineProperties({}, {
	//   "property1": {
	//     value: true,
	//     writable: true
	//   },
	//   "property2": {
	//     value: "Hello",
	//     writable: false
	//   }
	//   // etc. etc.
	// });

	// // Object.getPrototypeOf
	// Object.getPrototypeOf({})


	// // Object.assign
	// Object.assign({}, { age: 30 });

	__webpack_require__(/*! ./a */ 1);
	module.exports = "Test";

/***/ },
/* 1 */
/*!******************!*\
  !*** ./src/a.js ***!
  \******************/
/***/ function(module, exports) {

	'use strict';

	module.exports = 'a';

/***/ }
/******/ ]);