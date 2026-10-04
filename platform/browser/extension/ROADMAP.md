# Chrome 扩展开发

- 1. 起步
  - [1.1 第一个扩展](cheatsheets/first-extension/README.mdx)
    用最小 manifest 和 popup 走通编写、加载、运行与修改的完整闭环。
  - [1.2 扩展架构](cheatsheets/extension-architecture/README.mdx)
    认识 manifest、service worker、content script、UI 页面与各自运行环境。
  - [1.3 调试扩展](cheatsheets/debugging/README.mdx)
    掌握 service worker、popup、content script 与存储各上下文的调试入口。

- 2. 核心机制
  - [2.1 Manifest 与权限](cheatsheets/manifest-permissions/README.mdx)
    梳理 manifest.json 关键字段、权限声明方式与运行时申请权限。
  - [2.2 Service Worker](cheatsheets/service-worker/README.mdx)
    理解 MV3 事件驱动的后台模型、生命周期与 offscreen documents。
  - [2.3 消息通信](cheatsheets/messaging/README.mdx)
    在扩展各上下文之间建立一次性消息与长连接通信。
  - [2.4 存储](cheatsheets/storage/README.mdx)
    使用 chrome.storage 的 local、sync、session 分区并监听变更。
  - [2.5 定时任务](cheatsheets/alarms/README.mdx)
    用 chrome.alarms 在 service worker 中调度周期性工作。

- 3. 浏览器界面
  - [3.1 Action 与弹窗](cheatsheets/action-popup/README.mdx)
    控制工具栏图标、badge 与 popup 页面。
  - [3.2 侧边栏](cheatsheets/side-panel/README.mdx)
    用 sidePanel API 在浏览器旁挂载持续界面。
  - [3.3 右键菜单与快捷键](cheatsheets/context-menus-commands/README.mdx)
    注册 contextMenus 菜单项与 commands 键盘快捷键。
  - [3.4 地址栏建议](cheatsheets/omnibox/README.mdx)
    通过 omnibox 在地址栏提供关键词建议与跳转。
  - [3.5 通知](cheatsheets/notifications/README.mdx)
    发送系统通知并处理点击交互。
  - [3.6 替换页面与选项页](cheatsheets/override-options/README.mdx)
    覆盖新标签页等浏览器页面并提供扩展设置界面。

- 4. 网页与数据
  - [4.1 Content Scripts](cheatsheets/content-scripts/README.mdx)
    注入脚本与样式读写页面 DOM，处理隔离环境与动态注入。
  - [4.2 网络请求控制](cheatsheets/network-requests/README.mdx)
    用 declarativeNetRequest 拦改请求并观察网络与导航事件。
  - [4.3 标签页与窗口](cheatsheets/tabs-windows/README.mdx)
    查询、监听与操作标签页、窗口和标签分组。
  - [4.4 浏览器数据](cheatsheets/browser-data/README.mdx)
    读写书签、历史与下载，并清理浏览数据。

- 5. 进阶能力
  - [5.1 DevTools 扩展](cheatsheets/devtools-extension/README.mdx)
    向 DevTools 注入面板并使用 chrome.debugger 调试协议。
  - [5.2 用户身份](cheatsheets/identity/README.mdx)
    用 identity API 完成 OAuth 登录与令牌管理。
  - [5.3 Native Messaging](cheatsheets/native-messaging/README.mdx)
    与本机应用建立双向通信。
  - [5.4 屏幕捕获](cheatsheets/screen-capture/README.mdx)
    捕获标签页、窗口或屏幕画面进行录制与处理。
  - [5.5 安全与隐私](cheatsheets/security-privacy/README.mdx)
    落实 CSP、禁止远程代码与最小权限等安全实践。

- 6. 发布
  - [6.1 国际化](cheatsheets/i18n/README.mdx)
    用 _locales 提供多语言文案与本地化 manifest。
  - [6.2 打包与上架](cheatsheets/publishing/README.mdx)
    打包扩展、注册 Web Store 开发者并完成发布与更新。
