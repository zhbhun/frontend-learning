# 学习笔记：Fabric.js

## 偏好
- 主题是 Fabric.js（Canvas 上的对象模型/交互图形库）的浏览器端 TypeScript API；不含 React/Vue 等框架封装，也不设原生 Canvas 2D 基础课——Fabric 作为 Canvas 抽象层直接讲。
- Node/服务端渲染（node-canvas）不纳入主线，仅在相关小节必要时提及。
- 工具链：npm + Storybook `@storybook/html-vite` + Vite + TypeScript；范例为命令式 Canvas 实例，复用共享 `assets/story-canvas.js` 的 `canvasStory` 与 `assets/story-source.js` 的 `storySource`，不引入框架。
- 版本基线：最新稳定版 v7.x；首次写课时安装到课程目录并核对具体小版本，与 v6 的差异在相关课程中标注。

## 工作笔记
- 工作区根 `dependencies` 已安装 fabric 7.4.0（当前最新稳定版）；课程代码统一 `import { ... } from 'fabric'` 命名导入。
- Fabric.js 定位：Canvas 上的交互式对象模型——对象级选择与变换控件、文本编辑（Text/IText/Textbox）、图片与滤镜、序列化与 SVG 互操作、历史栈，本质是开箱即用的图形编辑器底座。
- v6 起重写为 TypeScript 并改为命名导出 ESM（如 `FabricText`），v7 延续该 API；社区资料大量停留在 v5 全局命名空间写法（`fabric.Text`），查阅外部资料时注意版本。

