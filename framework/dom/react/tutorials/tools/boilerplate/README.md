- [如何更好的组织 React 项目的代码？](https://medium.com/@alexmngn/how-to-better-organize-your-react-applications-2fd3ea1920f1)
- [create-next-app](https://github.com/segmentio/create-next-app)

---

React 模板模板。

模板特性

- 热加载：支持 React 和 Redux 的热加载
- 高性能：开发服务器实现预构建缓存，提升构建和热加载性能
- 代码划分：支持多个第三方库的代码划分

# 项目结构

```
.
├── build
│   └── ...
├── doc
│   ├── ...
├── node_modules
│   ├── ...
├── package.json
├── public
│   ├── favicon.ico
│   └── index.html
├── README.md
├── scripts
│   ├── build.js
│   └── start.js
├── src
│   ├── actions
│   ├── components
│   ├── containers
│   ├── index.js
│   ├── middleware
│   ├── reducers
│   ├── routes.js
│   └── store
├── webpack
│   ├── env.js
│   ├── paths.js
│   ├── runBuild.js
│   ├── runDevServer.js
│   ├── runPrebuild.js
│   ├── setupCompiler.js
│   ├── WebpackDevConfigFactory.js
│   ├── WebpackDllConfigFactory.js
│   ├── WebpackProdConfigFactory.js
│   └── WebpackProgressBarHandler.js
└── yarn.lock
```

# 用法
## 安装依赖

- 开发依赖：webpack，babel，eslint 等
- 生产依赖：react，redux，react-router 等

## 路径配置
项目的路径信息默认配置在 `webpack/paths.js`，主要包含项目的源代码输入，构建输出等路径信息。

- `app`：根路径
- `appPrebuild`:构建缓存
- `appBuild`：构建输出路径
- `appPublic`：静态资源路径
- `appHtml`：入口 HTML 页面路径
- `appIndexJs`：源代码入口路径
- `appPackageJson`：`pacakge.json` 路径
- `appSrc`：源代码路径
- `appNodeModules`：第三方依赖路径

## 脚本设置
- `scripts/start.js`

    启动开发服务器

- `scripts/build.js`

    生成环境构建

## 运行命令

- `npm run lint`：检查代码
- `npm start`：启动开发服务器
- `npm run build`：生产环境编译

备注：运行开发环境和生产环境之前，必须先预编译。

# 进阶
参考 `doc/实现思路`。


# TODO
- [ ] 解决生产环境打包构建的第三方库 hash 值一直变化的问题
- [ ] 完善文档
