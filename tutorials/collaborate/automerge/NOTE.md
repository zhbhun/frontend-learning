# 学习笔记：Automerge

## 偏好
- 主题为 Automerge 生态：`@automerge/automerge`（核心文档 API）、`@automerge/automerge-repo`（存储与同步层）、`@automerge/react`（React 绑定）；语言用 TypeScript，示例跑在浏览器与 Node 双端。
- 版本基线：核心用 automerge 3.x（当前 3.5.0）；automerge-repo 生态选 2.6.0-alpha 线（为 automerge 3 设计，network/storage/react 适配器同为 2.6.0-alpha.3），不基于止步 2.5.6 的稳定线。课程示例按此基线编写并标注版本。
- 主题边界：覆盖 Automerge 的使用与协同应用构建；不深入 CRDT 数理证明，不横向对比 yjs 等其他协同库（yjs 有独立学习工作区）。
- Keyhive 生态（ark、onomancy 访问控制）不在路线内。

## 工作笔记
- 本工作区 Storybook 固定用 6007 端口（6006 被另一个学习工作区的实例占用）。
- automerge-repo 2.6 线当前仍是 alpha；若后续发布 stable，课程版本基线随之更新。
- `cheatsheets/sample-course/` 是技能模板课程，作为课程格式参照保留，不进 ROADMAP。
