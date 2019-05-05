var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) if (e.indexOf(p[i]) < 0)
            t[p[i]] = s[p[i]];
    return t;
};
// Array
(function () {
    var input = [1, 2];
    var first = input[0], second = input[1]; // 声明
    _a = [second, first], first = _a[0], second = _a[1]; // 赋值，这里用于交换值
    (function f(_a) {
        var first = _a[0], second = _a[1];
    })([first, second]); // 参数
    var _b = [1, 2, 3, 4], rest = _b.slice(1); // 剩余
    var _a;
})();
// Object
(function () {
    var o = {
        a: "foo",
        b: 12,
        c: "bar"
    };
    var a = o.a, b = o.b; // 声明
    (_a = { b: b, a: a }, a = _a.a, b = _a.b); // 赋值（因为 JavaScript 将 { 解析为块语句的开始，所以必须使用括号将语句包起来），这里用于交换值
    (function f(_a) {
        var a = _a.a, b = _a.b;
    })({ a: a, b: b }); // 参数
    var c = o.c, rest = __rest(o, ["c"]); // 剩余
    var newName1 = o.a, newName2 = o.b; // 重命名（注意区分类型注解）
    (_b = o.a, a = _b === void 0 ? '' : _b, _c = o.b, b = _c === void 0 ? 0 : _c); // 默认值
    (function f(_a) {
        var _b = _a === void 0 ? { a: "", b: 0 } : _a, _c = _b.a, a = _c === void 0 ? '' : _c, _d = _b.b, b = _d === void 0 ? '' : _d;
    })({ a: a, b: b }); // 默认值
    var _a, _b, _c;
})();
