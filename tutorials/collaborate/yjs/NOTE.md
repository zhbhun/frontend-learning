# 学习笔记:yjs

## 偏好
- 主题边界:完整覆盖 yjs 能力地图——核心机制、共享类型、同步与持久化 Provider、服务端生态(y-websocket / y-webrtc / y-redis / Hocuspocus / y-sweet / yhub)、编辑器绑定(ProseMirror / Tiptap / CodeMirror / Monaco / Quill 等)与内部原理。各编辑器自身的 API 细节属于编辑器主题,不展开,绑定课程只讲 yjs 侧的映射与协同行为。
- 课程示例使用原生 TS + DOM(@storybook/html-vite),不引入 React 等框架;框架集成写法只在相应课程中作为补充说明。
- 包管理器:npm;示例基于 yjs 13.x。
- 手册同时作为 tester/(React + y-sweet 看板协同项目)的实战回查手册。

## 工作笔记
- tester/ 是独立的 Vite + React + pnpm 实验项目,与手册工程无依赖关系;其中的看板排序(fractional-indexing)、zustand 状态组织等场景可作为进阶课程的范例素材。
