# 学习笔记：Konva.js

## 偏好
- 主题是 Konva.js（2D Canvas 库）的命令式 API；不含 react-konva、vue-konva 等框架绑定，也不设原生 Canvas 2D 基础课——Konva 作为 Canvas 抽象层直接讲。
- 工具链：npm + Storybook `@storybook/html-vite` + Vite + TypeScript；范例用命令式 Canvas 实例（共享 `assets/story-canvas.js` 的 `canvasStory` 与 `assets/canvas-runtime.js` 的渲染循环），不引入 React 等框架。
- Konva 用当前最新稳定版（首次写课时安装到课程目录并核对版本）。
- Storybook 已启用 documentation mode（`.storybook/main.ts` 的 `docs.docsMode: true`），每课只暴露 `<cheat-sheet-name>--docs`，同级隐藏 story 仅供内嵌 Canvas / Controls 引用。
