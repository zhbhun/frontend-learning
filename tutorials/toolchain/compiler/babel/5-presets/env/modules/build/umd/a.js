(function (global, factory) {
  if (typeof define === "function" && define.amd) {
    define(["exports", "./b"], factory);
  } else if (typeof exports !== "undefined") {
    factory(exports, require("./b"));
  } else {
    var mod = {
      exports: {}
    };
    factory(mod.exports, global.b);
    global.a = mod.exports;
  }
})(this, function (_exports, _b) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _b = _interopRequireDefault(_b);

  function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

  var _default = 'a' + _b.default;

  _exports.default = _default;
});