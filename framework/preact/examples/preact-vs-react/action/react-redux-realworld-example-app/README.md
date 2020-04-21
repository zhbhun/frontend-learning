# react-redux-realworld-example-app

## 打包大小

| 对比 | Gzip | Parsed | Stat |
| --- | --- | --- | --- |
| react | 88 KB | 315 KB | 519 KB |
| preact | 55 KB | 208 KB | 409 KB |

总结：preact 打包出来的项目文件比 react 小 23 KB。

## 执行耗时

在 i7 9750H 设备的 Chrome 81 上首页的执行耗时（load 时间），并且开启了浏览器缓存和固定首屏数据。

不限速

| 对比 | 1 | 2 | 3 | 平均 |
| --- | --- | --- | --- | --- |
| react | 100ms | 110ms | 97ms | --- |
| preact | 91ms | 94ms | 103ms | --- |

限 6 倍

| 对比 | 1 | 2 | 3 |
| --- | --- | --- | --- |
| react | 973ms | 917ms | 861ms |
| preact | 851ms | 870ms | 914ms |
