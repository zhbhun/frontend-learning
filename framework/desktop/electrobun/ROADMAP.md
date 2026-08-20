# Electrobun

- 1. 上手
  - [1.1 认识 Electrobun](cheatsheets/overview/README.mdx)
    Electrobun 是什么：Bun 主进程 + 系统 webview/CEF 的桌面架构、与 Electron/Tauri 的差异、体积与更新目标、适用场景。
  - [1.2 初始化项目](cheatsheets/init/README.mdx)
    用 `bunx electrobun init` 建工程：目录结构（src/bun 主进程与 src/mainview 视图）、依赖、`electrobun dev --watch` 开发循环。
  - [1.3 第一个窗口](cheatsheets/first-window/README.mdx)
    创建 BrowserWindow、用 `views://` 加载视图页面、electrobun.config.ts 最小配置，跑通 hello-world。
  - [1.4 构建与分发入门](cheatsheets/build-basics/README.mdx)
    `electrobun build` 产物形态：自解压 bundle、体积构成、构建 env 通道与首次分发认知。

- 2. 窗口与视图
  - 2.1 窗口
    - [2.1.1 窗口选项](cheatsheets/window-options/README.mdx)
      BrowserWindow 的尺寸、标题栏样式、frame、位置与常用选项及默认值。
    - [2.1.2 窗口事件](cheatsheets/window-events/README.mdx)
      windowEvents：close、resize、focus 等事件的订阅时机与常见用法。
  - 2.2 视图
    - [2.2.1 BrowserView](cheatsheets/browser-view/README.mdx)
      BrowserView 的创建、bounds、层级与挂到窗口的方式，多视图组合。
    - [2.2.2 webview 标签](cheatsheets/webview-tag/README.mdx)
      `<electrobun-webview>` HTML 元素：OOPIF 嵌合、事件与使用限制。
    - [2.2.3 会话与存储](cheatsheets/session-storage/README.mdx)
      Session 管理 webview 的 Cookie 与 Storage 的读写、过滤与隔离。

- 3. RPC 与通信
  - [3.1 自定义 RPC](cheatsheets/rpc/README.mdx)
    RPCSchema 定义、createRPC/defineElectrobunRPC、send/ask/handle 与类型安全的双向通信。
  - [3.2 Electroview](cheatsheets/electroview/README.mdx)
    Electroview 类的初始化、视图层全局属性与加密 socket 通道的工作方式。
  - [3.3 拖拽区域](cheatsheets/draggable-regions/README.mdx)
    Draggable Regions：让无边框窗口里的 HTML 元素承担标题栏拖拽。

- 4. 系统集成
  - 4.1 菜单与托盘
    - [4.1.1 应用菜单](cheatsheets/application-menu/README.mdx)
      ApplicationMenu 与 menuRoles：菜单栏结构、平台角色差异。
    - [4.1.2 上下文菜单](cheatsheets/context-menu/README.mdx)
      ContextMenu：右键菜单的构造、弹出与视图侧联动。
    - [4.1.3 系统托盘](cheatsheets/tray/README.mdx)
      Tray 的图标、菜单、事件与常驻托盘应用形态。
  - 4.2 桌面能力
    - [4.2.1 全局快捷键](cheatsheets/global-shortcut/README.mdx)
      GlobalShortcut：注册系统级快捷键、冲突处理与生命周期清理。
    - [4.2.2 通知与对话框](cheatsheets/notifications-dialogs/README.mdx)
      系统通知 Notification 与消息对话框 MessageBox 的使用场景与参数。
    - [4.2.3 屏幕与显示器](cheatsheets/screen/README.mdx)
      Screen/Display：枚举显示器、获取边界与多屏窗口定位。
  - 4.3 应用运行时
    - [4.3.1 路径与工具](cheatsheets/paths-and-utils/README.mdx)
      PATHS 应用路径约定与 Utils 提供的退出、打开等系统能力。
    - [4.3.2 应用生命周期](cheatsheets/app-lifecycle/README.mdx)
      主进程入口、app 事件、ApplicationEvents 与优雅退出。

- 5. 构建与分发
  - 5.1 构建
    - [5.1.1 构建配置](cheatsheets/build-config/README.mdx)
      electrobun.config.ts 与 BuildConfig：views 构建、copy、watchIgnore 与平台段。
    - [5.1.2 CLI 参数](cheatsheets/cli/README.mdx)
      electrobun 命令行：dev/build、--watch、--env 与常用参数速查。
    - [5.1.3 打包资源与图标](cheatsheets/bundled-assets/README.mdx)
      `views://` 打包资源的管理与各平台应用图标配置。
  - 5.2 分发
    - [5.2.1 跨平台与兼容性](cheatsheets/cross-platform/README.mdx)
      mac/win/linux 差异、兼容性矩阵、bundleCEF 在一致性与体积间的取舍。
    - [5.2.2 代码签名](cheatsheets/code-signing/README.mdx)
      各平台代码签名与 macOS 公证的配置和常见失败。
    - [5.2.3 自动更新](cheatsheets/updater/README.mdx)
      Updater 与 bsdiff 增量更新：更新通道、状态事件与回滚认知。

- 6. 前端工程化
  - [6.1 Vite 集成与 HMR](cheatsheets/vite-hmr/README.mdx)
    Vite 构建 dist 再由 copy 装配、HMR 双进程工作流（vite-tester 模式）。
  - [6.2 前端框架集成](cheatsheets/frontend-frameworks/README.mdx)
    React 等前端框架与 Electrobun 的组合方式、RPC 粘合层与生态模板参考。

- 7. 进阶
  - [7.1 架构原理](cheatsheets/architecture/README.mdx)
    进程模型、主进程与 webview 隔离、webview 标签架构与加密通信链路。
  - [7.2 WebGPU 与 3D 适配器](cheatsheets/webgpu/README.mdx)
    GpuWindow、WGPUView、bundleWGPU 与 three/babylon 适配器控制原生 GPU 表面。
  - [7.3 Socket](cheatsheets/socket/README.mdx)
    Socket 低层通道的用途与使用边界。
