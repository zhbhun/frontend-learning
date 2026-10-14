# Plausible Analytics

- 1. 上手
  - [1.1 认识 Plausible](cheatsheets/introduction/README.mdx)
    产品定位、隐私模型与 cloud/CE 功能差异，建立主题全景。
  - [1.2 本地实例](cheatsheets/local-instance/README.mdx)
    用 Docker Compose 跑起 Community Edition，作为全套手册的范例后端。
  - [1.3 接入脚本](cheatsheets/script-setup/README.mdx)
    在 HTML 页面接入跟踪脚本，观察到第一个 pageview 进入看板。
  - [1.4 看板导览](cheatsheets/dashboard-tour/README.mdx)
    认识看板各报表区块与指标口径，对照官方公开演示看板。

- 2. 数据采集
  - 2.1 事件与目标
    - [2.1.1 自定义事件](cheatsheets/custom-events/README.mdx)
      用脚本 API 上报自定义事件，并在看板中验证。
    - [2.1.2 自定义属性](cheatsheets/custom-properties/README.mdx)
      给事件附加维度，用属性拆分统计数据。
    - [2.1.3 目标与转化](cheatsheets/goals-conversions/README.mdx)
      把 pageview 和事件设为目标，观察转化率计算。
    - [2.1.4 收入归因](cheatsheets/revenue-attribution/README.mdx)
      给事件带上收入数据，按来源计算收入归因。
    - [2.1.5 漏斗](cheatsheets/funnels/README.mdx)
      用多步目标搭建转化漏斗；云端功能，CE 中对照文档理解。
  - 2.2 采集方式
    - [2.2.1 自动追踪](cheatsheets/automatic-tracking/README.mdx)
      出站链接、文件下载、404 与表单提交的无代码追踪。
    - [2.2.2 SPA 路由](cheatsheets/spa-tracking/README.mdx)
      pushState 与 hash 路由下的 pageview 采集行为。
    - [2.2.3 绕过广告拦截](cheatsheets/proxy/README.mdx)
      通过代理脚本与 API 路径降低拦截丢失率。
    - [2.2.4 Events API](cheatsheets/events-api/README.mdx)
      从服务端或脚本直接 POST 事件，脱离浏览器环境上报。

- 3. 看板与协作
  - [3.1 筛选与细分](cheatsheets/filtering-segments/README.mdx)
    用筛选器和细分分析特定流量切片。
  - [3.2 分享与嵌入](cheatsheets/sharing-embedding/README.mdx)
    公开链接、密码保护分享和嵌入看板。
  - [3.3 邮件与 Slack 报表](cheatsheets/email-slack-reports/README.mdx)
    配置周期性报表推送到邮箱和 Slack。
  - [3.4 团队与站点管理](cheatsheets/team-sites/README.mdx)
    成员角色、站点设置与数据可见性管理。

- 4. API 与集成
  - 4.1 数据接口
    - [4.1.1 Stats API](cheatsheets/stats-api/README.mdx)
      用 API 查询聚合统计，重建看板读数。
    - [4.1.2 数据导出](cheatsheets/data-export/README.mdx)
      CSV 导出与导入迁移的边界。
    - [4.1.3 Sites API](cheatsheets/sites-api/README.mdx)
      用 API 批量开通和管理站点；云端功能。
  - 4.2 集成
    - [4.2.1 Search Console](cheatsheets/search-console/README.mdx)
      接入 Google Search Console 获得搜索词数据。
    - [4.2.2 导入 GA 数据](cheatsheets/ga-import/README.mdx)
      把 Google Analytics 历史数据导入 Plausible。
    - [4.2.3 框架与平台集成](cheatsheets/integrations/README.mdx)
      React/Next.js 等框架和 WordPress 平台的接入方式。

- 5. 自托管运维
  - [5.1 配置](cheatsheets/ce-configuration/README.mdx)
    环境变量全景：端口、SMTP、安全与采集开关。
  - [5.2 反向代理与 HTTPS](cheatsheets/ce-reverse-proxy/README.mdx)
    用 Nginx/Caddy 终结 TLS 并正确转发访客信息。
  - [5.3 升级](cheatsheets/ce-upgrade/README.mdx)
    CE 与 PostgreSQL 大版本的安全升级流程。
  - [5.4 地理位置](cheatsheets/ce-geolocation/README.mdx)
    接入 MaxMind GeoLite2 补全访客地理数据。

- 6. 内部架构
  - [6.1 总体架构](cheatsheets/architecture/README.mdx)
    Phoenix、PostgreSQL、ClickHouse 与 tracker 的分工，一次上报的完整链路。
  - [6.2 数据模型](cheatsheets/data-model/README.mdx)
    ClickHouse 中 events 与 sessions 的表结构和聚合方式。
  - [6.3 事件管线](cheatsheets/ingestion-pipeline/README.mdx)
    从 HTTP 接入到落库的缓冲、清洗与写入过程。
  - [6.4 看板前端](cheatsheets/dashboard-frontend/README.mdx)
    React 看板如何向 Phoenix API 查询并渲染报表。
  - [6.5 二次开发](cheatsheets/development/README.mdx)
    搭建开发环境、跑测试、改动 tracker 或服务端的贡献流程。
