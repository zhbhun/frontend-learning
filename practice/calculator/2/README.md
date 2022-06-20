# 计算器

在[上一题](../1/README.md)的基础上将计算器的核心逻辑提取出来，封装一个框架无关的计算器模块，并改造你的计算器应用。

## 用例

在[上一题](../1/README.md)的基础上增加一下边界情况的处理：

1. 初始值为 0，输入操作符则以 0 为操作数，否则按收入的数字作为操作数；
2. 重复输入操作符，以最后一次输入为准；
3. 最后输入等号后，将计算结果作为下一轮计算的初始值；

## 脚手架

```js
class Calculator {
  // 接收计算器输入
  press() {}

  /**
   * 计算当前输入的结果
   * @return number
   */
  compute() {}

  /**
   * 显示当前的输入值
   * 
   * @return string
   */
  display() {}
}

const calculator = new Calculator()
// 以下 press 入参只是范例，可以自行定义
calculator.press('3').press('+').press('4').press('×').press(5)
calculator.display() // 3 + 4 * 5
calculator.compute() // 23
```

ps：以上只是参考范例，大家可以自行封装扩展。后续会增加操作符和操作数的支持，有条件的可以考虑如何封装可扩展的插件化的计算器模块，另外有兴趣的可以尝试使用 TS 来编写。
