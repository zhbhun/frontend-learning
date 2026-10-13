# Automerge

- 1. 核心基础
  - [1.1 初识 Automerge](cheatsheets/getting-started/README.mdx)
    local-first 理念与 Automerge 定位，安装依赖并跑通第一份文档的 change/merge 最小闭环。
  - [1.2 变更、快照与合并](cheatsheets/changes-and-merging/README.mdx)
    用 change 回调建模变更，掌握 save/load 二进制、多副本 merge 与历史查看。
  - [1.3 集合类型与冲突](cheatsheets/collections-and-conflicts/README.mdx)
    操作 map/list 与标量值，观察并发赋值冲突的收敛行为与对象身份规则。
  - [1.4 文本与计数器](cheatsheets/text-and-counters/README.mdx)
    理解文本序列的插入删除语义与 counter 的增减限制。

- 2. Repo 同步层
  - [2.1 Repo 与 DocHandle](cheatsheets/repo-and-dochandles/README.mdx)
    创建 Repo、管理 DocHandle 生命周期与文档 URL 寻址。
  - [2.2 本地存储](cheatsheets/local-storage/README.mdx)
    用 IndexedDB 与 Node 文件系统适配器实现本地优先的持久化。
  - [2.3 网络同步](cheatsheets/networking-sync/README.mdx)
    接入 websocket 适配器，连接同步服务端，理解多副本收敛过程。
  - [2.4 在线状态与临时数据](cheatsheets/ephemeral-data/README.mdx)
    用 ephemeral 数据与 peer 消息广播光标、在线状态等不落盘信息。

- 3. 应用集成
  - [3.1 React 绑定](cheatsheets/react-bindings/README.mdx)
    用 @automerge/react 的 hooks 把文档状态接入 React 组件渲染。
  - [3.2 富文本协同编辑](cheatsheets/rich-text-collab/README.mdx)
    结合 rich text 与 ProseMirror 插件实现格式化文本协同。
  - [3.3 实战：协同待办应用](cheatsheets/collab-todo/README.mdx)
    综合前两阶段构建一个多端同步、本地优先的协同 todo 应用。

- 4. 进阶专题
  - [4.1 数据建模手册](cheatsheets/modeling-data/README.mdx)
    按官方 cookbook 讲解协作文档的数据建模取舍。
  - [4.2 从 Automerge 2 迁移](cheatsheets/migrating-from-v2/README.mdx)
    对照迁移指南升级 API，理解 Automerge 3 的行为差异。
  - [4.3 用 LLM 辅助 Automerge 开发](cheatsheets/llm-assisted-development/README.mdx)
    使用官方 LLM 指南让 AI 工具生成与审读 Automerge 代码。
