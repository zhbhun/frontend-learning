# 安装依赖
- webpack

    ```
    yarn add webpack@^1.14.0 --dev
    yarn add webpack-dev-server@^1.16.2 --dev
    yarn add babel-loader@^6.2.7 --dev
    yarn add case-sensitive-paths-webpack-plugin@^1.1.4 --dev
    yarn add css-loader@~0.23.1 --dev
    yarn add eslint-loader@^1.6.1 --dev
    yarn add extract-text-webpack-plugin@^1.0.1 --dev
    yarn add file-loader@~0.9.0 --dev
    yarn add html-webpack-plugin@^2.26.0 --dev
    yarn add add-asset-html-webpack-plugin@^1.0.2 --dev
    yarn add less-loader@^2.2.3 --dev
    yarn add postcss-loader@~1.1.1 --dev
    yarn add react-hot-loader@3.0.0-beta.6 --dev
    yarn add style-loader@^0.13.1 --dev
    yarn add url-loader@~0.5.7 --dev
    yarn add progress-bar-webpack-plugin@^1.9.2 --dev
    ```

- babel

    ```
    yarn add babel-core@^6.21.0 --dev
    yarn add babel-preset-es2015@^6.18.0 --dev
    yarn add babel-preset-react@^6.16.0 --dev
    yarn add babel-preset-stage-2@^6.18.0 --dev
    ```

- less + autoprefixer

    ```
    yarn add less@^2.6.1 --dev
    yarn add autoprefixer@^6.3.6 --dev
    ```

- eslint

    ```
    yarn add babel-eslint@^7.1.0 --dev
    yarn add eslint@^3.10.0 --dev
    yarn add eslint-plugin-babel@^3.3.0 --dev
    yarn add eslint-plugin-import@^2.2.0 --dev
    yarn add eslint-plugin-jsx-a11y@^2.2.3 --dev
    yarn add eslint-plugin-react@^6.6.0 --dev
    ```

- flow

    ```
    yarn add flow-bin --dev
    ```

- others

    ```
    yarn add chalk@^1.1.3 --dev
    yarn add dotenv@^4.0.0 --dev
    yarn add rimraf@2.5.4 --dev
    yarn add react-dev-utils@~0.4.2 --dev
    yarn add recursive-readdir@^2.1.0 --save
    yarn add redux-devtools@^3.3.1 --dev
    yarn add redux-devtools-dock-monitor@^1.1.1 --dev
    yarn add redux-devtools-log-monitor@^1.0.11 --dev
    yarn add redux-logger@^2.6.1 --dev
    ```

- app

    ```
    yarn add babel-polyfill@^6.20.0
    yarn add humps@^1.1.0
    yarn add lodash@^4.16.1
    yarn add normalizr@^2.2.1
    yarn add react@^15.3.0
    yarn add react-dom@^15.3.0
    yarn add react-redux@^4.4.5
    yarn add react-router@^2.6.1
    yarn add react-router-redux@^4.0.5
    yarn add redux@^3.5.2
    yarn add redux-thunk@^2.1.0
    ```

# 环境配置
## Webpack
- `./webpack/env.js`

    环境变量设置

- `./webpack/paths.js`

    路径设置

- `./webpack/rundDevServer.js`

    启动开发服务器，考虑以下几点：

    - `hot`：热加载，入口添加 `react-hot-loader` 和 `react-dev-utils/webpackHotDevClient`，插件添加 `HotModuleReplacementPlugin`；
    - `historyApiFallback`：支持 HTML5 History 路由；
    - `quiet`：webpack 开发服务器的默认日志可读性较差，使用该选项关闭日志，使用 webpack 事件和插件自行改进
    - `watchOptions`：忽略 node_modules 的模块变动，可以提升一些性能
    - ...

- `./webpack/setUpCompiler.js`

    监听 webpack 刷新和完成事件，利用 `chalk`，`react-dev-utils/clearConsole` 和 `react-dev-utils/formatWebpackMessages` 优化 webpack 的日志输出。此外，利用 `ProgressPlugin` 插件显示初始化和重编译进度。

- `./webpack/WebpackDevConfigFactory.js`：开发服务器配置生成器

    入口

    - `react-hot-loader/patch`：实现 React，Redux 热加载
    - `react-dev-utils/webpackHotDevClient`：代替 `webpack-dev-server/client` 和 `webpack/hot/dev-server` 实现热加载，出现语法错误时可以在网页上层显示相关的语法错误日志。

    加载器

    - `DedupePlugin`：去除重复的模块
    - `eslint-loader`：检查源代码
    - `babel-loader`：编译源代码
    - `less-loader`：预处理 LESS 代码
    - `postcss-loader`：自动设置 CSS 前缀
    - `css-loader`：处理 CSS 中的资源路径
    - `style-loader`：转译 CSS 为 JavaScript 代码
    - `file-loader`：加载 svg 文件
    - `json-loader`：加载 JSON 文件
    - `url-loader`：加载除了 html，js，css，json，svg 之外的文件

    插件

    - `InterpolateHtmlPlugin`：篡改 HTML 变量
    - `HtmlWebpackPlugin`：生成包含打包静态资源的 HTML
    - `DefinePlugin`：定义全局变量
    - `HotModuleReplacementPlugin`：热加载插件
    - `CaseSensitivePathsPlugin`：强制 webpack 区分路径大小写
    - `WatchMissingNodeModulesPlugin`：监听缺失模块的安装情况
    - `NoErrorsPlugin`：编译错误时，阻止生成静态资源

## Babel
- es2015
- stage-2
- react

## ESLint
- 编译器：采用 `babel-eslin` 作为 ESLint 的编译器，可以支持一些实验性的语法，例如：类属性。
- 编译器选项：选择语言版本，源代码类型，以及一些语言特性，例如：JSX，严格模式等
- 环境：支持 browser，node，commonjs，es6，amd 相应的全局变量
- 插件：babel，import，jsx-a11y，react
- 继承：ESLint 推荐配置
- 规则：一些争议配置

## Flow
TODO

# 开发工具
## Atom
- Nuclide
- ...

## Chrome
- React Dev Tool
- Redux Dev Tool

# TODO
1. react: 19KB
2. react + react-dom: 131.KB
3. react + react-dom + react-router + react-redux + redux + redux-thunk + react-router-redux: 181.KB


```
react-with-addons.js	application/javascript	184 kB	2017-01-06T19:55:19.000Z
react-with-addons.min.js	application/javascript	36.2 kB	2017-01-06T19:55:19.000Z
react.js	application/javascript	128 kB	2017-01-06T19:55:19.000Z
react.min.js	application/javascript	21.2 kB	2017-01-06T19:55:19.000Z

---

react-dom-server.js	application/javascript	544 kB	2017-01-06T19:55:20.000Z
react-dom-server.min.js	application/javascript	119 kB	2017-01-06T19:55:20.000Z
react-dom.js	application/javascript	620 kB	2017-01-06T19:55:20.000Z
react-dom.min.js	application/javascript	124 kB	2017-01-06T19:55:20.000Z

```

总共压缩后 74.4 KB
