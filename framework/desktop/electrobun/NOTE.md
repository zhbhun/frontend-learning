# 学习笔记：Electrobun

## 偏好

- 主题是 Electrobun 桌面应用框架本身：主进程 API（`electrobun/bun`）、视图层 API（`electrobun/view`）、RPC、CLI、构建配置、分发与更新都纳入。
- 相邻主题不纳入，只覆盖与 Electrobun 的集成点：Bun 运行时深入、前端框架（React/Vite 等）深入、WebGPU/Three.js 渲染深入。
- Blackboard 自家宿主产品专属能力（`Carrots`/Bunny Ears）不属于通用框架，不纳入。
- 版本基准：electrobun 1.18.1。
- 运行环境：macOS + Bun（`bunx electrobun init`、`bun.lock`）；Windows/Linux 与 bundleCEF 作为知识覆盖，不在本地逐平台验证。
- 范例风格：课程目录内提供可运行的最小 Electrobun 工程（`bunx electrobun dev`）；Storybook 内嵌 Canvas 用浏览器可交互的示意演示（RPC 流程、配置结构等），真实窗口行为以课程内工程为准。

## 工作笔记

- 工作区内 `tester/`（hello-world 纯 Electrobun）与 `vite-tester/`（vanilla TS + Vite HMR）是已有的试验工程，可作课程范例参考。
- 包内类型是精确的一手 API 参考：`tester/node_modules/electrobun/dist/api/`（`bun/` 主进程、`browser/` 视图层、`shared/rpc.ts`）。公开导出面比文档站侧栏更全（GlobalShortcut、Screen、Session、Socket、MessageBox/Notification、three/babylon 适配器）。
- 文档地址迁移过：electrobun.dev 与 docs.electrobunny.ai 均已重定向，现行文档站在 framework.blackboard.sh/electrobun/；`tester/llms.txt` 指向的 blackboard.sh/electrobun/llms.txt 已 404。
- package.json 中 `./carrot` 导出在 1.18.1 包内没有对应文件（悬空导出），属于未发布 API。
