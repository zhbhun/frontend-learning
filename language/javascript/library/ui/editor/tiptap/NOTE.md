# 学习笔记：Tiptap

## 偏好
- 主题：Tiptap 3.x Editor——基于 ProseMirror 的 headless 富文本编辑器框架；付费产品线（AI Toolkit、Comments、Conversion、Pages、Tracked Changes 等）只做选型认知，不作为课程主线。
- 版本：跟随当前稳定大版本 3.x；包名以 `@tiptap/core`、`@tiptap/pm`、`@tiptap/starter-kit` 等官方 scope 为准。
- 示例媒介：核心示例用原生 TypeScript + DOM 编写，可直接在 Storybook html-vite 工作区内运行；React 与 Vue 集成作为专门课程，以源码讲解为主，不要求在 Storybook 内运行。
- 进阶范围：开源实时协作（Yjs + `@tiptap/extension-collaboration` + 自托管 Hocuspocus）、`@tiptap/markdown`、官方 UI Components、付费产品线概览，四个主题均纳入路线。
- ProseMirror 边界：ProseMirror 是相邻主题，不单独成册；schema、插件、decorations 等概念以"够支撑 Tiptap 自定义"为深度，更深入的内容写进对应课程的参考资料。

## 工作笔记
- Storybook 工程来自 cheatsheet 技能模板，初始化时在 `.storybook/manager.ts` 补了 `showPanel: () => false`（隐藏 docsMode 下误显示的调试面板）；后续合并模板升级时不要丢掉这一行。
