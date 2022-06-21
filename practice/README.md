# 编程训练

大多时候大家都在做业务开发，然后上网逛逛论坛、看下博客和专栏，很少在业余时间动手训练自己的编码能力 —— 数据结构与算法、设计模式和项目架构等这些在业务开发中比较少接触到的。虽然有些人会专门去刷 LeetCode，但是在缺少项目应用的情况下，很容易忘记。我打算从一些列的应用想法出发，去训练自己的编码能力。

## 想法收集

很多框架的练习项目都是以 todo-list 或 tic-tac-toe 为例，在学完后想要做更多练习，可以参考下面的这些项目。

- [app-ideas](https://github.com/florinpop17/app-ideas) - 有近 80 个 web 应用想法，从初级水平到专家水平不等。虽然该项目已不再维护，但你也可以查看 Issues 和 Pull requests，查看更多的应用程序想法!
- [A list of sample Web App Ideas](https://flaviocopes.com/sample-app-ideas/) -它有一个从初级到中级的简单应用想法的清单。
- [Frontend Mentor Challenges ](https://www.frontendmentor.io/challenges) -  Frontend Mentor 有很多免费的挑战，从初学者到专家，你可以把它们作为项目来做。
- [Build Amazing Projects](https://codedamn.com/projects) - 编程训练平台，提供了一系列的项目想法。
- [App Ideas by JSBeginners ](https://jsbeginners.com/javascript-projects-for-beginners/) - 为初学者准备的 100 多个简单的JavaScript想法的列表。
- [App Ideas](https://www.reddit.com/r/AppIdeas/) - 这是一个专门发布不同的应用程序想法的社区
- [37 App Ideas for Bootcamp Students & Code Newbies](https://dev.to/sylwiavargas/33-app-ideas-for-bootcamp-students-code-newbies-3n28) - 为学生和初学者提供的一些应用程序想法。

## 制定计划

- 从简单到复杂来选定题目
- 分阶段实现负责的题目，每个阶段为一周

以计算器应用为例：

1. 第一周：只考虑整数的加减乘除，实现算数表达式解析；
2. 第二周：封装框架无关的计算器模式，类似日期处理库 Moment 那样；
3. 第三周：扩展计算逻辑，支持括号、撤销操作和小数等；
4. 第四周：总结存在的问题（可阅读性和维护性），利用命令、插件或状态等设计模式简化计算器模式的逻辑，实现插件化的可扩展计算器模块；
5. 第五周：使用 TypeScript 改造；
6. 第六周：计算器模块支持单元测试；
7. 第七周：计算器引用支持端到端测试；
8. 第八周：npm 库管理（了解做一个 npm 库除了源代码还要做好哪些事情，例如：兼容性、版本管理和使用说明等）

## 练习记录

### 计算器

- [练习题 - 计算器 - 1 ](https://github.com/zhbhun/blog/issues/2)：算数表达式解析
