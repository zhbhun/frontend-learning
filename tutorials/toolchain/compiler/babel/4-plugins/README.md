知识点

- 知道如何使用插件
- 知道 babel 都提供有那些插件

    - transform：转译插件，针对不同标准提供了一系列插件，例如：es3，es5，es2015，es2016，es2017，modules，experimental，minification，react...
    - syntax：语法插件，由 transform 插件继承或使用，一般不用配置
    - misc：辅助性的插件，可用于调优转译代码

- 了解 babel 每个转译插件的作用和用法

    - es3 转译一些兼容性不好的语法，如保留字属性在 IE8 下不能正常运行
    - es5 转译一些兼容性不好的语法，如 getter 和 setter 在 IE8 下不能正常运行
    - es2015-2017 转译代码为符合 ES5 标准的代码
    - experimental 转译一些还没有通过 TC39 审核的新特性
    - minification 使转译代码变得更简洁
    - react 转译 jsx 语法

- 知道如何使用 misc 插件调优转译代码
- 知道一些社区提供的使用率较高的插件
- 知道一些插件的 loose 模式

# 如何使用插件
1. 安装插件：`npm install --save-dev babel-plugin-xxx`
2. 配置插件：根据 babel 不同用法调整配置方式

    - .babelrc: `{ "plugins": ["babel-plugin-xxx"] }`
    - CLI：`babel --plugins babel-plugin-xxx src.js`
    - Node API：`require("babel-core").transform("code", { plugins: ["babel-plugin-xxx"] });`

