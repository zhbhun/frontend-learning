# 学习笔记:hocuspocus

## 偏好
- 主题边界:完整覆盖 Hocuspocus 能力地图——server 核心(配置、文档生命周期钩子、鉴权、自定义服务器接入)、provider 客户端(连接管理、awareness、stateless 消息、离线恢复)、官方扩展(sqlite / database / s3 / webhook / throttle / logger / redis)、transformer、部署运维与跨运行时;并完整覆盖 Tiptap 编辑器协同(Collaboration / Caret 扩展、撤销历史、离线合并、React 集成)。Tiptap 编辑器自身的基础 API(schema、marks、nodes)不展开;Yjs 内部机制与共享类型 API 属 yjs 主题手册,课程只在集成面提要点。
- 版本基线:Hocuspocus v4(npm 当前版 4.7.x,要求 Node 22+);v3 与 v4 的关键差异在对应课程中补充说明。
- 课程示例使用原生 TS + DOM(@storybook/html-vite),不引入 React 等框架;React 写法在相应课程中作为补充说明(官方 provider-react)。
- 包管理器:npm。
- 手册同时作为 tester/(React + Tiptap 3 + Hocuspocus 实验项目)的实战回查手册。

## 工作笔记
- tester/ 目前锁定 Hocuspocus 3.4.4,落后手册 v4 基线一个大版本;其中 v3 写法(hooks 收到 Node IncomingMessage、sqlite3 驱动等)按 v3 对照阅读,升级 tester 时以 v3 迁移课程为入口。
- tester/ 已跑通 express + express-ws 自定义服务器与 SQLite 持久化路径,可作服务端课程的范例素材。
