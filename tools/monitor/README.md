监控系统
========

## 数据指标

- 访问

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

- 性能

    - 白屏时间
    - 首屏时间
    - 用户可操作时间
    - 页面总下载时间

- 异常

    - 异常的提示信息
    - JS 文件名
    - 异常所在行
    - 发生异常的浏览器
    - 堆栈信息

参考文献

- [前端数据之美 -- 基础篇](http://fex.baidu.com/blog/2014/05/front_end-data/)

## 功能特性

- 数据统计
- 性能分析
- 错误监控

## 开源工具

- [Sentry](https://sentry.io)
- [fex-team/alogs](https://github.com/fex-team/alogs)

## 商业产品

| 产品\特性 | 支持平台 | 功能特性 | 
| --- | --- | --- |
| [Bugsnag](https://www.bugsnag.com) | JavaScript | 错误监控 |
| [FrontJS](https://www.frontjs.com/) | JavaScript、微信小程序 | 性能监控、错误监控 |
| [FunDebug](https://www.fundebug.com) | JavaScript、Nodejs、RN、微信小程序、微信小游戏、支付宝小程序、Nodejs | 错误监控 |
| [Sentry](https://sentry.io) | JavaScript | 错误监控 |
| [听云](https://www.tingyun.com) | |
| [OneAPM](https://www.oneapm.com/) | |

小程序专用

- 微信小程序助手
- 阿拉丁小程序统计平台
- 阿里云 ARMS 前端监控

### FrontJS

- dns: DNS 查询时间

    `performance.timing.domainLookupEnd - performance.timing.domainLookupStart`

- connect: HTTP 连接时间

    `performance.timing.connectEnd` - `e.performance.timing.connectStart`

- request: 服务端响应时间

    `performance.timing.responseStart` - `performance.timing.requestStart,`

- response: 响应下载时间

    `performance.timing.responseEnd` - `performance.timing.responseStart`
    
- dom: DOM 解析时间

    `performance.timing.domInteractive` - `performance.timing.domLoading`

- domContent: 资源下载执行时间

    `performance.timing.domComplete` - `performance.timing.domInteractive`

- load: 加载完成总耗时

    `performance.timing.domComplete` - `performance.timing.domainLookupStart`

## 参考文献

- [支持多种小程序！阿里云 ARMS 推出小程序监控](https://www.infoq.cn/article/3QHswJd*3g5Q0t1GdmCP)
- [7 天打造前端性能监控系统](http://fex.baidu.com/blog/2014/05/build-performance-monitor-in-7-days/)
- [百度前端性能监控与优化实践](https://www.slideshare.net/welefen/ss-13579027)
- [The Google Analytics Setup I Use on Every Site I Build](https://philipwalton.com/articles/the-google-analytics-setup-i-use-on-every-site-i-build/)

---

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

---

## OneAPM

- 配置：

    - 项目
    - 时间段：30分钟、1小时、3小时、5小时、12小时、1天、3天、7天、15天、30天、自定义

- 仪表盘：支持

    - 总览：

        - 平均访问量 & 平均加载时长
        - 性能区间：服务端响应时长、下载时长、DOM 构建时长
        - Ajax 调用量 & 平均响应时间
        - Apdex：Apdex (Application Performance Index)是一个国际通用标准（Apdex指数=（1.0*满意样本数+0.5*容忍样本数）/样本总数（值介于0-1之间）），是对用户对应用性能满意度的量化值，定义了 3 个用户满意度区间：

            1. 满意：这样的响应时间让用户感到很愉快，响应时间少于 2 秒钟。
            2. 容忍：慢了一点，但还可以接受，继续这一应用过程，响应时间 2～8 秒。
            3. 失望：太慢了，受不了了，用户决定放弃这个应用，响应时间超过 8 秒。

        - 城市 Top 10
        - 地域分布
        - 浏览器 Top 10
        - 访问页面：展示选定时间内页面访问量占比最高的页面

    - 地理慢加载追踪：在地图上按不同区域的平均加载时长作为指标标注地图颜色，颜色越深的表示加载越慢。
    - 地理用户会话视图

- 特征统计

    - 地理区域
    - 浏览器
    - 运营商
    - 设备
    - 系统

- 慢加载追踪：按页面加载时长倒序排列
- 访问页面：每个页面的平均加载性能

    - URL
    - Apdex
    - 平均加载时间
    - 访问量
    - 访问量/分钟
    - web 应用耗时
    - 网络耗时
    - DOM 构建耗时
    - 资源渲染耗时
    - 白屏时间
    - 首屏时间
    - 最终用户体验时间

- 脚本错误：？
- Ajax：每个 Ajax 请求的平均加载性能

    - URL
    - 请求方式
    - 调用量
    - 调用量/分钟
    - 平均响应时间
    - Web 应用耗时
    - 回调函数执行时间
    - 返回数据大小
    - 正确率

- 关键业务：？
- 组合分析：地理+系统+浏览器+访问量+...
- 单页面：？
- 会话：按浏览器会话分析用户的访问统计信息和访问轨迹，以及加载性能
- 报表：？
- 告警：？
- 设置：？
