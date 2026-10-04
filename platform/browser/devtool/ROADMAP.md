# Chrome DevTools

- 1. 上手与界面
  - 1.1 界面基础
    - [1.1.1 认识 DevTools](cheatsheets/overview/README.mdx)
      打开 DevTools 的各种方式、界面布局与面板地图。
    - [1.1.2 高效操作](cheatsheets/shortcuts/README.mdx)
      快捷键、Command Menu 命令面板与设置定制。
  - 1.2 DOM 与 CSS
    - [1.2.1 检查 DOM](cheatsheets/inspect-dom/README.mdx)
      在 Elements 中查看、编辑 DOM 并定位页面元素。
    - [1.2.2 查看与修改 CSS](cheatsheets/edit-css/README.mdx)
      用 Styles、Computed 与盒模型实时调试样式。
    - [1.2.3 调试布局](cheatsheets/debug-layout/README.mdx)
      用 Layout 视图排查 Flexbox、Grid 与层叠问题。

- 2. JavaScript 调试
  - [2.1 Console 入门](cheatsheets/console/README.mdx)
    查看与过滤日志，掌握常用 console API。
  - [2.2 与页面交互](cheatsheets/command-line-api/README.mdx)
    用命令行 API 与 Live Expression 查询、修改页面状态。
  - [2.3 断点调试](cheatsheets/breakpoints/README.mdx)
    在 Sources 中设置断点、单步执行并检查作用域与调用栈。
  - [2.4 高级断点](cheatsheets/advanced-breakpoints/README.mdx)
    条件断点、logpoint 与 DOM、XHR、事件监听、异常断点。
  - [2.5 修改落盘与复用](cheatsheets/persist-edits/README.mdx)
    用 Workspaces、Local Overrides 和 Snippets 保存与复用修改。

- 3. 网络调试
  - [3.1 查看请求](cheatsheets/network/README.mdx)
    用 Network 面板检查请求详情、筛选与导出 HAR。
  - [3.2 控制请求](cheatsheets/network-overrides/README.mdx)
    网络节流、阻断请求与本地覆盖请求头、响应。
  - [3.3 检查 WebSocket 与 SSE](cheatsheets/websocket/README.mdx)
    观察 WS 与 EventSource 的消息帧与连接状态。

- 4. 性能分析
  - 4.1 性能录制与分析
    - [4.1.1 性能指标](cheatsheets/performance-metrics/README.mdx)
      理解 Core Web Vitals 指标与性能分析的整体思路。
    - [4.1.2 录制与分析轨迹](cheatsheets/performance-traces/README.mdx)
      用 Performance 面板录制轨迹并解读火焰图与瀑布图。
    - [4.1.3 CPU 热点](cheatsheets/cpu-profiler/README.mdx)
      用 JavaScript Profiler 定位函数级性能瓶颈。
    - [4.1.4 渲染诊断](cheatsheets/rendering-tools/README.mdx)
      用 Rendering 工具检查重绘、布局偏移与帧率。
  - 4.2 内存分析
    - [4.2.1 内存快照](cheatsheets/memory-snapshots/README.mdx)
      用 Heap Snapshot 读取 Summary、Comparison、Containment 视图。
    - [4.2.2 定位内存泄漏](cheatsheets/memory-leaks/README.mdx)
      用分配记录与 Detached Elements 排查常见泄漏模式。

- 5. 应用与安全
  - [5.1 浏览器存储调试](cheatsheets/storage/README.mdx)
    检查 localStorage、Cookies、IndexedDB 与 Cache Storage。
  - [5.2 Service Worker 与 PWA](cheatsheets/service-worker-pwa/README.mdx)
    调试 Service Worker、Manifest 与后台服务。
  - [5.3 安全与问题排查](cheatsheets/security-issues/README.mdx)
    用 Security 与 Issues 面板发现 HTTPS、混合内容等问题。

- 6. 模拟与测试
  - [6.1 设备与网络模拟](cheatsheets/device-mode/README.mdx)
    用 Device Mode 模拟视口、触摸、传感器与网络状况。
  - [6.2 动画调试](cheatsheets/animations/README.mdx)
    用 Animations 面板慢放、重放和修改动画。
  - [6.3 录制与回放用户流](cheatsheets/recorder/README.mdx)
    用 Recorder 录制、编辑回放并导出自动化脚本。
  - [6.4 Lighthouse 审计](cheatsheets/lighthouse/README.mdx)
    运行质量审计并解读性能、可访问性与 SEO 报告。
  - [6.5 可访问性调试](cheatsheets/accessibility/README.mdx)
    检查无障碍树、ARIA 属性与颜色对比度。

- 7. 生态与进阶
  - [7.1 远程与移动端调试](cheatsheets/remote-debugging/README.mdx)
    用 chrome://inspect 调试真机，并对比页面内调试方案。
  - [7.2 协议与自动化](cheatsheets/devtools-protocol/README.mdx)
    理解 CDP、Puppeteer/Playwright 与 DevTools MCP 的关系。
