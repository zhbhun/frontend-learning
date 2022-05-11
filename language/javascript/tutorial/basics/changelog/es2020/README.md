# ES 2020

### [BigInt](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/BigInt)

简介：大整数

要点：Babel 无法编译 BigInt 到低版本的 ES 语法（BigInt 修改了运算符等行为，这些变更导致无法直接提供 Polyfill），需要使用 Google 提供的 JSBI 库来使用 BigInt，并在将来可以使用插件 babel-plugin-transform-jsbi-to-bigint 将 JSBI 代码转化为原生的 ES 语法

兼容性

- Chrome：67
- Edge：79
- Firefox：68
- Safari：14
- Safari on iOS：14
- Node.js：10.4

参考

- [BigInt: arbitrary-precision integers in JavaScript](https://v8.dev/features/bigint#polyfilling-transpiling)
- [jsbi](https://github.com/GoogleChromeLabs/jsbi) / [babel-plugin-transform-jsbi-to-bigint](https://github.com/GoogleChromeLabs/babel-plugin-transform-jsbi-to-bigint) / [JSBI —纯JavaScript BigInts](https://www.wenyanet.com/opensource/zh/5ff5592ce43fd5359b620f6a.html)
- [@babel/plugin-syntax-bigint](https://babeljs.io/docs/en/babel-plugin-syntax-bigint)

### [Dynamic Imports](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import#dynamic_imports)

简介：动态导入

兼容性

- Chrome：63
- Edge：79
- Firefox：67
- Safari：11.1
- Safari on iOS：11.3
- Node.js：13.2

参考

- [ES2020: import() – dynamically importing ES modules](https://2ality.com/2017/01/import-operator.html)
- [@babel/plugin-syntax-dynamic-import](https://babeljs.io/docs/en/babel-plugin-syntax-dynamic-import)

### [Nullish coalescing operator (??)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing_operator)

简介：空值合并运算符

兼容性

- Chrome：80
- Edge：80
- Firefox：72
- Safari：13.1
- Safari on iOS：13.4
- Node.js：14.0.0

参考

- [@babel/plugin-proposal-nullish-coalescing-operator](https://babeljs.io/docs/en/babel-plugin-proposal-nullish-coalescing-operator)

### [Optional chaining (?.)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Optional_chaining)

兼容性

- Chrome：80
- Edge：80
- Firefox：74
- Safari：13.1
- Safari on iOS：13.4
- Node.js：14.0.0

参考

- [@babel/plugin-proposal-optional-chaining](https://babeljs.io/docs/en/babel-plugin-proposal-optional-chaining)

## 参考文献

- [So, what’s new in ES2020?](https://tdd.github.io/confoo2018-es2020/#/)
- [JavaScript ES2020 的 10 个新特性](https://chinese.freecodecamp.org/news/javascript-new-features-es2020/)
- [了解JavaScript新特性：Optional Chaining]( https://mp.weixin.qq.com/s?__biz=MzUxMzcxMzE5Ng==&mid=2247492849&idx=2&sn=c081a0a944abffd30d3a0ef9695a9333&scene=21#wechat_redirect )
- [令人期待的 JavaScript 新特性](https://mp.weixin.qq.com/s/5Fm2p2sKUBd5Ub4LCzLr1w)
- [7 Exciting New JavaScript Features You Need to Know](https://dev.to/gafi/7-new-exciting-javascript-features-you-need-to-know-1fkh)
- [New JavaScript Features Coming in ES2020 That You Can Use Now](https://levelup.gitconnected.com/new-features-of-javascript-that-we-can-use-soon-or-now-6199981bd2f)
- [精读《What's new in javascript》](https://github.com/dt-fe/weekly/blob/v2/105.%E7%B2%BE%E8%AF%BB%E3%80%8AWhat's%20new%20in%20javascript%E3%80%8B.md)
- [令人期待的 JavaScript 新特性](https://www.infoq.cn/article/ZAYPIz9bbukZO3duRrIm)
