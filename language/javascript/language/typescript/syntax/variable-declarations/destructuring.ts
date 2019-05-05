// Array
(function () {
  let input = [1, 2];
  let [first, second] = input; // 声明
  [first, second] = [second, first]; // 赋值，这里用于交换值
  (function f([first, second]) {})([first, second]); // 参数
  let [, ...rest] = [1, 2, 3, 4]; // 剩余
})();

// Object
(function () {
  let o = {
    a: "foo",
    b: 12,
    c: "bar"
  }
  let { a, b } = o; // 声明
  ({ a, b } = { b, a }); // 赋值（因为 JavaScript 将 { 解析为块语句的开始，所以必须使用括号将语句包起来），这里用于交换值
  (function f({ a, b }) {})({ a, b }); // 参数
  let { c, ...rest } = o; // 剩余
  let { a: newName1, b: newName2 } = o; // 重命名（注意区分类型注解）
  ({ a = '', b = 0 } = o); // 默认值
  (function f({ a = '', b = '' } = { a: "", b: 0 }) {})({ a, b }); // 默认值
})();
