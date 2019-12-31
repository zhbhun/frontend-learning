// source
/*
let nestedProp = obj?.first?.second;
*/

// babel
var _obj, _obj$first;

let nestedProp =
  (_obj = obj) === null || _obj === void 0
    ? void 0
    : (_obj$first = _obj.first) === null || _obj$first === void 0
      ? void 0
      : _obj$first.second;

