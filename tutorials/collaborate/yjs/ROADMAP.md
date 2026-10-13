# yjs

- 1. 快速上手
  - [1.1 安装与第一个协同文档](cheatsheets/getting-started/README.mdx)
    安装 yjs 与 y-websocket,跑通两个浏览器上下文之间实时同步的最小闭环。
  - [1.2 共享类型](cheatsheets/shared-types/README.mdx)
    Y.Map / Y.Array / Y.Text / Y.Xml 家族的嵌套组合、observe 事件与选型判断。
- 2. 核心机制
  - [2.1 事务与变更事件](cheatsheets/transactions-and-events/README.mdx)
    transact 的批量合并语义、Y.Event 结构与 origin 的用途。
  - [2.2 文档更新与同步协议](cheatsheets/document-updates/README.mdx)
    update、state vector 与 encodeStateAsUpdate / applyUpdate,不依赖 Provider 手动完成一次对等同步。
  - [2.3 撤销与重做](cheatsheets/undo-manager/README.mdx)
    UndoManager 的作用域、trackedOrigins 与协作场景下的撤销语义。
  - [2.4 相对位置](cheatsheets/relative-positions/README.mdx)
    用 RelativePosition 在并发插入下保持光标、选区与批注锚点。
  - [2.5 子文档](cheatsheets/subdocuments/README.mdx)
    Subdocuments 的懒加载与按需同步,组织多文档工作区。
  - [2.6 Awareness 与在线状态](cheatsheets/awareness/README.mdx)
    awareness 协议的本地状态、心跳过期机制与光标、在线列表实践。
- 3. 同步与持久化
  - [3.1 y-websocket](cheatsheets/y-websocket/README.mdx)
    官方 WebSocket Provider 的连接管理、房间模型与消息协议。
  - [3.2 y-webrtc](cheatsheets/y-webrtc/README.mdx)
    P2P 同步的信令机制、网络穿透与适用场景。
  - [3.3 y-indexeddb 离线](cheatsheets/y-indexeddb/README.mdx)
    浏览器端持久化、离线编辑与重连后的更新合并。
  - [3.4 Provider 组合](cheatsheets/meshing-providers/README.mdx)
    多个 Provider 叠加(meshing)的同步拓扑与取舍。
  - [3.5 自定义 Provider](cheatsheets/custom-provider/README.mdx)
    按 y-protocols 规范实现自有传输层。
- 4. 服务端
  - [4.1 y-websocket 服务端](cheatsheets/y-websocket-server/README.mdx)
    自托管官方参考服务端,配合 y-leveldb 做服务端持久化。
  - [4.2 y-redis 水平扩展](cheatsheets/y-redis/README.mdx)
    用 y-redis 做多实例水平扩展与中心化存储。
  - [4.3 Hocuspocus](cheatsheets/hocuspocus/README.mdx)
    插件化服务端的鉴权、持久化与 webhook 扩展。
  - [4.4 y-sweet](cheatsheets/y-sweet/README.mdx)
    Jamsocket 托管与自托管服务,用 @y-sweet/client 接入。
  - [4.5 yhub](cheatsheets/yhub/README.mdx)
    yjs 官方新一代生产级服务端(server + worker + Redis/Postgres 架构)的定位与用法。
- 5. 编辑器绑定
  - [5.1 ProseMirror 与 Tiptap](cheatsheets/prosemirror-tiptap/README.mdx)
    y-prosemirror 的 schema 映射、远程光标与 Tiptap 扩展用法。
  - [5.2 CodeMirror](cheatsheets/y-codemirror/README.mdx)
    y-codemirror.next 绑定 CodeMirror 6 与 UndoManager 配合。
  - [5.3 Monaco](cheatsheets/y-monaco/README.mdx)
    y-monaco 绑定与多客户端光标渲染。
  - [5.4 Quill 与其他绑定](cheatsheets/quill-and-more/README.mdx)
    y-quill 用法,以及 Remirror、Milkdown 等绑定的选型对比。
- 6. 进阶与原理
  - [6.1 CRDT 与 YATA 原理](cheatsheets/crdt-internals/README.mdx)
    Yjs 的 YATA 算法、客户端 ID、item 结构与垃圾回收。
  - [6.2 性能与基准](cheatsheets/performance/README.mdx)
    crdt-benchmarks 的结论、更新编码效率与大文档实践。
  - [6.3 协同数据建模](cheatsheets/data-modeling/README.mdx)
    以看板为例:fractional-indexing 排序、规范化结构与冲突语义设计。
