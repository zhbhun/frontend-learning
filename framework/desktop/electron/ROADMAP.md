# Electron

- 1. 起步
  - [1.1 认识 Electron](cheatsheets/what-is-electron/README.mdx)
    Electron 是什么：Chromium + Node.js 的组合架构、适用场景与典型应用。
  - [1.2 安装](cheatsheets/install/README.mdx)
    用 Forge 脚手架创建项目，准备 Node 与平台构建环境。
  - [1.3 第一次运行](cheatsheets/first-run/README.mdx)
    启动开发服务、热重载与 Fiddle 对照实验。
  - [1.4 进程模型](cheatsheets/process-model/README.mdx)
    主进程、渲染进程与预加载脚本的职责边界和数据流。
  - [1.5 预加载脚本](cheatsheets/preload/README.mdx)
    contextBridge 暴露安全 API 与上下文隔离下的通信方式。

- 2. 窗口
  - [2.1 创建窗口](cheatsheets/windows/README.mdx)
    BrowserWindow 的常用配置、尺寸与加载内容方式。
  - [2.2 应用生命周期](cheatsheets/app-lifecycle/README.mdx)
    ready、window-all-closed、activate 等事件与跨平台退出行为。
  - [2.3 多窗口](cheatsheets/multi-window/README.mdx)
    多窗口的创建、引用管理、父子与模态关系。
  - [2.4 无边框窗口](cheatsheets/frameless-windows/README.mdx)
    frameless、透明窗口与自定义标题栏拖拽区域。

- 3. 通信
  - [3.1 IPC 概念](cheatsheets/ipc-basics/README.mdx)
    通道、消息方向与 IPC 的安全边界。
  - [3.2 双向调用](cheatsheets/ipc-invoke/README.mdx)
    ipcRenderer.invoke 与 ipcMain.handle 的请求响应模式。
  - [3.3 主进程推送](cheatsheets/ipc-push/README.mdx)
    webContents.send 向渲染进程主动推送事件。
  - [3.4 渲染进程间通信](cheatsheets/ipc-between-renderers/README.mdx)
    主进程中转与 MessagePort 的窗口间通信。

- 4. 原生能力
  - [4.1 文件与对话框](cheatsheets/dialog-files/README.mdx)
    打开、保存对话框与文件读写、拖拽导入。
  - [4.2 菜单](cheatsheets/menus/README.mdx)
    应用菜单、上下文菜单与快捷键注册。
  - [4.3 托盘](cheatsheets/tray/README.mdx)
    系统托盘图标、菜单与窗口常驻行为。
  - [4.4 通知与角标](cheatsheets/notifications/README.mdx)
    系统通知与 macOS Dock、任务栏角标。
  - [4.5 系统信息与剪贴板](cheatsheets/system-apis/README.mdx)
    屏幕、系统偏好、剪贴板等杂项原生 API。
  - [4.6 打开外部资源](cheatsheets/shell/README.mdx)
    shell 打开网址、文件与默认程序。

- 5. Web 内容
  - [5.1 webContents](cheatsheets/webcontents/README.mdx)
    页面加载、导航事件与在主进程控制渲染端。
  - [5.2 session 与存储](cheatsheets/session/README.mdx)
    会话分区、cookies、缓存与持久化存储。
  - [5.3 自定义协议](cheatsheets/custom-protocol/README.mdx)
    注册应用内协议并服务本地资源。
  - [5.4 嵌入网页](cheatsheets/web-embeds/README.mdx)
    WebContentsView 与 iframe 的嵌入和边界。

- 6. 安全
  - [6.1 安全清单](cheatsheets/security/README.mdx)
    contextIsolation、sandbox、nodeIntegration 的默认值与取舍。
  - [6.2 导航与弹窗控制](cheatsheets/navigation-control/README.mdx)
    拦截窗口打开、导航与权限请求。

- 7. 工程化
  - [7.1 接入 TypeScript](cheatsheets/typescript-setup/README.mdx)
    Forge + Vite + TypeScript 的三端构建结构与类型声明。
  - [7.2 调试](cheatsheets/debugging/README.mdx)
    渲染端 DevTools、主进程断点与日志排查。
  - [7.3 测试](cheatsheets/testing/README.mdx)
    主进程单元测试与 Playwright 端到端测试。
  - [7.4 日志与崩溃收集](cheatsheets/logging-crashes/README.mdx)
    结构化日志、崩溃报告与用户环境信息收集。

- 8. 打包与发布
  - [8.1 打包](cheatsheets/packaging/README.mdx)
    package 与 make 的产物结构、依赖裁剪与 asar。
  - [8.2 多平台构建](cheatsheets/cross-platform-builds/README.mdx)
    macOS、Windows、Linux 安装包与 CI 交叉构建。
  - [8.3 签名与公证](cheatsheets/code-signing/README.mdx)
    macOS 签名公证与 Windows 代码签名配置。
  - [8.4 自动更新](cheatsheets/auto-update/README.mdx)
    更新服务器、Squirrel 与 forge publisher 的更新链路。
  - [8.5 发布流程](cheatsheets/release/README.mdx)
    版本号、发布渠道与 GitHub Releases 自动化。

- 9. 框架集成
  - [9.1 集成模式](cheatsheets/integration-overview/README.mdx)
    Forge Vite 插件、electron-vite 与手动集成的选型。
  - [9.2 React 集成](cheatsheets/react-integration/README.mdx)
    React + Vite + Electron 项目的完整搭建与 IPC 封装。
  - [9.3 Vue 集成](cheatsheets/vue-integration/README.mdx)
    Vue + Vite + Electron 项目的完整搭建与 IPC 封装。
  - [9.4 状态管理](cheatsheets/state-management/README.mdx)
    渲染端状态与主进程状态的边界、同步与持久化。
  - [9.5 真实应用拆解](cheatsheets/case-study/README.mdx)
    以 Motrix 等开源应用拆解工程结构与集成方案。

- 10. 进阶主题
  - [10.1 原生模块](cheatsheets/native-modules/README.mdx)
    native addon 的 ABI、重构建与打包处理。
  - [10.2 性能](cheatsheets/performance/README.mdx)
    启动速度、内存占用与包体积优化。
  - [10.3 深链与单实例](cheatsheets/deep-links/README.mdx)
    注册协议处理外部唤起与单实例锁。
  - [10.4 深色模式](cheatsheets/dark-mode/README.mdx)
    nativeTheme 跟随系统主题与窗口材质适配。
  - [10.5 屏幕捕获](cheatsheets/desktop-capture/README.mdx)
    desktopCapturer 截屏与录屏。
