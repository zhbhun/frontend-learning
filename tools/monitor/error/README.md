# 错误监控

## 开源工具

- [badjs-report](https://github.com/BetterJS/badjs-report)

## 商业产品

- [Fundebug](https://www.fundebug.com/)
- [Frontjs](https://www.frontjs.com/)
- [BugSnag](https://www.bugsnag.com/)

## 参考文献

- [GlobalEventHandlers.onerror](https://developer.mozilla.org/zh-CN/docs/Web/API/GlobalEventHandlers/onerror)
- [浏览器端 JavaScript 异常监控 For Dummies.pdf](https://github.com/kof97/QCon/blob/master/%E5%85%A8%E7%90%83%E8%BD%AF%E4%BB%B6%E5%BC%80%E5%8F%91%E5%A4%A7%E4%BC%9A2016%E4%B8%8A%E6%B5%B7PDF/%E6%B5%8F%E8%A7%88%E5%99%A8%E7%AB%AF%20JavaScript%20%E5%BC%82%E5%B8%B8%E7%9B%91%E6%8E%A7%20For%20Dummies.pdf)
- [前端异常监控系统的落地](https://zhuanlan.zhihu.com/p/26085642)
- [前端 异常处理 以及上报](https://github.com/jerryni/blog/issues/5)
- [前端监控到底怎么做](https://github.com/pengkobe/reading-notes/issues/55)
- [把前端监控做到极致](https://juejin.im/post/5a52f138f265da3e5b32a41b)
- [如何做前端异常监控？](https://www.zhihu.com/question/29953354)
- [How to catch JavaScript Errors with window.onerror (even on Chrome and Firefox)](https://danlimerick.wordpress.com/2014/01/18/how-to-catch-javascript-errors-with-window-onerror-even-on-chrome-and-firefox/)
- [前端代码异常监控](http://rapheal.sinaapp.com/2014/11/06/javascript-error-monitor/)
- [前端相关数据监控](http://www.alloyteam.com/2014/03/front-end-data-monitoring/)

## TODO

1. 大公司解决方案

    - 腾讯：[BetterJS](https://github.com/BetterJS)

        - https://betterjs.github.io/
        - [前端异常监控 - BadJS](https://slides.com/loskael/badjs/fullscreen#/)
        - [badjs开发指南](https://imweb.io/topic/5b67dfeaf3fbd8d9125fe7ff)
        - [腾讯云 Badjs 镜像使用入门](https://cloud.tencent.com/developer/article/1004564)
        - [浅析badjs源码（前端监控方案）](https://juejin.im/post/5b434402f265da0f7d4edf77)
        - [开源前端脚本错误监控及跟踪解决项目BadJS试用](https://blog.csdn.net/Fundebug/article/details/86489964)
        - [开源前端脚本错误监控及跟踪解决项目-BadJS 试用](https://www.cnblogs.com/wang2650/p/9087824.html)

    - 淘宝：JSTracker

        - [JSTracker 之前端异常数据采集](https://feehi.com/view/936)

    - 阿里巴巴：FdSafe

        - [构建Web前端异常监控系统–FdSafe](https://cloud.tencent.com/info/c5f3d092a243028a3d0da7a5b6a88336.html)

    - 支付宝：[sai.js](https://github.com/saijs)

        - [JavaScript 异常档案](https://saijs.github.io/wiki/)

    - Sentry：[Sentry's Raven.js](https://ravenjs.com/) [sentry-javascript]（https://github.com/getsentry/sentry-javascript

2. 要怎么搭建错误监控平台？

    - 前端 SDK：错误拦截，代理监控，上报策略
    - 错误日志存储和查询
    - 错误日志可视化平台
    - 错误预警
    - ...

3. 前端 SDK 的设计开发

    - 错误拦截（window.onerror）

        - 异常系统介绍

            [JavaScript Errors 指南](https://mp.weixin.qq.com/s/e4_AdSWMxl1BXLfMl-sAgA)

            [Top 10 JavaScript errors from 1000+ projects (and how to avoid them)](https://rollbar.com/blog/top-10-javascript-errors/)

        - 全局错误捕获 —— 思考有哪些错误会触发全局错误捕获事件？
        - 怎么利用 window.onerror 上报错误到监控平台？ —— 全局错误捕获存在哪些问题（例如：跨域和兼容性问题）？

    - 代理监控
    - 上报策略
    - ...
    - 

4. 错误存储和查询

    - 错误的存储机制

        - 可以使用写入数据库方式或者写缓存方式吗？ —— 采用日志服务
        - 如何解决日志服务不好做实时处理的问题？ —— 日志量通常很大，对日志做一些排序，汇总，聚合，查询等操作，会非常耗时。
        - 现有的解决方案：

            - 前端机（指服务层，有负载均衡策略），如：PHP，NodeJS，将日志写入本地日志文件
            - 总日志服务器通过拉取的方式把不同前端机收集到的日志做汇总写入 ElasticSearch

    - 错误日志的查询机制

        使用 ElasticSearch 的 API 进行聚合，查询等操作，完成日志的实时可看，实时可查，以及统计和汇总分析。

5. 监控日志可视化

    - 用户管理
    - 权限管理
    - 错误聚合以及展示
    - 错误详情展示

    开源实现

    - [kibana](https://elasticsearch.cn/topic/kibana)
    - [sentry](https://sentry.io/organizations/learning-w5/issues/)

6. 监控日志预警

    [sentry](https://sentry.io/organizations/learning-w5/issues/)
