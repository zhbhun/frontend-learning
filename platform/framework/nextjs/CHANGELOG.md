# Changelog

https://nextjs.org/docs/upgrading

- [9.3](https://nextjs.org/blog/next-9-3)

    - 下一代的静态网站生成实现
    - 预览模式
    - 内置支持 sass 和 sass module
    - 自动静态优化 404 也页面
    - 运行时优化后变小了 32 KB

- [9.2](https://nextjs.org/blog/next-9-2)

    - 内置支持 css 模块
    - 内置支持 css module 模块
    - 改进代码拆分策略
    - 模糊匹配的动态路由

- [9.1.7](https://nextjs.org/blog/next-9-1-7)

    - 客户端 JS 大小减少 3% 到 8%：使用原生的 URL 替换 npm 包 url 
    - 生产构建输出会显示 gzip 后的文件大小
    - 内置支持 fetch、URL 和 Object.assign
    - 优化页面加载：更好的 FCP 和 TTI
    - 支持最新的 JavaScript 特性：ES2020
    - 零配置支持 `next export` 应用
    - Next.js 的核心代码都符合 React 严格模式规范，并且支持开启严格模式校验
    - 自动化测试兼容 Reacct Nightly 版本

- [9.1](https://nextjs.org/blog/next-9-1)

    - 支持 `src` 目录
    - 支持 `public` 目录

- [9.0.7](https://nextjs.org/blog/next-9-0-7)

    - 提升 windows 系统的并发构建稳定性
    - 默认开启 gzip 压缩
    - TypeScript 只会监听“活动”页面的代码，从而使得构建更快和更稳定
    - Next.js 会自动收集匿名使用报告，用于跟踪 Next.js 的功能使用情况
    - 使用点好指示器反馈构建还在进行中
    - Next.js 提供内建的方式
    - 改进 next/head 元素的跟踪
    - 过滤掉 pages 目录下的非路由页面（通过是否输出 React 组件来判断）
    - 运行时优化：只有在使用了 `next/dynamic` 时才会打包相应模块
    - 支持 AppTree

- [9](https://nextjs.org/blog/next-9)

    - 零配置支持 TypeScript

        以前需要使用插件 `@zeit/next-typescript`，现在只要项目中存在 tsx 文件就自动初始化 ts 配置。

    - 基于文件系统的动态路由

        在路径中使用 `[name]` 形式来定义动态路由

    - 自动静态优化
    - API 路由
    - 生产优化

        - 只有链接在出现在 viewport 中时才会预加载目标组件
        - APM 优化
        - 针对 `typeof window` 做 DCE（Dead code elimination） 优化

    - 开发体验优化

        - 开发热加载时左下角提供指示器
        - 控制台输出不再清除

    - 构建输出统计信息
    - 没有路由页面支持输出 apm 配置对象
    - Next.js 核心使用 TypeScript 编写
    - 与 Google Chrome 合作提升 Next.js

        1. module/nomoduel
        2. 提升拆包

- [8.1](https://nextjs.org/blog/next-8-1)

    支持 APM

- [8.0.4](https://nextjs.org/blog/next-8-0-4)

    - 提升构建性能（缓存命中率更高，重新构建速度更快）
    - 运行时代码体积变得更小了
    - 默认提供 viewport meta
    - 新的 `@next/mdx` 插件，支持在 Markdown 里写 JSX 语法

- [8](https://nextjs.org/blog/next-8)

    - 支持 Serverless
    - 大量减少构建时内存使用量
    - 构建时环境配置

        ```js
        // next.config.js
        // next.config.js
        module.exports = {
          env: {
            customKey: 'MyValue'
          }
        }
        // pages/index.js
        export default function IndexPage() {
          return <h1>The value of customKey is: {process.env.customKey}</h1>
        }
        ```

    - Prefetch 性能提升（使用 link preload 替代 script）

        使用 script 进行 prefetch 可能使得页面即使已经可以交互了，但是浏览器仍然显示在加载中。

    - 初始化的 HTML 变得更小了
    - 按需加载 /_error
    - 提升了开发者体验

        1. 使用 websocket 取代原来的轮询机制，从而优化按需编译入口和资源释放
        2. 提前监听接口（原来必须等待代码编译后才开始监听，现在改为编译前）

    - 利用多核 CPU 使得预渲染的静态文件导出变得更快了
    - head 元素去重
    - 安全提升
    
        1. 保证所有 script 标签都设置了 crossOrigin
        2. 删除内联脚本，并配置 CSP 禁止执行内联脚本
        3. 新增示例 with-cookie-auth，演示如何对 API 授权验证

