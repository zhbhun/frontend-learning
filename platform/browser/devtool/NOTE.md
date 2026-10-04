# 学习笔记：Chrome DevTools

## 偏好
- 主题为 Chrome DevTools：浏览器内置开发者工具的调试、性能分析与质量审计。能力地图以官方文档 https://developer.chrome.com/docs/devtools 为基准。
- 主题边界：以 Chrome DevTools 为核心；Firefox、Safari 等其他浏览器工具不单独立课，跨浏览器差异在相关课程内用 devtoolstips.org 一类资源补充。Lighthouse 属于本主题（DevTools 内置审计）。真机远程调试与页面内调试方案（eruda、vConsole、PageSpy）纳入进阶阶段。Puppeteer/Playwright 教程、Node.js 调试不属于本主题，只在协议与自动化一课中说明与 DevTools 的关系。
- 运行环境以最新稳定版桌面 Chrome 为基准；涉及实验性功能时在课程内标注 Chrome 版本与启用入口（chrome://flags 或面板开关）。
- 范例媒介：每课尽量内嵌一个可运行的演示页面（Storybook Story），读者在该页面上打开 DevTools 完成操作；GUI 操作用「面板 → 区域 → 操作」的中文路径描述；流程与判断用 Mermaid 图表达；不嵌入截图（易过时且难维护）。
- 正文中文；面板名、命令与 API（Elements、`$0`、`monitorEvents` 等）保留英文，首次出现给出中文释义。
- DevTools 更新快：写课时核对当前稳定版界面，引用官方对应子页；版本间变化参考官方更新日志。

## 工作笔记
- 工作区 `tutorials/` 是用户此前的资料线索：lighthouse（官方仓库）、memory（Heap Snapshot 术语表与泄漏排查步骤）、performance（Performance 面板指南、JS 启动优化）。性能录制、内存快照与泄漏排查是用户重点收集过的方向，写相关课程时可直接取材。
- 根 README 线索 eruda、page-spy-web 已纳入资源清单与进阶路线。
