# Frontjs

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
