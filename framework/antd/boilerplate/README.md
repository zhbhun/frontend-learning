Antd Design 项目配置模板

- `yarn install` 或 `npm install`：安装依赖；
- `npm run dll`：依赖有更新时，需要重新运行该命令；
- `npm start`：启动开发服务器
- `npm run product`：打包生产环境文件；
- `debug.html`：开发环境入口
- `index.html`：生成环境入口

# 配置要点
- 第三方库拆分：polyfill，common，react，router，antd

    参考 webpack.DllPlugin

- 避免 antd 打包所有组件

    参考 `.babelrc` 配置插件 `import`

- 解决打包性能问题：使用 DllPlugin，使用 eval sourcemap...
- 优化 webpack-dev-server 控制台信息

    参考 webpack.ProgressPlugin 和 webpack-dev-middleware reporter

- 解决 moment 所有国际化文件被打包的问题（不需要支持国际化的话）

    参考 webpack.ContextReplacementPlugin

- 实现模块热加载

    参考 react-hot-loader
