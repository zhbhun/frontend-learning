# 学习笔记：Electron

## 偏好
- 主题边界：Electron 核心（进程模型、窗口、IPC、常用原生能力、安全模型）+ Electron Forge 工具链全流程（脚手架、调试、打包、签名、发布、自动更新）+ 前端框架集成（React/Vue 与 Electron 的结合方式）；不把 React/Vue 本身、Node.js 基础、TypeScript 基础作为手册内容，只在相关课程标注衔接点。
- 范例技术栈：JS 起步、TS 进阶——入门与原生能力课程用纯 JavaScript（零构建，打开即读），工程化、打包发布、框架集成课程切换到 TypeScript + Vite；每课示例项目放在 `cheatsheets/<课程>/` 目录下独立运行。
- 工具链以 Electron Forge 为主线；electron-builder 只在打包课程中作为替代方案对比，不展开成课。

## 工作笔记
- 工作区已有旧学习材料，保留原样、课程不迁移也不依赖：`examples/hello`（纯 JS）、`examples/forge-hello`（Forge JS，maker 仅 darwin）、`examples/forge-vite-ts`（Forge + Vite + TS，Forge 6.4 / Electron 26 时代，版本已旧）、`tutorials/integration`（React 集成兴趣）、`libraries/application`（Motrix 真实应用参考）。
- 开发环境 macOS；范例默认保证 macOS 可运行，Windows/Linux 差异点在相关课程内标注。
- 版本策略：示例跟随 Electron 与 Forge 当前稳定版，不锁定旧版本；旧材料中的版本号不代表当前基准。
