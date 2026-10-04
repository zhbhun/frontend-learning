# 学习笔记：Chrome 扩展开发

## 偏好

- 主题边界：桌面版 Chrome 扩展开发，以 Manifest V3 为准。不覆盖 Firefox/Safari/Edge 适配、Chrome Apps（已停用）和浏览器内核开发；跨浏览器差异只在涉及 API 兼容性的课程里顺带提及。
- 运行环境：macOS + 桌面版 Chrome 稳定版，开发期用「加载已解压的扩展程序」本地调试。课程范例以原生 JavaScript/TypeScript 为主，涉及构建工具或框架（Vite、WXT、Plasmo 等）时在对应课程内说明。
- 语言约定：正文、标题、说明、示例界面文案和代码注释用中文；路径、命令、包名、API 名称和代码标识符保留英文。
- 一手来源：developer.chrome.com/docs/extensions 官方文档；API 细节以站内 Reference 为准。
- 节奏：长期系统学习，课程同时支撑顺读上手与日后按标题回查。

## 工作笔记

- 工作区由 cheatsheet 技能初始化：Storybook 10.5.6（html-vite）+ npm，构建产物 `storybook-static/` 已被 .gitignore 忽略。
- 默认 dev 端口 6006 常被另一工作区（browser/devtool）占用，需要并行启动时用 6007。
- 根目录 `tutorials/` 是迁移过来的 MV2 时代笔记（browser_action、page_action、background pages 等概念已过时），仅作历史参考，不作为课程内容依据。
