# 数据统计

## 指标

- 访问量

    - PV/UV
    - 页面来源
    - 操作系统
    - 浏览器
    - 分辨率
    - 登录率
    - 地域分布
    - 网络类型
    - 访问时段
    - 停留时长
    - 到达深度

- 点击

    - 页面总点击量
    - 人均点击量
    - 流出 url
    - 点击时间
    - 首次点击时间
    - 点击热力图

## 实现方案

- [Google Analytics](https://analytics.google.com/analytics/web/)
- [matomo](https://github.com/matomo-org/matomo) - Matomo（以前称为 Piwik）是一款开源的 Web 分析工具，可以帮助企业收集和分析其网站的访问数据。Matomo 提供了一些功能，如实时数据报告、用户行为分析、自定义报告和可视化工具。
- [posthog](https://github.com/PostHog/posthog) - PostHog 是一款开源的产品分析平台，它可以帮助企业收集、分析和可视化用户行为数据，从而更好地理解用户行为，优化产品体验，提升产品转化率。
- [Countly](https://github.com/Countly) - Countly 是一款开源的产品分析平台，可以帮助企业收集、分析和可视化用户行为数据。Countly 提供了一些功能，如实时数据报告、漏斗分析、事件路径分析和用户留存分析。
- [Plausible](https://plausible.io/) / https://github.com/plausible/analytics - Plausible is lightweight and open source web analytics. No cookies and fully compliant with GDPR, CCPA and PECR. Made and hosted in the EU, powered by European-owned cloud infrastructure
- [Keen](https://github.com/keen) - Keen 是一款开源的云端分析平台，可以帮助企业收集和分析其用户行为数据。Keen 提供了一些功能，如自定义事件收集、数据可视化、实时数据报告和 A/B 测试工具。
- [snowplow-javascript-tracker](https://github.com/snowplow/snowplow-javascript-tracker) - Snowplow event tracker for client-side and server-side JavaScript. Add analytics to your websites, web apps and servers.
- [segmentio analytics.js](https://github.com/segmentio/analytics.js/) - Analytics.js makes it easy to collect customer data and send it to many different tools using a single, unified API.
- [Amplitude](https://amplitude.com/) - Amplitude 是一款面向企业级客户的数据分析平台，提供了一种强大的方式来收集、分析和可视化您的用户数据。Amplitude 通过 JavaScript 库来收集事件和用户行为数据，并将其发送到后端进行处理和分析。
- [mixpanel](https://mixpanel.com/) - Mixpanel 是另一款强大的数据分析平台，专注于用户行为分析和转化跟踪。Mixpanel 提供了一种称为“Mixpanel.js”的 JavaScript 库，可用于在 Web 应用程序中捕获事件和用户行为数据，并将其发送到后端进行分析。
- https://beamanalytics.io/

## 参考文献

- [点击量统计的两种方案的优劣？](https://www.zhihu.com/question/34810604)
- [页面跳转时，统计数据丢失问题探讨](https://www.barretlee.com/blog/2016/02/20/navigator-beacon-api/)
- [user-tracking-demos](https://github.com/ruanyf/user-tracking-demos)
- [如何计算网站访问的有效PV量](http://www.sunnyu.com/?p=155)
- [几种常见WEB日志分析方法中被统计的用户访问量差异产生原因分析](http://www.sunnyu.com/?p=134)
- [为什么你统计 PV 的方式是错的？](https://juejin.im/post/58ef1fcc570c3500561c2e89#heading-5)
- [淘宝客网站为什么使用中间跳转页面间接转向淘宝店铺？](https://www.zhihu.com/question/21222345)
- [当你点击百度结果链接后，都发生了什么？](https://maxket.com/what-happened-after-clicking-baidu-result/)
- [Improved tracking with the `<a ping>` attribute - HTML5](https://deanhume.com/improved-tracking-with-the-a-ping-attribute-html5/)
- [Some thoughts on anchor ping](https://lapcatsoftware.com/articles/Safari-link-tracking2.html)
- https://caniuse.com/#feat=ping
- [前端监控 - 你的PV统计可能是错的](https://zhuanlan.zhihu.com/p/44933114)
- [从一个埋点日志上报脚本说起](https://juejin.im/post/5c711089518825620b45271a)
- [专业术语](https://tongji.baidu.com/web/help/article?id=253&type=0)

## TODO

思考 SPA 等现代前端技术方案给数据统计带来的挑战
