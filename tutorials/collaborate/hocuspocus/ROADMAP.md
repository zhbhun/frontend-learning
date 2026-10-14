# hocuspocus

- 1. 快速上手
  - [1.1 安装](cheatsheets/install/README.mdx)
    认识 server / provider / 扩展的包结构与职责,装好依赖启动第一个 Hocuspocus 服务器。
  - [1.2 第一个协同文档](cheatsheets/first-document/README.mdx)
    用 provider 连接服务器,在两个浏览器上下文间跑通 Yjs 文档实时同步的最小闭环。
- 2. 服务端核心
  - [2.1 Server 配置](cheatsheets/server-config/README.mdx)
    端口、超时、debounce 等核心选项与 Server 的启动、停止、静默模式。
  - [2.2 文档生命周期](cheatsheets/document-lifecycle/README.mdx)
    onLoadDocument / onChange / onStoreDocument / onDestroy 的触发时机与文档缓存、自动卸载。
  - [2.3 鉴权与上下文](cheatsheets/auth/README.mdx)
    onAuthenticate 校验 token,泛型 Context 在钩子与 provider 间的端到端类型传递。
  - [2.4 自定义持久化](cheatsheets/custom-persistence/README.mdx)
    增量 update 与全量快照两种落库方式,把存储对接自有服务。
  - [2.5 接入现有服务器](cheatsheets/custom-server/README.mdx)
    用 handleConnection 把 Hocuspocus 挂进已有的 HTTP/WebSocket 服务(如 express)。
- 3. 客户端 Provider
  - [3.1 HocuspocusProvider](cheatsheets/provider/README.mdx)
    连接配置、status 事件、synced 时机与 provider 的销毁清理。
  - [3.2 共享 WebSocket 连接](cheatsheets/shared-websocket/README.mdx)
    HocuspocusProviderWebsocket 多文档复用一条连接的写法与取舍。
  - [3.3 断线与重连](cheatsheets/reconnection/README.mdx)
    重连间隔、强制断开与离线期间编辑内容的补传行为。
  - [3.4 Awareness 在线状态](cheatsheets/awareness/README.mdx)
    awareness 本地状态与过期机制,做在线列表与用户状态,配合服务器侧钩子。
  - [3.5 Stateless 消息](cheatsheets/stateless/README.mdx)
    sendStateless / onStateless / broadcastStateless 实现协同之外的应用层消息。
- 4. 官方扩展
  - [4.1 持久化扩展](cheatsheets/persistence-extensions/README.mdx)
    extension-sqlite / extension-database / extension-s3 的配置、schema 与选型。
  - [4.2 Webhook 事件](cheatsheets/webhooks/README.mdx)
    extension-webhook 在文档创建、存储等时机回调外部系统。
  - [4.3 限流与日志](cheatsheets/throttle-and-logger/README.mdx)
    extension-throttle 限流防护与 extension-logger 观察消息流。
- 5. Tiptap 编辑器协同
  - [5.1 Tiptap 协同接入](cheatsheets/tiptap-setup/README.mdx)
    Collaboration 扩展与 provider 的接线,理解编辑内容在编辑器与服务器之间的流动。
  - [5.2 协同光标](cheatsheets/collaboration-caret/README.mdx)
    Collaboration Caret 扩展展示多人光标、选区与用户信息的配置。
  - [5.3 编辑器撤销与历史](cheatsheets/editor-undo/README.mdx)
    协同场景下撤销/重做的作用域与本地历史语义。
  - [5.4 离线编辑与恢复](cheatsheets/editor-offline/README.mdx)
    编辑器配合 y-indexeddb 本地缓存,重连后的补传与合并。
  - [5.5 React 集成](cheatsheets/react-integration/README.mdx)
    provider-react 与 useEditor 的协同写法,对照 tester/ 的 React 组合。
- 6. 部署与扩展
  - [6.1 生产部署](cheatsheets/production-deploy/README.mdx)
    Node 进程管理、反向代理的 WebSocket 升级、Docker 与健康检查。
  - [6.2 跨运行时](cheatsheets/runtimes/README.mdx)
    v4 经 crossws 跑在 Bun / Deno / Cloudflare Workers 的方式与限制。
  - [6.3 水平扩展](cheatsheets/scaling/README.mdx)
    extension-redis 多实例同步与负载均衡下的注意点。
  - [6.4 性能与内存](cheatsheets/performance/README.mdx)
    debounce 调优、大文档与多文档内存管理、监控指标。
- 7. 进阶
  - [7.1 数据转换](cheatsheets/transformer/README.mdx)
    transformer 在 JSON、Y.Doc 与 ProseMirror 文档间互转,做导入导出与服务端渲染。
  - [7.2 自定义扩展](cheatsheets/custom-extensions/README.mdx)
    实现 Extension 接口扩展 server 能力,理解钩子与扩展的触发顺序。
  - [7.3 从 v3 迁移](cheatsheets/v3-migration/README.mdx)
    hooks 的 web Request、Node 22、事务 origin 等差异对照与升级路径。
