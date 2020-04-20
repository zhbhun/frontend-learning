# 初始比较

## 打包大小

| 对比 | Gzip | Parsed | Stat |
| --- | --- | --- | --- |
| react | 40.66 KB | 129.03 KB | 197.27 KB |
| preact | 7.99 KB | 20.35 KB | 33.01 KB |

总结：preact 打包出来的项目文件比 preact 小 6 倍左右，Gzip 后的体积相差 32.7 KB 左右，在随着业务的增长后，这点体积可能可以忽略不计。

## 加载耗时

| 对比 | Gzip |
| --- | --- |
| react | 700ms |
| preact | 540ms |

备注：在 i7 9750H Chrome 81 上 CPU 限速 6 倍的情况下测试网页的加载时长。
