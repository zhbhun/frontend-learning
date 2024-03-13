"use strict";

var Point =
/*#__PURE__*/
function () {
  function Point(x, y) {
    this.x = x;
    this.y = y;
  }

  var _proto = Point.prototype;

  _proto.toString = function toString() {
    return "(" + this.x + ", " + this.y + ")";
  };

  return Point;
}();