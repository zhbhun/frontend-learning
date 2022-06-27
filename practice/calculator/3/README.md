# 计算器算法优化

很多人在解算数表达式计算时，会采用遍历数组优先计算乘除然后以计算结果替换和删除数组元素的的方式，这种方式需要反复遍历数组且需要对数组元素进行删除和插入（On），时间复杂度较高O(n^2)，性能较差，请尝试优化到 O(n)。

ps：Mac i7 四核处理器，计算含 1 万个操作数的算数表达式需要 1 秒，随着用户输入越来越多的，用户体验越来越差。

## 限制

- 你不可以使用 `eval()` 函数来执行计算
- 你不可以使用 `new Function('...')` 函数来执行计算

## 用例

1. 用户可以看到显示屏显示当前输入的数字或最后一次操作的结果。
2. 用户可以看到一个包含数字 0-9、操作符 —— '+'、'-'、'*'、'/' 和 '=' 按钮的输入板，一个 'AC' 按钮（用于清除所有）。
3. 用户可以通过点击输入板上的数字来输入最多八位数的数字序列，任何超过8位的数字的输入都将被忽略。
4. 用户可以点击 'AC' 按钮来清除所有的内部工作区域，并将显示值设为 0。
5. 初始值为 0，输入操作符则以 0 为操作数，否则按收入的数字作为操作数；
6. 最后输入等号后，将计算结果作为下一轮计算的初始值；
7. 当前操作数为 0 时，再重复输入 0 时需要忽略，避免出现 00000123 这样的显示；
8. 暂时不支持数字正负符号输入，所有操作符号都以最后输入为准；
例如：现在是 3 + ，再输入减号变为 3 -
9. 如果上一次输入的是操作符，现在输入等号支持自动去掉多余的操作符再进行计算。
10. 初始输入表达式含 1 万个操作数和随机操作符，在每次计算前后打印出计算耗时日志。

## 脚手架

https://codesandbox.io/s/calculator-3-kx156y

性能测试示例：

```js
function test() {
  function randomOperator() {
    return [
      { type: "operator", value: "plus", display: "+" },
      { type: "operator", value: "minus", display: "-" },
      { type: "operator", value: "multiply", display: "×" },
      { type: "operator", value: "divide", display: "÷" }
    ][Math.floor(Math.random() * 4)];
  }
  
  function randomOperand() {
    const value = Math.floor(1 + Math.random() * 100);
    return {
      type: "operand",
      value,
      display: String(value)
    };
  }

  var input = [randomOperand()];
  for (let index = 0; index < 10000; index++) {
    input.push(randomOperator());
    input.push(randomOperand());
  }

  var calculator = new Calculator();
  for (let index = 0; index < input.length; index++) {
    calculator.press(input[index]);
  }

  var begin = performance.now();
  console.log("> result", calculator.compute());
  console.log("> elapsed time", performance.now() - begin); // 现有算法耗时约 1000ms
}
```
