# Chrome 扩展开发

- [@官方@Chrome Extensions 开发者文档](https://developer.chrome.com/docs/extensions)
  覆盖：上手教程、核心概念（service worker、消息、存储、权限、content scripts）与全部 API 指南、Manifest V3 规范。适用于：所有阶段的第一手依据，API 细节以站内 Reference 为准。
- [@官方@官方示例集合](https://developer.chrome.com/docs/extensions/samples)
  覆盖：按 API 与场景分类的官方可运行扩展示例。适用于：各课程范例参考与进阶 API 用法查询。
- [@官方@Chrome Web Store 开发者文档](https://developer.chrome.com/docs/webstore)
  覆盖：开发者账号注册、打包上传、审核政策与版本更新流程。适用于：发布阶段。
- [@官方@Chrome 开发者博客](https://developer.chrome.com/blog)
  覆盖：扩展平台变化、新 API 与政策调整的官方公告。适用于：跟踪 MV3 演进与 API 变动。

## 社区

- [Chromium Extensions 论坛](https://groups.google.com/a/chromium.org/g/chromium-extensions)
  适用于：官方支持渠道，扩展审核、平台政策与 API 行为的现实反馈。
- [Stack Overflow `google-chrome-extension` 问答](https://stackoverflow.com/questions/tagged/google-chrome-extension)
  适用于：具体 API 报错与异常行为的经验判断。

## 教程

- [@书籍@Building Browser Extensions（Apress, Matt Frisbie）](https://link.springer.com/book/10.1007/978-1-4842-8725-5)
  覆盖：以 Chrome MV3 为主线的现代扩展开发全书，兼谈 Safari/Firefox/Edge。适用于：希望成册顺读时，作为官方文档之外的系统化补充视角。

## 工具

- [@开源@WXT](https://wxt.dev)
  覆盖：基于 Vite 的扩展开发框架，统一 manifest 生成、HMR 与多浏览器构建。适用于：进阶阶段对比工程化方案。
- [@开源@Plasmo](https://www.plasmo.com)
  覆盖：React/TypeScript 优先的扩展框架，内置 UI 抽象与发布工作流。适用于：进阶阶段对比工程化方案。
- [@开源@CRXJS Vite Plugin](https://crxjs.dev)
  覆盖：让 Vite 直接理解 manifest 与扩展入口的构建插件。适用于：想用 Vite 但不引入整套框架时。
