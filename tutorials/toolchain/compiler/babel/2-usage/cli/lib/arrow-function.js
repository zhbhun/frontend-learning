"use strict";

require("core-js/modules/web.dom.iterable");

var _this = void 0;

var evens = [];
/* More expressive closure syntax. */

var odds = evens.map(function (v) {
  return v + 1;
});
var pairs = evens.map(function (v) {
  return {
    even: v,
    odd: v + 1
  };
});
var nums = evens.map(function (v, i) {
  return v + i;
});
/* More expressive closure syntax. */

nums.forEach(function (v) {
  if (v % 5 === 0) fives.push(v);
});
/* More intuitive handling of current object context. */

(void 0).nums = nums;
(void 0).fives = [];
(void 0).nums.forEach(function (v) {
  if (v % 5 === 0) _this.fives.push(v);
});