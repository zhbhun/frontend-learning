System.register(["./b"], function (_export, _context) {
  "use strict";

  var b;
  return {
    setters: [function (_b) {
      b = _b.default;
    }],
    execute: function () {
      _export("default", 'a' + b);
    }
  };
});