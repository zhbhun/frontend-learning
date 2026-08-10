# 学习笔记：LeaferJS

## 偏好
- 主题边界：聚焦 LeaferJS 浏览器端（`@leafer/core` + `leafer-ui`）。Node/Worker 服务端渲染不纳入主线，仅在必要时提及。
- 编辑器能力：`@leafer-in/*` 编辑器插件（框选、打组、吸附、标尺、文字编辑、变换手柄等）作为进阶主线全量覆盖，体现 LeaferJS 的图形编辑器定位。
- 框架：聚焦原生 TypeScript API，React/Vue 等封装不纳入主线。
- 版本：最新稳定版 2.x（官网更新日志当前 v2.2.x）。
- 范例媒介：范例在 Canvas 内用 `leafer-ui` 渲染，复用工作区共享的 `canvasStory` / `storySource` helper；LeaferJS 的节点树与渲染逻辑写在每课的 `example.ts` 中。

## 工作笔记
- LeaferJS 是 TypeScript 原生的现代 Canvas 引擎，轻量（约 70KB min+gzip 量级）、零依赖，默认 Canvas 2D 渲染、可选 WebGPU/WebGL，定位图形编辑与无限画布。
- 同级 PixiJS 工作区已建立 Canvas 引擎对比基线，路线设计时注意体现 LeaferJS 的差异化：编辑器能力开箱即用、UI 节点树思维、TS 原生类型完善。
