# 学习笔记：cordis

## 偏好

- 版本主线：cordis 4.0（monorepo master，当前 4.0.0-rc.8）；与 3.x 的差异不系统展开，仅在课程必要处注明。
- 学习取向：机制与实践并重——核心概念配可运行实例验证行为，论文与源码作为深挖入口。
- 主题边界：cordis 核心（`packages/core`）、cordiverse 官方插件（loader、hmr、include、group、timer、logger-console、utils）与官方工程工具（create-cordis、boilerplate）；Koishi、Satori、Minato 等 Koishi 生态不纳入，仅在背景处一句话提及与 cordis 的关系。
- 运行环境：TypeScript、Node.js ≥ 20（沿工程模板约束）；cordis 核心仅依赖 cosmokit 与 @standard-schema/spec，无 Node 专有依赖，同构可跑浏览器。
- 范例媒介：优先在 Storybook Canvas 内嵌可交互实例（浏览器环境直跑 cordis）；依赖文件系统或进程行为的课（loader、HMR、发布）用 Node 脚本加代码块与输出呈现。

## 工作笔记

- cordis 尚无已部署的官方文档站：`cordiverse/docs` 是 VitePress 文档源码（zh-CN 完整，对应 4.0 线），但 cordis.js.org 是域名停放页、GitHub Pages 未启用；核心包 README 的 Documentation 链接指向引用方 DeepSeek Harness 文档站的 cordis-primer。写课时以安装版本的类型与源码为准，文档仅作交叉参考。
- 4.0 API 未稳定（官方声明 may change without notice）；每课动笔前先对照当时安装的版本核对 API 归属。
