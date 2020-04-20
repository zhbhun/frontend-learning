# 初始比较

## 打包大小

| 对比 | Gzip | Parsed | Stat |
| --- | --- | --- | --- |
| react | 40.66 KB | 129.03 KB | 197.27 KB |
| preact | 7.99 KB | 20.35 KB | 33.01 KB |

总结：preact 打包出来的项目文件比 preact 小 6 倍左右，Gzip 后的体积相差 32.7 KB 左右，在随着业务的增长后，这点体积可能可以忽略不计。

## 执行耗时

在 i7 9750H 设备的 Chrome 81 上测试网页的执行耗时（开启了浏览器缓存取 load 事件的触发时间）。

不限速

| 对比 | load |
| --- | --- |
| react | 49ms |
| preact | 79ms |

限 6 倍

| 对比 | load |
| --- | --- |
| react | 206ms |
| preact | 364ms |
