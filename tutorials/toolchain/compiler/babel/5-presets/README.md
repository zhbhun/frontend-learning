# Babel Presets

从 2015 年开始，负责制定 ECMAScript 规范草案的委员会 TC39 决定将定义新标准的制度改为一年一次。相应的，Babel 针对每一年的新特性都提供了单独的 preset，如下所示：

- [babel-preset-es2017](http://babeljs.io/docs/plugins/preset-es2017/)：转译 ES2017 为 ES2016
- [babel-preset-es2016](http://babeljs.io/docs/plugins/preset-es2016/)：转译 ES2016 为 ES2015
- [babel-preset-es2015](http://babeljs.io/docs/plugins/preset-es2015/)：转译 ES2015 为 ES5

备注：

- es2015 也就是 es6，在此之前是 es5，由于 es5 已经被大多数环境所支持，一般需要转译，所以没有提供 preset；
- 每一年的 preset 包含各自标准的编译插件，最新的 preset 不代表包含之前的编译插件，所以想支持最新的标准，需要把之前的 preset 也配置上；
- 如果需要包含每一年的 preset，可以使用 [babel-preset-latest](http://babeljs.io/docs/plugins/preset-latest/)；
- Babel 提供了 [babel-preset-env](https://github.com/babel/babel-preset-env)，可以自动根据转译代码的运行环境决定所需的插件和设置，例如可以指定目标运行环境是 chrome 某个版本以上；

JavaScript 还有一些提案，正在积极通过 TC39（ECMAScript 标准背后的技术委员会）的流程成为标准的一部分。这个流程分为 5（0－4）个阶段，随着提案得到越多的关注就越有可能被标准采纳，于是他们就继续通过各个阶段，最终在阶段 4 被标准正式采纳。以下是4 个不同阶段的（打包的） preset：

- [stage-0](http://babeljs.io/docs/plugins/preset-stage-0) - Strawman（稻草人）: 只是个想法，可能存在相应的插件

    - transform-do-expressions：转译 `do` 表达式
    - transform-function-bind：转译 `::` 函数绑定
    - 包含 preset-stage-1，2，3 的所有编译插件

- [stage-1](http://babeljs.io/docs/plugins/preset-stage-1) - Proposal（提议）: 值得考虑的提案

    - transform-export-extensions：转译 export-from 语法
    - 包含 preset-stage-2，3 的所有编译插件

- [stage-2](http://babeljs.io/docs/plugins/preset-stage-2) - Draft（草案）: 开始制定规范了

    - transform-decorators：转译装饰器语法，但还不能使用，需要等待提案更新（暂时可以使用 [babel-plugin-transform-decorators-legacy](https://github.com/loganfsmyth/babel-plugin-transform-decorators-legacy)）
    - transform-class-properties：转译类属性
    - 包含 preset-stage-3 的所有编译插件

- [stage-3](http://babeljs.io/docs/plugins/preset-stage-3) - Candidate（候选）: 完成规范的制定，浏览器可以开始实现这些特性了

    - transform-object-rest-spread：转译对象 rest 语法
    - transform-async-generator-functions：转译 async 语法

- stage-4 - Finished（完成）: 将添加到下一年的标准里，即 ES-xxxx

备注：

- 由于前面阶段的 preset，包含后面阶段 preset 的所有插件和设置，所以只要配置一个 preset 就行了，例如配置了 state-1 就不要再配置 stage-2 和 stage-3 了；
- 因为 stage-4 已经被添加到每一年的新标准中了，所以 stage-4 的 preset，就是上面每一年的 preset；
- 关于提案阶段的说明可参考 [process document](https://tc39.github.io/process-document)
- 关于当前有哪些提案，处理哪个阶段，可以参考 [current TC39 proposals](https://github.com/tc39/proposals)；

Babel 支持语法扩展，本身支持了 React 所用的 JSX 语法，相应的 preset 是 [babel-preset-react](http://babeljs.io/docs/plugins/preset-react/)。


# Community Presets
除了 Babel 自身维护的 preset 外，社区维护的 preset 可以参考 [preset on npm](https://www.npmjs.com/search?q=babel-preset)。

- [babel-preset-node5](https://github.com/leebenson/babel-preset-node5) - Babel preset for Node 5.x (ES6 / ES2015).

# 自定义 Presets
[制作你自己的预设preset](https://github.com/thejameskyle/babel-handbook/blob/master/translations/zh-Hans/user-handbook.md#制作你自己的预设preset)
