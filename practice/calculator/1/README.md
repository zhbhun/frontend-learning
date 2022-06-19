# 计算器

计算器不仅是最有用的工具之一，而且也是了解应用程序中 UI 和事件处理的好方法。在这个问题中，你将创建一个支持整数的基本算术计算的计算器。

## 限制

- 你不可以使用 `eval()` 函数来执行计算
- 你不可以使用 `new Function('...')` 函数来执行计算

## 用例

- 用户可以看到显示屏显示当前输入的数字或最后一次操作的结果。
- 用户可以看到一个包含数字 0-9、操作符 —— '+'、'-'、'*'、'/' 和 '=' 按钮的输入板，一个 'AC' 按钮（用于清除所有）。
- 用户可以通过点击输入板上的数字来输入最多八位数的数字序列，任何超过8位的数字的输入都将被忽略。
- 用户可以点击 'AC' 按钮来清除所有的内部工作区域，并将显示值设为 0。

## 脚手架

https://codesandbox.io/s/calculator-c8tnv1

## 要点

考察算术表达式的解析和堆栈数据结构的使用，后续会逐渐完善计算器，引入更加复杂的功能，锻炼大家使用设计模式封装高可扩展的计算器模块。


## 参考文献

- [Calculator-App](https://github.com/florinpop17/app-ideas/blob/master/Projects/1-Beginner/Calculator-App.md)
- [数据结构和算法（六）：前缀、中缀、后缀表达式](https://zhuanlan.zhihu.com/p/37467928)
- [实现一个四则运算语法解析器](https://zhuanlan.zhihu.com/p/112460676)
- [栈的应用：解析算术表达式](https://www.cnblogs.com/flyingbread/archive/2007/02/03/638932.html)
- [DSA - 表达式解析(Expression Parsing)](https://iowiki.com/data_structures_algorithms/expression_parsing.html)

---

- 基于后缀表达式的解法：https://codesandbox.io/s/calculator-1-answer-suffix-pb28wv
