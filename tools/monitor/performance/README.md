# 性能监控

## 指标

- 白屏时间
- 首屏时间
- 用户可操作时间
- 页面总下载时间

## 工具

商业

- [newrelic](https://newrelic.com)
- [SpeedCurve](https://speedcurve.com)
- [oneapm](https://www.oneapm.com)
- [听云](https://demo.tingyun.com/browser-web)
- [监控宝](https://www.jiankongbao.com)
- [mmtrix](http://www.mmtrix.com)
- [FrontJS](https://www.frontjs.com/)
- [阿里云](https://help.aliyun.com/document_detail/58652.html?spm=a2c4g.11186623.3.2.56643ddf5ZO9HF)

开源

- [BuckyClient](https://github.com/HubSpot/BuckyClient) / https://github.hubspot.com/BuckyServer/
- [zanePerfor](https://github.com/wangweianger/zanePerfor)
- [web-monitoring](https://github.com/kisslove/web-monitoring/)
- [OpenSpeedMonitor](https://github.com/iteratec/OpenSpeedMonitor)

## 功能

- 应用管理

    - 查询

        - 数据过滤：时间等
        - 应用列表：名称、性能、访问量
        - 数据排序

    - 新增：输入应用名称等
    - 修改：是否启用等
    - 删除

- 应用仪表盘

    - Apdex 趋势图
    - 访问量 & 平均加载时间趋势图
    - 性能区间趋势图
    - Ajax 调用量 & 平均响应时间

- 应用特征统计

    - 地理区域

        - 地理区域颜色标记可视化性能图表
        - 指定地理区域的访问量和平均加载时间趋势图、Apdex趋势图
        - 平均加载时间和访问量的地理区域排行榜

    - 浏览器

        - 浏览器类型访问量占比和性能数据
        - 指定浏览器的 Apdex 趋势图、访问量&平均加载时间趋势图和性能区间
        - 指定浏览器的版本访问量占比和平均加载时间

    - 运营商

        - 运营商类型访问量占比和性能数据
        - 指定运营商的 Apdex 趋势图、访问量&平均加载时间趋势图和性能区间

    - 设备

        - 设备类型访问量占比和性能数据
        - 指定设备的 Apdex 趋势图、访问量&平均加载时间趋势图和性能区间

    - IP

        - IP 访问量和性能数据
        - 指定 IP 的性能趋势图
        - 指定 IP 的慢加载追踪

    - 用户

        - 用户访问量和性能数据
        - 指定用户的性能趋势图
        - 指定用户的慢加载追踪

- 应用慢加载追踪

    - 按平均加载时间倒序排列的访问信息和性能数据
    - 指定访问记录的明细加载情况：访问信息、耗时时序图、资源列表时序图和资源类型统计

- 应用访问页面

    - 应用页面列表：Apdex、性能数据、访问量数据
    - 指定页面的性能详情：Apdex 趋势图、访问量&平均加载时间趋势图和性能区间趋势图
    - 指定页面的 Ajax 调用分析：Ajax 名称、平均响应时间，调用量
    - 指定页面的慢加载追踪：访问时间、URL、地理位置、IP、浏览器、加载时间，可进一步查看分析加载过程

- Ajax

    - Ajax 调用 URL 列表：URL、请求方式、调用量、性能数据
    - 指定 URL 的性能详情和调用页面

- 报表：按日期导出日报和周报

    - 用户体验满意度趋势图
    - 访问量/响应时间趋势图
    - 性能区间趋势图
    - 整体性能趋势图
    - 时间分片统计表：时间、访问量、平均响应时间、Apdex、Ajax 请求量、Ajax 响应时间、性能区间、用户体验
    - 地理区域响应时间及访问量
    - 浏览器响应时间及访问量
    - 运营商响应时间及访问量
    - 页面响应时间及访问量
    - Ajax 响应时间及访问量

- 告警

    - 报警规则：指标
    - 报警策略：时间、频率和级别
    - 报警行为：邮箱、SMS


## 应用

1. 如何发现问题

    - 系统告警
    - 用户反馈
    - 数据挖掘

        - 统计报表

            分析报表的平均加载时长和用户满意度的波动情况，以及对访问量的影响，分析是否存在性能较差和访问量较低的数据。

        - 应用对比

            分析应用平均加载时间排行榜，根据实际情况优化性能较差的应用

2. 如何分析问题

    - 系统告警

        确认告警信息，根据告警和页面查询对应页面在对应时间的性能监控数据，分析加载慢的原因。

    - 数据挖掘

        - 统计报表：根据报表提高的时间点去排查对应日期的性能情况，分析是哪个页面的性能变差和访问量减少了，是什么原因导致的。
        - 应用对比

    - 用户反馈：通过分析对应用户 ID 的性能监控数据来排查性能问题

        可能是该用户所在地区网络问题，肯能是该用户涉及的数据量较大，服务端性能较差或者其他原因。

    找到存在问题的记录后，排查该记录的网络耗时、DOM 构建耗时和资源渲染耗时，是哪个环节出现了问题。

3. 如何解决问题

    根据分析结果进行针对性的优化，网络的话上 CDN 和优化服务端性能，DOM 构建耗时的话优化首屏的资源加载，资源渲染耗时的话进行懒加载优化。

## 参考文献

- [7 天打造前端性能监控系统](http://fex.baidu.com/blog/2014/05/build-performance-monitor-in-7-days/)
- [百度前端性能监控与优化实践](https://www.slideshare.net/welefen/ss-13579027)
- [国内有哪些较好的前端性能监控平台？](https://www.zhihu.com/question/29945364)
- [OneAPM 与 听云 哪家更好更有前景一些？](https://www.zhihu.com/question/29363166)
- [GMTC 大前端时代前端监控的最佳实践](http://jm.taobao.org/2018/06/29/%E5%A4%A7%E5%89%8D%E7%AB%AF%E6%97%B6%E4%BB%A3%E5%89%8D%E7%AB%AF%E7%9B%91%E6%8E%A7%E7%9A%84%E6%9C%80%E4%BD%B3%E5%AE%9E%E8%B7%B5/)
- [前端监控统计平台](https://github.com/huixisheng/huixisheng.github.com/issues/21)
- [Top 9 FREE Performance Application Monitoring Tools (APM)](https://testguild.com/apm/)
- [What is a free alternative to the New Relic APM](https://www.quora.com/What-is-a-free-alternative-to-the-New-Relic-APM)
- [Best New Relic Alternatives for Application Performance Monitoring (Cloud & SaaS)](https://www.ittsystems.com/new-relic-alternatives/)
