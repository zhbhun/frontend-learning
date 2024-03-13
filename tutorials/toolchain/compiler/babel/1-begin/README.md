快速上手
========

Babel 是 JavaScript 编译器，支持 ES2015 及以上版本的 JavaScript，让我们无须等待浏览器的支持，就可以使用新版本的语法，例如箭头函数。此外，Babel 可以转换 JSX 语法，也支持生成 source map，调试起来更加的简单。

- 支持 ES2015 及其以上版本的语法
- 支持 JSX 和 React
- 支持 Flow 和 TypeScript
- 插件化
- 可调式
- 遵从规范

备注：

1. 对 ES 不了解的可以参考 [ES5, ES6, ES2016, ES.Next: JavaScript 的版本是怎么回事？「译」](https://huangxuan.me/2015/09/22/js-version/)。
2. Babel 是基于插件组成的，可以自己定制插件来控制代码编译。

## [入门示例](./)

1. `npm install`：安装依赖 `@babel/core`、`@babel/cli` 和 `@babel/preset-env`

    @babel/core 是 babel 的核心模块

    @babel/cli 是 babel 提供的命令行工具，用于命令行转码

    @babel/preset-env 是 babel 针对最新 JavaScript 语法配置的规则集

2. `.babelrc`：babel 配置文件，用来设置转码规则和插件，一般放在项目的根目录

    ```json
    {
      "presets": ["@babel/preset-env"]
    }
    ```

3. `npm run build`：使用 babel 编译 src 目录下的代码

    `babel ./src -d ./lib -s`

4. 分析编译结果

    源代码

    ```javascript
    // src/index.js
    const { result } = { result: 'Hello World!' };
    console.log(result);
    ```  

    编译代码

    ```javascript
    // lib/index.js
    "use strict";

    var _result = {
    result: 'Hello World!'
    },
        result = _result.result;
    console.log(result);
    //# sourceMappingURL=index.js.map
    ```

5. 总结

    示例源代码使用了 ES2015 的对象解构语法，目前大部分浏览器还是不支持该语法，babel 编译后，转换成符合 ES5 语法的代码。
