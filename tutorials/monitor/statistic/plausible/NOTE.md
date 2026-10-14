# 学习笔记：Plausible Analytics

## 偏好
- 主题边界为完整主题：接入与使用（脚本、事件、目标、看板、API、集成）+ 自托管 CE（Docker 部署、配置、升级）+ 内部架构（Elixir/Phoenix、ClickHouse 设计）与源码级二次开发。
- 范例事件真实上报到本地 Docker 运行的 Community Edition 实例，用看板和 API 响应作为可观察证据。
- 示例站点默认纯 HTML/JS（沿用 html-vite 工作区）；React/Next.js 等框架集成以对应课程的内容和代码示例覆盖，不单独搭框架工程。

## 工作笔记
- CE 缺少云端高级功能：funnels、ecommerce 目标、SSO、Sites API、高级机器人过滤；涉及这些功能的课程需标注「云端专属」，证据改用文档或接口结构说明。
- CE 版本一年两次发布，API 和行为可能与云端有差异；课程内容以 CE 实测为准，云端差异单独标注。
