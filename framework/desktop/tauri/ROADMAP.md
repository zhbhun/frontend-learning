# Tauri

- 1. 上手
  - [1.1 认识 Tauri](cheatsheets/about-tauri/README.mdx)
    Tauri 的架构模型（Rust 核心、系统 WebView、IPC 桥接）、与 Electron 的对比和适用场景。
  - [1.2 安装](cheatsheets/installation/README.mdx)
    Rust 工具链、系统依赖、VSCode 扩展的安装与验证。
  - [1.3 第一个应用](cheatsheets/first-app/README.mdx)
    用 create-tauri-app 生成 React 工程，跑通 `tauri dev` 与 `tauri build`。
  - [1.4 工程结构](cheatsheets/project-structure/README.mdx)
    前端目录与 `src-tauri` 的职责划分，`tauri.conf.json` 与 `Cargo.toml` 如何协作。
  - [1.5 集成已有前端](cheatsheets/integrate-frontend/README.mdx)
    把现有 React/Vite 工程接入 Tauri，配置 `beforeDevCommand` 与前端构建产物路径。

- 2. 核心开发
  - 2.1 配置与窗口
    - [2.1.1 配置](cheatsheets/configuration/README.mdx)
      `tauri.conf.json` 的结构、schema 校验、平台覆盖配置与常用字段。
    - [2.1.2 窗口](cheatsheets/window/README.mdx)
      窗口的声明式配置与 `WebviewWindow` API，尺寸、装饰、居中等属性控制。
    - [2.1.3 多窗口](cheatsheets/multi-window/README.mdx)
      多窗口的创建与管理，窗口间通信的组织方式。
  - 2.2 前后端通信
    - [2.2.1 命令](cheatsheets/commands/README.mdx)
      `#[tauri::command]` 与前端 `invoke`，参数、返回值、异步命令与错误处理。
    - [2.2.2 事件](cheatsheets/events/README.mdx)
      `listen`/`emit` 全局与窗口事件，React 组件中订阅与清理的写法。
    - [2.2.3 状态](cheatsheets/state/README.mdx)
      `tauri::State`、`Mutex` 等容器在命令间共享和管理数据。

- 3. 插件与权限
  - [3.1 插件体系](cheatsheets/plugin-system/README.mdx)
    Tauri 2 插件模型（内置能力插件化）、插件安装与前后端注册方式。
  - [3.2 权限与能力](cheatsheets/capabilities/README.mdx)
    Capabilities 与 ACL 权限声明，前端窗口与插件的授权配置及拒绝排查。
  - [3.3 文件与持久化](cheatsheets/persistence/README.mdx)
    `fs` 与 `store` 插件：路径约定、应用数据目录、配置持久化。
  - [3.4 网络请求](cheatsheets/http/README.mdx)
    `http` 插件的 Rust 侧请求、绕过 CORS 的场景与配置。
  - [3.5 系统交互](cheatsheets/system-integration/README.mdx)
    `dialog`、`notification`、`opener`、`clipboard` 插件的常用操作。
  - [3.6 自定义插件](cheatsheets/custom-plugin/README.mdx)
    插件工程结构、Rust 命令与前端 API 的封装、发布方式。

- 4. 桌面进阶
  - [4.1 菜单与快捷键](cheatsheets/menus-shortcuts/README.mdx)
    应用菜单、上下文菜单与全局快捷键的定义和响应。
  - [4.2 系统托盘](cheatsheets/system-tray/README.mdx)
    `TrayIcon` 的创建、托盘菜单与点击行为，常驻应用的组合方式。
  - [4.3 自定义协议](cheatsheets/custom-protocol/README.mdx)
    自定义协议与 asset 协议，前端加载本地嵌入资源的路径解析。
  - [4.4 安全加固](cheatsheets/security/README.mdx)
    CSP 配置、能力收紧原则与常见危险暴露面的处理。
  - [4.5 性能与体积](cheatsheets/performance/README.mdx)
    二进制体积优化、启动性能与 WebView 渲染注意事项。

- 5. 质量与发布
  - 5.1 调试与测试
    - [5.1.1 调试与日志](cheatsheets/debugging/README.mdx)
      WebView 开发者工具、Rust 日志（`log` 插件）与 panic 排查路径。
    - [5.1.2 自动化测试](cheatsheets/testing/README.mdx)
      WebDriver 驱动的端到端测试配置与用例编写。
  - 5.2 打包与分发
    - [5.2.1 打包](cheatsheets/bundling/README.mdx)
      bundler 配置、DMG/MSI/AppImage 产物、图标与元数据。
    - [5.2.2 代码签名](cheatsheets/code-signing/README.mdx)
      macOS 公证与 Windows 签名的配置和常见失败原因。
    - [5.2.3 自动更新](cheatsheets/updater/README.mdx)
      `updater` 插件、更新签名与更新清单的发布流程。
    - [5.2.4 CI/CD](cheatsheets/ci-cd/README.mdx)
      GitHub Actions 配合 tauri-action 的多平台构建与发布。

- 6. 移动端
  - [6.1 移动端起步](cheatsheets/mobile-setup/README.mdx)
    iOS/Android 环境要求、初始化目标平台与模拟器运行。
  - [6.2 移动端差异](cheatsheets/mobile-adaptation/README.mdx)
    生命周期、平台权限声明与插件的移动端支持差异。
  - [6.3 移动端发布](cheatsheets/mobile-release/README.mdx)
    iOS 与 Android 的打包签名和商店发布流程。
