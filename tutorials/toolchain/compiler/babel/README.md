Babel
========

- [1. 快速上手](./1-begin)

    需要知道以下几点

    1. babel 是什么
    2. ES 是什么
    3. babel 的简单使用

- [2. 使用指南](./2-usage)

    要知道什么场景下该用那种方式使用 babel，以及要怎么使用。

- [3. 配置详解](./3-setting)

    要知道如何为自己的项目设置合适的编译规则，已经如何针对开发环境和生产环境设置不同的选项。

- [4. 使用 Polyfill](./4-polyfill)

    TODO

- [5. 插件详解](./5-plugins)

    要知道以下几点

    1. babel 内置插件的作用和用法；
    2. 社区一些有用的插件；
    3. 自定义插件 

- [6. 预设详解](./6-presets)

    如何自定义 preset，以及一些社区有用的 preset。

- [7. 常见问题](./7-issues)

## 文档

- [官网](https://babeljs.io/)
- [用户手册](https://github.com/thejameskyle/babel-handbook)
- [官方博客](http://babeljs.io/blog/)
- [常见问题](http://babeljs.io/docs/faq/)

## 社区

- [官方社区](https://discuss.babeljs.io/)
- [Babel on Slack](https://slack.babeljs.io/)
- [Babel on Twitter](https://twitter.com/babeljs)
- [Babel on Github](https://github.com/babel/babel)
- [Babel on StackOverflow](http://stackoverflow.com/questions/tagged/babeljs)

## 教程

- [ES5, ES6, ES2016, ES.Next: JavaScript 的版本是怎么回事？「译」](https://huangxuan.me/2015/09/22/js-version/) - 学习 Babel 首先要知道 ES 是什么
- [Babel 入门教程](http://www.ruanyifeng.com/blog/2016/01/babel.html) —— 阮一峰老师的博客，很适合入门

## 竞品

- [SWC](https://github.com/swc-project/swc)

## TODO

1. Note: Running a Babel 6.x project using npm 2.x can cause performance problems because of the way npm 2.x installs dependencies. This problem can be eliminated by either switching to npm 3.x or running npm 2.x with the dedupe flag. To check what version of npm you have run
2. Pre-6.x, Babel enabled certain transformations by default. However, Babel 6.x does not ship with any transformations enabled. You need to explicitly tell it what transformations to run. The simplest way to do this is by using a preset, such as the latest Preset. You can install it with
3. (In order to emulate a full ES2015+ environment, you will need to use a polyfill (one option is babel-polyfill) for things like Promise, Set, Map, or instance methods like String.repeat or Array.includes since Babel only does syntax transformations.


- [babel到底将代码转换成什么鸟样？](https://github.com/lcxfs1991/blog/issues/9)
- [Configuring Babel 6](http://www.2ality.com/2015/11/configuring-babel6.html)
- [Babel 6: configuring ES6 standard library and helpers](http://www.2ality.com/2015/12/babel6-helpersstandard-library.html)
- [Babel and CommonJS modules](http://www.2ality.com/2015/12/babel-commonjs.html)
- [babel-preset-es2015-loose](https://github.com/bkonkle/babel-preset-es2015-loose)
- [The Six Things You Need To Know About Babel 6](http://jamesknelson.com/the-six-things-you-need-to-know-about-babel-6/)
- [the-super-tiny-compiler](https://github.com/jamiebuilds/the-super-tiny-compiler)
- https://github.com/babel/example-node-server
