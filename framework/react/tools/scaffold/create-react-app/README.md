create-react-app 是一个零配置的 React 应用创建工具。

# 理念
 
- 单一依赖：只有一个构建依赖，并基于 Webpack，Babel，ESLint 提供了一套完整的体验。
- 约定优于配置：默认不需要做任何配置，针对开发和生成已经提供了合适的配置，只要关注编码接口。
- 灵活：可以输出定制化的配置

# 特性

- 支持 React，JSX，ES6
- 支持额外的实验性语法扩展，例如：对象展开操作符
- 自带开发服务器，可以检查通用的错误
- 支持 CSS 和 图片文件模块化
- 自动添加 CSS 前缀
- 支持项目构建

# 原理
基于许多优秀的开源工具实现：

- webpack，webpack-dev-server，html-webpack-plugin，style-plugin...
- Babel
- Autoprefixer
- ESLint
- Jest
- ...

项目组成

- [babel-preset-react-app](https://github.com/facebookincubator/create-react-app/tree/master/packages/babel-preset-react-app)
- [create-react-app](https://github.com/facebookincubator/create-react-app/blob/master/packages/create-react-app)
- [eslint-config-react-app](https://github.com/facebookincubator/create-react-app/blob/master/packages/eslint-config-react-app)
- [react-dev-utils](https://github.com/facebookincubator/create-react-app/blob/master/packages/react-dev-utils)
- [react-scripts](https://github.com/facebookincubator/create-react-app/blob/master/packages/react-scripts)

# 用法
- `create-react-app <project-directory>`：创建项目
- `npm start`：启动开发服务器
- `npm test`：测试
- `npm build`：构建
- `npm eject`：输出项目模板

# 限制
- 不支持服务端渲染
- 不支持 CSS Module
- 不支持 LESS 或 SASS
- 不支持组件热加载
- 不支持一些实验性的语法扩展，例如：装饰器

# 使用场景
很多新手在创建单页 React 应用都碰到了各种各样的问题，例如 [loud](https://medium.com/@ericclemmons/javascript-fatigue-48d4011b6fc4#.n68hj4egx) 和 [clear](https://twitter.com/thomasfuchs/status/708675139253174273)。create-react-app 正是为解决这个问题而生的工具，它非常适合新手创建简单的应用，不需要任何配置文件，而只要一个依赖 `react-scripts`。

但是 create-react-app 不支持高级配置，例如：上文提到的一些限制。如果需要支持高级配置，可以使用 `react-create-app` 的 `eject` 命令来输出配置作为项目模板使用。

# 示例
- `./feature-test`：create-react-app 创建项目的特性测试
- ...