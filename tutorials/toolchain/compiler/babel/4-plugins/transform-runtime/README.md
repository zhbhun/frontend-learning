# transform-runtime

## 配置

- corejs：2|false，默认 false

    babel 的帮助函数改为从 @babel/runtime-corejs2 引入（原来是 @babel/runtime），相对于 @babel/runtime，@babel/runtime-corejs2 内部的一些方法使用了 core-js 的 polyfill。

    例如：对比 [@babel/runtime-corejs2 createClass](https://unpkg.com/@babel/runtime-corejs2@7.1.2/helpers/createClass.js) 和 [@babel/runtime createClass](https://unpkg.com/@babel/runtime@7.1.2/helpers/createClass.js)，前者的 `Object.defineProperty` 使用了 `require("../core-js/object/define-property")`。

- helpers：true|false，默认 true

    为 true 时，babel 工具函数直接引用 @babel/run-time 里的工具模块，否则直接将工具函数注入到编译后的模块里。

- regenerator：true|false，默认 true

    为 true 时，使用 @babel/runtime/regenerator 来兼容 generator，否则不做任何处理

- useESModules：true|false，默认 false

    为 true 时，使用 @babel/runtime/helpers/esm 下的 ES 模块化的工具函数，否则使用 commonjs 模块化的工具函数。

## 常见问题

- @babel/plugin-transform-runtime 编译代码打包后体积更多

    - [@babel/plugin-transform-runtime bring unnecessary polyfill with corejs configuration. ](https://github.com/babel/babel/issues/11539)
    - [Using @babel/runtime-corejs2 and @babel/runtime-corejs3 leads to larger bundle sizes](https://github.com/babel/babel/issues/9853#issuecomment-619587386)


其他

- [Plugin transform-runtime with webpack doesn't work properly](https://github.com/babel/babel-loader/issues/231)
- https://github.com/webpack/webpack/issues/4039 | https://github.com/webpack/webpack/issues/4039#issuecomment-274094298
- https://github.com/webpack/webpack/issues/4039#issuecomment-419284940

## 最佳实践

- corejs: 2
- helps: true
- regenerator: true
- useESModules: false

> babel-runtime 对于小项目反而可能导致最终打包体积变大，所以公共库在打包合并时要禁用 babel-runtime，如果只是编译供其他库使用可以开启 babel-runtime。

## 参考文献

- [Runtime transform](https://babeljs.io/docs/en/babel-plugin-transform-runtime)
- [How to use babel-runtime in Babel 6?](http://stackoverflow.com/questions/34076117/how-to-use-babel-runtime-in-babel-6)
- [babel的polyfill和runtime的区别](https://segmentfault.com/q/1010000005596587?_ea=3116433)