# 插件顺序
- [plugins/presets order ](https://github.com/babel/babel/issues/4882)
- [Babel Plugin "Ordering"](http://thejameskyle.com/babel-plugin-ordering.html)
- [Discussion: Fix Plugin Ordering](https://github.com/babel/babel/issues/5623)

# 插件列表
## Transform
代码转译插件，插件包名都是 `babel-plugin-transform` 开头。

- ES3

    - [babel-plugin-transform-es3-member-expression-literals](http://babeljs.io/docs/plugins/transform-es3-member-expression-literals/)：转换属性表达式的保留字属性为字符串，例如 `foo.catch` 转译为 `foo["catch"]`

        保留字属性在 IE8 下不能正常工作，必须使用字符串代替。
        
        历史问题追踪
        
        1. babel-plugin-transform-es3-member-expression-literals 可以转换用户编写代码中的保留字属性为字符串，但 babel 转译后的代码会出现 `exports.default` （default 是保留字），还是存在问题；
        2. 可以使用 es3ify 或者 uglifyjs 处理掉上面提到的问题；
        3. 新版本 babel 6.6 修复了上面的问题，但又引起了其他 bug；
        4. 现在，TODO
        
        相关的讨论参考如下

        - [babel@6.2.0预编译的ES6代码无法在IE8上愉快的运行，各位前辈有办法吗？](https://www.zhihu.com/question/37939963)
        - ["es3-member-expression-literals" not transforming injected 'exports.default'](https://github.com/babel/babel/issues/2817)
        - [react 项目的一个ie8兼容性问题](http://www.aliued.com/?p=3240)
        - [Babel转换es6怎么支持ie8?](https://segmentfault.com/q/1010000005095558)

    - [babel-plugin-transform-es3-property-literals](http://babeljs.io/docs/plugins/transform-es3-property-literals/)：转换保留字属性为字符串；

- ES5

    - [babel-plugin-transform-es5-property-mutators](http://babeljs.io/docs/plugins/transform-es5-property-mutators/)：转换对象字面量的 getter 和 setter 为 Object.defineProperties，例如：

        源代码

        ```javascript
        var foo = {
          get bar() {
            return "bar";
          }
        };
        ```

        编译代码

        ```
        var foo = Object.defineProperties({}, {
          bar: {
            get: function () {
            return "bar";
            },
            enumerable: true,
            configurable: true
          }
        });
        ```

        getter 和 setter 属于 ES5 新语法，在 IE8 上不支持。

- ES2015

    - [babel-plugin-transform-es2015-arrow-functions](http://babeljs.io/docs/plugins/transform-es2015-arrow-functions/)：转换箭头函数，存在配置选项 `spec`，开启后使用 bind 方式实现作用域绑定，默认不开启
    - [babel-plugin-transform-es2015-block-scoped-functions](http://babeljs.io/docs/plugins/transform-es2015-block-scoped-functions/)：确块级别的函数声明在块作用域里
    - [babel-plugin-transform-es2015-block-scoping](http://babeljs.io/docs/plugins/transform-es2015-block-scoping/)：转换 ES2015 块作用域（const 和 let）为 ES5 实现，存在配置选项 `tdz`，开启后会将问题代码转译为抛异常（例如引用未声明变量），默认不开启。
    - [babel-plugin-transform-es2015-classes](http://babeljs.io/docs/plugins/transform-es2015-classes/)：转换 ES2015 类为 ES5 实现，存在配置选项 `loose`，开启后方法变得可枚举（enumerable），并且方法的定义基于原型简单实现，默认不开启。

        由于 ES5 的限制，JavaScript 内建类，如 `Date`, `Array`, `DOM` 等不能被继承，可以考虑使用 [babel-plugin-transform-builtin-extend](https://github.com/loganfsmyth/babel-plugin-transform-builtin-extend)，它基于  `Object.setPrototypeOf` 和 `Reflect.construct` 实现，但也存在一些限制。

    - [babel-plugin-transform-es2015-computed-properties](http://babeljs.io/docs/plugins/transform-es2015-computed-properties/)：转译表达式属性语法，存在配置选项 `loose`，默认不开启
    - [babel-plugin-transform-es2015-destructuring](http://babeljs.io/docs/plugins/transform-es2015-destructuring)：转译结构语法，存在配置选项 loose，默认不开启
    - [babel-plugin-transform-es2015-duplicate-keys](http://babeljs.io/docs/plugins/transform-es2015-duplicate-keys/)：转译对象中重复的 key？
    - [babel-plugin-transform-es2015-for-of](http://babeljs.io/docs/plugins/transform-es2015-for-of/)：转译 ES2015 的 for…of 语法为 ES5 实现，存在配置选项 `loose`，默认不开启
    - [babel-plugin-transform-es2015-function-name](http://babeljs.io/docs/plugins/transform-es2015-function-name)：？？？
    - [babel-plugin-transform-es2015-literals](http://babeljs.io/docs/plugins/transform-es2015-literals)：转译 ES2015 整数和 unicode 字面量为 ES5 代码，例如：

        ES2015

        ```javascript
        var b = 0b11; // binary integer literal
        var o = 0o7; // octal integer literal
        const u = 'Hello\u{000A}\u{0009}!'; // unicode string literals, newline and tab
        ```

        ES5

        ```javascript
        var b = 3; // binary integer literal
        var o = 7; // octal integer literal
        const u = 'Hello\n\t!'; // unicode string literals, newline and tab
        ```

    - [ES2015 object super transform](http://babeljs.io/docs/plugins/transform-es2015-object-super)：转译 ES2015 的 super 语法
    - [babel-plugin-transform-es2015-parameters](http://babeljs.io/docs/plugins/transform-es2015-parameters)：转译 ES2015 的方法参数为 ES5 代码，方法参数可能使用了解构，默认值，Rest 语法
    - [babel-plugin-transform-es2015-shorthand-properties](http://babeljs.io/docs/plugins/transform-es2015-shorthand-properties/)：转译 ES2015 的缩写属性为 ES5 代码，例如 `var o = { a, b, c };` 转译为 `var o = { a: a, b: b, c:c };`
    - [babel-plugin-transform-es2015-spread](http://babeljs.io/docs/plugins/transform-es2015-spread/)：转译 ES2015 的 rest 语法为 ES5 代码，
    - [babel-plugin-transform-es2015-sticky-regex](http://babeljs.io/docs/plugins/transform-es2015-sticky-regex/)：？？？
    - [babel-plugin-transform-es2015-template-literals](http://babeljs.io/docs/plugins/transform-es2015-template-literals/)：转译 ES2015 的模板字符串为 ES5 代码，例如 ``foo${bar}`` 转译为 `"foo" + bar;`，存在配置选项 loose 和 spec，默认不开启

        开启 spec 后，模板中的表达式均使用 `String()` 方法包装，相关讨论参考 [ babel/babel#1065](https://github.com/babel/babel/issues/1065)

    - [babel-plugin-transform-es2015-typeof-symbol](http://babeljs.io/docs/plugins/transform-es2015-typeof-symbol/)：ES2015 提供了一个新的原生类型 [Symbol](http://babeljs.io/docs/learn-es6#symbols)，执行 `typeof Symbol()` 的时候返回 `"symbol"`，该插件将使用 ES5 方法来封装表达式实现类似的效果，例如：

        `typeof Symbol() === "symbol";`

        ```javascript
        var _typeof = function (obj) {
        return obj && obj.constructor === Symbol ? "symbol" : typeof obj;
        };

        _typeof(Symbol()) === "symbol";
        ```

        备注：Symbol 是新的 API，交给 polyfill 提供，该插件只是转译 `typeof Symbol()` 返回 `"symbol"` 这个语法。

    - [babel-plugin-transform-es2015-unicode-regex](http://babeljs.io/docs/plugins/transform-es2015-unicode-regex/)：转译 unicode 正则表达式
 
- ES2016

    - [babel-plugin-transform-exponentiation-operator](http://babeljs.io/docs/plugins/transform-exponentiation-operator/)：转译 ES2016 的取幂操作符 `**`，例如 `2 ** 3` 转译为 `2 * 2 * 2`

- ES2017

    - [babel-plugin-transform-async-to-generator](http://babeljs.io/docs/plugins/transform-async-to-generator/)：转译 ES2017 的 async 为 generator 

- Modules：ES2015 模块化代码的转译

    - [babel-plugin-transform-es2015-modules-amd](http://babeljs.io/docs/plugins/transform-es2015-modules-amd/)：转译 ES2015 模块实现为 AMD 规范的代码
    - [babel-plugin-transform-es2015-modules-commonjs](http://babeljs.io/docs/plugins/transform-es2015-modules-commonjs/)：转译 ES2015 模块实现为 CommonJS 规范的代码，存在配置选项 `loose`、`allowTopLevelThis` 和 `strict`

        需要注意的是，Babel6 的转译代码不再执行 `module.exports = exports['default']`，在源代码里使用 CommonJS 的 require 引入模块时需要改写成 `require("your-module").default`，或者使用插件 [babel-plugin-add-module-exports](https://www.npmjs.com/package/babel-plugin-add-module-exports) 解决该问题。 

    - [babel-plugin-transform-es2015-modules-systemjs](http://babeljs.io/docs/plugins/transform-es2015-modules-systemjs/)：转译 ES2015 模块实现为 SystemJS 规范的代码
    - [babel-plugin-transform-es2015-modules-umd](http://babeljs.io/docs/plugins/transform-es2015-modules-umd/)：转译 ES2015 模块实现为 UMD 规范的代码

- Experimental：实验特性，还未被 TC39 审核通过

    - [babel-plugin-transform-async-generator-functions](http://babeljs.io/docs/plugins/transform-async-generator-functions/)：???
    - [babel-plugin-transform-async-to-module-method](http://babeljs.io/docs/plugins/transform-async-to-module-method/):???
    - [babel-plugin-transform-class-constructor-call](http://babeljs.io/docs/plugins/transform-class-constructor-call/)：Class constructor call 这个特性已经被 TC39 剔除，Babel7 将删除这个插件
    - [babel-plugin-transform-class-properties](http://babeljs.io/docs/plugins/transform-class-properties/)：转译 es2015 的静态类熟悉和 ES2016 的初始化属性语法，还处于试验中？
    - [babel-plugin-transform-decorators](http://babeljs.io/docs/plugins/transform-decorators/)：转译装饰器语法，由于装饰器语法还没有正式通过 TC39，Babel6 还不能正确转译，相关讨论参考 [babel/babel#2645](https://github.com/babel/babel/issues/2645)，可以暂时使用第三方插件 [transform-decorators-legacy](https://github.com/loganfsmyth/babel-plugin-transform-decorators-legacy) 或者 babel5
    - [babel-plugin-transform-do-expressions](http://babeljs.io/docs/plugins/transform-do-expressions/)：???
    - [babel-plugin-transform-export-extensions](http://babeljs.io/docs/plugins/transform-export-extensions/)：转译 export-from 语法，还没有正式通过 TC39，可以参考下列文献

        - [Proposal: Additional export-from statements in ES7 (Withdrawn)](https://github.com/leebyron/ecmascript-more-export-from)
        - [ECMAScript Proposal: export ns from](https://github.com/leebyron/ecmascript-export-ns-from)
        - [ECMAScript Proposal: export default from](https://github.com/leebyron/ecmascript-export-default-from)

    - [babel-plugin-transform-function-bind](http://babeljs.io/docs/plugins/transform-function-bind/)：转译操作符 `::`（执行方法作用域绑定），还没有正式通过 TC39，可以参考下列文献

        - [Proposal](https://github.com/zenparsing/es-function-bind)
        - [Babel Blog: Function Bind Syntax](http://babeljs.io/blog/2015/05/14/function-bind)

    - [babel-plugin-transform-object-rest-spread](http://babeljs.io/docs/plugins/transform-object-rest-spread/)：转译对象的 rest 语法， 还没有正式通过 TC39，可以参考下列文献

        - [Proposal: Object Rest/Spread Properties for ECMAScript](https://github.com/sebmarkbage/ecmascript-rest-spread)
        - [Spec](https://github.com/sebmarkbage/ecmascript-rest-spread/blob/master/Spec.md)

- Minification：这些插件在 [babili](https://github.com/babel/babili) 下维护，可用于简化 Babel 的编译代码，参考 [Babili (babel-minify)](http://babeljs.io/blog/2016/08/30/babili)

    - [babel-plugin-transform-member-expression-literals](http://babeljs.io/docs/plugins/transform-member-expression-literals/)：转译属性表达式为正确的标识符属性，例如 `foo["bar"]` 转译为 `foo.bar;`
    - [babel-plugin-transform-merge-sibling-variables](http://babeljs.io/docs/plugins/transform-merge-sibling-variables/)：合并变量声明，例如 `var foo = "bar";var bar = "foo";` 转译为 `var foo = "bar", bar = "foo";`
    - [babel-plugin-transform-minify-booleans](http://babeljs.io/docs/plugins/transform-minify-booleans/)：转译布尔值为 `!0` 和 `!1`
    - [babel-plugin-transform-property-literals](http://babeljs.io/docs/plugins/transform-property-literals/)：转译字符串属性为正确的标识符，例如 ` {"bar": function () {}};` 转译为 `{bar: function () {}};`
    - [babel-plugin-transform-remove-console](http://babeljs.io/docs/plugins/transform-remove-console/)：删除 `console` 语句
    - [babel-plugin-transform-remove-debugger](http://babeljs.io/docs/plugins/transform-remove-debugger/)：删除 `debugger` 语句
    - [babel-plugin-transform-simplify-comparison-operators](http://babeljs.io/docs/plugins/transform-simplify-comparison-operators/)：简化比较操作符，例如 `"foo" === "bar"` 转译为 `"foo" == "bar"`
    - [babel-plugin-transform-undefined-to-void](http://babeljs.io/docs/plugins/transform-undefined-to-void/)：转译 `undefined` 为 `void`，例如 `foo === undefined` 转译为 `foo === void 0;`

        由于一些 JavaScript 实现可以覆盖 `undefined`，这可能引起 bug，而且还难以调试追踪，使用该插件可以避免该类问题。

    - [babel-plugin-transform-inline-environment-variables](http://babeljs.io/docs/plugins/transform-inline-environment-variables/)：转译环境变量，例如 `process.env.NODE_ENV === "development"` 转译为 `"development" === "development"`
    - [ babel-plugin-transform-node-env-inline](http://babeljs.io/docs/plugins/transform-node-env-inline/)：转译 `process.env.NODE_ENV` 判断表达式为常量，例如 `process.env.NODE_ENV === "development"` 转译为 `true` 或 `false`

- React

    略

- Others

    - [babel-plugin-transform-eval](http://babeljs.io/docs/plugins/transform-eval/)：编译 `eval` 中的字符串代码，例如 `eval("(() => 'foo')");` 转译为 `eval("(function () { return 'foo'; })");`
    - [babel-plugin-transform-flow-comments](http://babeljs.io/docs/plugins/transform-flow-comments/)
    - [babel-plugin-transform-flow-strip-types](http://babeljs.io/docs/plugins/transform-flow-strip-types/)
    - [babel-plugin-transform-jscript](http://babeljs.io/docs/plugins/transform-jscript/)
    - [babel-plugin-transform-object-assign](http://babeljs.io/docs/plugins/transform-object-assign/)：替换 `Object.assign` 为內建的工具函数
    - [babel-plugin-transform-object-set-prototype-of-to-assign](http://babeljs.io/docs/plugins/transform-object-set-prototype-of-to-assign/)：替换 `Object.setPrototypeOf` 为內建的工具函数
    - [babel-plugin-transform-proto-to-assign](http://babeljs.io/docs/plugins/transform-proto-to-assign/)：转译 `__proto__` 赋值语句为內建的工具函数处理
    - [babel-plugin-transform-regenerator](http://babeljs.io/docs/plugins/transform-regenerator/)
    - [babel-plugin-transform-runtime](http://babeljs.io/docs/plugins/transform-runtime/)：剔除转译代码中的工具函数，改从外部引用，参考示例 transform-runtime[](./babel-plugin-transform-runtime)
    - [babel-plugin-transform-strict-mode](http://babeljs.io/docs/plugins/transform-strict-mode/)：在每个文件的顶部生成 `"use strict";` - 开启 [strict mode](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode)，在使用了 babel-plugin-transform-es2015-modules-commonjs 时，这个插件默认被启用


## Syntax Plugins
语法编译插件，插件包名都是以 `babel-plugin-syntax` 开头。需要注意的是 Transform 插件会自动继承或使用这些 Syntax 插件，而不需要在配置中再指定这些插件。

- [babel-plugin-syntax-async-generators](http://babeljs.io/docs/plugins/syntax-async-generators/)：只编译语法，实际运用请使用插件 [babel-plugin-transform-async-generator-functions](http://babeljs.io/docs/plugins/transform-async-generator-functions/) 和 [babel-plugin-transform-regenerator](http://babeljs.io/docs/plugins/transform-regenerator/)
- [babel-plugin-syntax-class-properties](http://babeljs.io/docs/plugins/syntax-class-properties/)：可以编译类属性，但只编译语法，实际运用请使用插件 [babel-plugin-transform-class-properties](http://babeljs.io/docs/plugins/transform-class-properties/)
- [babel-plugin-syntax-decorators](http://babeljs.io/docs/plugins/syntax-decorators/)：可以编译装饰器语法（参考 [decorators](https://github.com/wycats/javascript-decorators/blob/master/README.md)），但只编译语法，实际运用请使用插件 [babel-plugin-transform-decorators](http://babeljs.io/docs/plugins/transform-decorators/)
- [babel-plugin-syntax-do-expressions](http://babeljs.io/docs/plugins/syntax-do-expressions/)：可以编译 [do-expressions](http://wiki.ecmascript.org/doku.php?id=strawman:do_expressions)，但只支持编译语法，实际运用请使用插件 [babel-plugin-transform-do-expressions](http://babeljs.io/docs/plugins/transform-do-expressions)
- [babel-plugin-syntax-export-extensions](http://babeljs.io/docs/plugins/syntax-export-extensions/)：可以编译 [export extensions](https://github.com/leebyron/ecmascript-more-export-from)，但只支持编译语法，实际运用请使用插件 [babel-plugin-transform-export-extensions](http://babeljs.io/docs/plugins/transform-export-extensions/)
- [babel-plugin-syntax-flow](http://babeljs.io/docs/plugins/syntax-flow/)
- [babel-plugin-syntax-function-bind](http://babeljs.io/docs/plugins/syntax-function-bind/)
- [babel-plugin-syntax-function-sent](http://babeljs.io/docs/plugins/syntax-function-sent/)
- [babel-plugin-syntax-jsx](http://babeljs.io/docs/plugins/syntax-jsx/)
- [babel-plugin-syntax-object-rest-spread](http://babeljs.io/docs/plugins/syntax-object-rest-spread/)

## Misc Plugins
一些工具类插件

- [babel-plugin-external-helpers](http://babeljs.io/docs/plugins/external-helpers/)：控制 babel 编译模块使用外部的工具函数
- [babel-plugin-undeclared-variables-check](http://babeljs.io/docs/plugins/undeclared-variables-check/)：当代码中出现引用未声明的变量时，抛出错误

## 社区插件
https://www.npmjs.com/search?q=babel-plugin


- [babel-root-import](https://github.com/michaelzoidl/babel-root-import) - Add the opportunity to import modules by the root path. - [michaelzoidl](https://github.com/michaelzoidl)

# loose 模式
许多 Babel 插件有两种工作模式：

- default：尽可能符合 ES6 语义；
- loose：转译更快，生成更简洁的 ES5 代码，兼容性更好；

有哪些插件有 loose 模式呢？

- babel-plugin-transform-es2015-classes
- babel-plugin-transform-es2015-computed-properties
- babel-plugin-transform-es2015-destructuring
- babel-plugin-transform-es2015-for-of
- babel-plugin-transform-es2015-template-literals
- babel-plugin-transform-es2015-modules-commonjs

正常转译与 loose 模式的具体区别

参考 [loose-mode](./loose-mode)

实际应用

如果要一个个给这些插件开启 loose 模式，维护起来太过麻烦，从 Babel v6.13+ 开启，` babel-preset-es2015` 提供了 loose 选项，在这之前可以使用 [babel-preset-es2015-loose](https://github.com/bkonkle/babel-preset-es2015-loose)。

参考文献

- [Babel 6: loose模式](http://www.w3ctech.com/topic/1708)
- [Babel 6: loose mode](http://www.2ality.com/2015/12/babel6-loose-mode.html)

# 自定义插件
- [Babel 插件手册](https://github.com/thejameskyle/babel-handbook/blob/master/translations/zh-Hans/plugin-handbook.md)

# TODO
- [babel-plugin-add-module-exports](https://github.com/59naga/babel-plugin-add-module-exports) - Fix [babel/babel#2212](https://github.com/babel/babel/issues/2212) - Follow the babel@5 behavior for babel@6. by [59naga](https://github.com/59naga)
