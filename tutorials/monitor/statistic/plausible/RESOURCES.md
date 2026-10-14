# Plausible Analytics

- [@官方@官方站点](https://plausible.io)
  覆盖：产品定位、隐私模型、cloud 与 CE 的功能差异和定价。适用于：入门阶段理解「是什么、为什么」，以及判断某功能是否云端专属。
- [@官方@官方文档](https://plausible.io/docs)
  覆盖：接入脚本、pageview 与自定义事件、目标与转化、看板使用、绕过广告拦截（proxy）、Events/Stats API、账号与团队、各类框架和平台集成。适用于：接入与使用阶段几乎所有课程的主要依据。
- [@开源@源码仓库 plausible/analytics](https://github.com/plausible/analytics)
  覆盖：Elixir/Phoenix 服务端、React 看板前端、tracker 脚本源码、AGPLv3 许可、版本发布记录。适用于：内部架构与二次开发阶段的源码阅读，以及核对版本行为差异。
- [@开源@CE 部署仓库 plausible/community-edition](https://github.com/plausible/community-edition)
  覆盖：官方 Docker Compose 部署样例与 wiki（环境变量配置、反向代理、compose override、Google/MaxMind 集成、升级与 PostgreSQL 大版本升级）。适用于：自托管阶段全部课程，也是本地范例环境的搭建依据。
- [@官方@公开演示看板](https://plausible.io/plausible.io)
  覆盖：官方用自家站点开放的实时看板，展示访客、来源、页面、设备等完整报表形态。适用于：看板与报表课程的真实界面参照，本地实例尚无数据时的对照。

## 社区

- [GitHub Discussions](https://github.com/plausible/analytics/discussions)
  适用于：自托管配置问题、功能边界确认、版本行为差异的现实反馈；官方团队在内回复。

## 缺口说明

- 没有覆盖整个主题的系统性第三方教程或书籍，主题学习以官方文档为主；零散博客文章只服务单个知识点，用到时写进对应课程的 `## 参考资料`。
- 框架集成包（如 `@plausible-analytics/tracker`、`next-plausible`）和 WordPress 等平台插件属于细分集成入口，不进本清单，集成课程自行引用。
