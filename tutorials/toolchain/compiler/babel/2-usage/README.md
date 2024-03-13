使用指南
========

Babel 可以在命令行中使用，也可以在浏览器环境下使用，还可以使用 babel 提供的 api 自己编译源代码。

使用要点：

1. 什么场景下该通过哪种方式使用 babel？

    命令行，浏览器，构建系统，API 等

2. 配置：使用什么规则，什么插件？

    影响支持的语法和编译结果

## babelrc

[`.babelrc`](http://babeljs.io/docs/usage/babelrc/) 文件是 JSON 字符串，可以配置除了回调函数以外的所有选项。通常放于项目根目录下，对于特殊的子模块，也可以在对应目录单独配置 `.babelrc`。babel 在编译文件的时候会先查找文件所在目录的 `.babelrc`，如果不存在，会一层层转到上级目录查找，直到找到为止，或查到根目录。

```json
{
  "presets": [], // 预设规则
  "plugins": [] // 插件
}
```

除了将配置放到 `.babelrc` 外，也可以设置在 `package.json` 的 `babel` 属性中，例如：

```json
{
  "name": "my-package",
  "version": "1.0.0",
  "babel": {
    // my babel config here
  }
}
```

关于配置项的说明可参考下文 [Babel 设置](../3-setting)。

## Node.js
### [@babel/core](https://babeljs.io/docs/en/v7-migration-api#babel-core)

@babel/core 是 babel 提供的 node api，可以自己调用 babel/core 来对源代码进行编译。

基本用法：

1. 安装 @babel/core

    `npm install @babel/core --save-dev`

2. 使用接口

    - `babel.transform(code: string, options?: Object)`：编译字符串，返回对象包含  code，source map，和 AST；
    - `babel.transformFile(filename: string, options?: Object, callback: Function)`：异步编译文件；
    - `babel.transformFileSync(filename: string, options?: Object)`：同步编译文件；
    - `babel.transformFromAst(ast: Object, code?: string, options?: Object)`：编译给定的 AST；

    使用场景：许多工具需要 Babel 进行前置转码，如 webpack 的加载器 babel-loader 里就使用了 babel-core。

    参考文档 [Babel API](http://babeljs.io/docs/en/babel-core/)

3. [测试示例](./core)

### [@babel/cli](https://babeljs.io/docs/en/babel-cli)

@babel/cli 是 Babel 提供的命令行工具，将源代码编译成可以在目标环境正常运行的代码（转译语法和补充缺失的 API）。

1. 安装命令：`npm install --save-dev @babel/core @babel/cli @babel/preset-env`

2. 基本用法：

    - `babel ./src/index.js`：编译指定文件，结果输出到标准输出（控制台）
    - `babel ./src/index.js -o ./lib/index.js`：变异指定文件，结果输出到指定文件
    - `babel ./src -d ./lib`：编译目录下的文件，结果输出到指定目录
    - `babel ./src -d ./lib -s`：同上，而且生成 source map

    备注：`babel` 会根据配置文件 `.babelrc` 指定的编译规则去编译源代码，也可以在命令行的选项 `--presets` 和 `--plugins` 中指定编译规则。

3. 使用场景：需要编译源文件生成对应的转码文件时，就可以使用 babel-cli，现在很多 npm 包都会提供 lib 目录，对应的就是源代码目录 src 下的文件。

    更多用法参考 `babel --help`，参考文档 [babel-cli](http://babeljs.io/docs/en/babel-cli/)。

4. [测试示例](./cli)

### [@babel/node](https://babeljs.io/docs/en/babel-node)

@babel/node 是一个类似 @babel/cli 的命令行工具，它提供一个支持 ES6 的 REPL 环境。它支持 Node 的 REPL 环境的所有功能，而且可以直接运行 ES6 代码。

安装命令：`npm install -g @babel/core @babel/node` —— 全局安装，实际项目中最好本地安装

基本用法：

- `babel-node`：打开 babel-node 提供的 REPL 环境；
- `babel-node ./src/index.js`：直接执行源代码；

备注：babel-node 支持部分 ES6 语法，还是需要配置 `.babelrc` 来指定编译规则。

使用场景：主要用来代替 node 命令使用，node repl 对 es6 或者更新版本支持的不够不完善，想在命令行里运行新语法时，可以使用 babel-node。此外，还可以使用 babel-node 直接运行使用了新语法的脚本文件。

更多用法参考 `babel-node --help`，参考文档 [babel-node](https://babeljs.io/docs/en/babel-node)。

### [@babel/register](http://babeljs.io/docs/en/babel-register)

@babel/register 会改写 node 的 require 命令，为它加上一个钩子，每当使用 require 加载 `.js`、`.jsx`、`.es` 和 `.es6` 后缀名的文件，就会先用 Babel 进行编译。

基本用法：

1. 安装 babel-register：`npm install @babel/core @babel/register @babel/preset-env --save-dev`；
2. 修改代码入口

    - `require('@babel/register')`：默认；
    - `require('@babel/register')({ presets: ['@babel/preset-env'] })`：指定编译规则；
    - `require('@babel/register')({ ignore: /regex/ })`：忽略模块的匹配正则表达式，默认忽略 node_modules 下的模块，也可以是布尔值，字符串数组和函数，false 表示不忽略；
    - `require('@babel/register')({ only: /regex/ })`：编译模块的匹配正则表达式
    - `require('@babel/register')({ extensions: [".es6", ".es", ".jsx", ".js"] })`：编译模块的文件后缀名

3. 运行：`node xxx.js`

备注：

1. @babel/register 只会对 require 命令加载的文件编译，而不会对当前文件编译；
2. 在 @babel/register 之前的模块是不会被 babel 编译的，所以 @babel/register 必须在入口的最上方引入（在其他模块之前引入）；
3. @babel/register 是实时转码，只适合在开发环境使用；
4. @babel/register 也会读取 `.babelrc` 中的配置；

疑问：什么场景下需要使用 @babel/register？

## 浏览器
### babel-repl

[babel-repl](https://babeljs.io/repl) 是 babel 提供的在线编译器，可以在线将 ES6 代码转为 ES5 代码。

基本用法：在左侧编写源代码的同时，右侧会实时输出 babel 编译结果，下方会显示执行结果。

- Evaluate：可以选择是否需要执行代码；
- Presets：设置编译规则，默认开启 `es2015`,`react` 和 `stage-2`；
- Line Wrap：换行
- Minify：压缩

其他在线编译器

- [JSFiddle](https://jsfiddle.net/fh5whLfd/)
- [JSBin](http://jsbin.com/rokimopuse/edit?html,js,console,output)
- [Codepen](http://codepen.io/anon/pen/dOGgeO)

使用场景：想在线编写使用了新语法的程序时，就可以使用 babel-repl。

### @babel/standalone

Babel 提供了预编译版本 [@babel/standalone](https://github.com/babel/babel-standalone#usage)，让我们可以在非 node 环境下使用 babel，如浏览器。类似于 babel-repl，我们也可以将 babel-standalone 用于自己项目的网页上。但在网页中实时将 ES6 转为 ES5，对性能有影响，生产环境需要加载已经编译完成的脚本 —— 通常用于开发环境。

基本用法：

1. 引入 `babel-standalone`

    `https://unpkg.com/@babel/standalone@7.0.0/babel.min.js`；

2. 插入代码

    - `<script type="text/babel">/*xxx*/</script>`
    - `<script type="text/babel" src="xxx.js"></script>`
    - `<script type="text/babel" data-presets="es2015,stage-2"></script>`

完整示例：

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <title></title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
  </head>
  <body>
    <div id="output"></div>
    <!-- Load Babel -->
    <script src="https://unpkg.com/@babel/standalone@7.0.0/babel.min.js"></script>
    <!-- Your custom script here -->
    <script type="text/babel">
    const getMessage = () => "Hello World";
    document.getElementById('output').innerHTML = getMessage();
    </script>
  </body>
</html>
```

备注：

1. @babel/standalone 默认启用了所有的标准插件和预设，支持最新的 ES 语法。
2. [babel-browser](https://babeljs.io/docs/usage/browser/) 已经被废弃，可以使用 [ @babel/standalone](https://github.com/Daniel15/babel-standalone) 来代替 —— babel-standalone 可以用于非 node 环境，不仅仅是浏览器。 

使用场景：要在本地项目的网页上运行 es6 等最新版本的代码，就可以使用 babel-standalone。

## 构建系统

- webpack
- gulp
- browserify
- ...

## 其他用法

- 模板引擎

    - [Pug](https://github.com/jstransformers/jstransformer-babel)

- 测试框架：略
- 更多参考 [Using Babel](http://babeljs.io/docs/setup/)

## 参考文献

- [Babel Setup](https://babeljs.io/setup)
- [Babel 入门教程](http://www.ruanyifeng.com/blog/2016/01/babel.html)
