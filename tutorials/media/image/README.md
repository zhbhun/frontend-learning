# 图片

| 类型 | Alpha 通道 | 动画 | 编解码性能 | 压缩算法 | 颜色支持 | 兼容性 |
| --- | --- | --- | --- | --- | --- | --- |
| Gif | 支持 | 支持 | 较高 | 无损压缩 | 索引色(256) | 好 |
| PNG-8/PNG-24 | 支持 | 不支持 | 较高 | 无损压缩 | 索引色(256) / 直接色 | 好 |
| JPEG | 不支持 | 不支持 | 较高 | 有损压缩 | 直接色 | 好 |
| WebP | 支持 | 支持 | 较差 | 有损/无损压缩 | 直接色 | 一般 |
| AVIF | 支持 | 支持 | 渐进式解码 | 有损/无损压缩 | 直接色 | 差 |
| JPEG XL | 支持 | 支持 | 一般 | 有损/无损压缩 | 直接色 | 非常差 |

## 渐进式渲染

- [图片渐进加载优化](https://juejin.cn/post/7016317182766383141)
- [medium.com 是如何让图片加载时从模糊到清晰的？](https://www.zhihu.com/question/40757342)
- [mozjpeg](https://github.com/mozilla/mozjpeg)
- [imagemin-mozjpeg](https://github.com/imagemin/imagemin-mozjpeg)
- [mozjpeg-bin](https://github.com/imagemin/mozjpeg-bin)
- [interlace-png-with-Adam7](https://github.com/chenzeze/interlace-png-with-Adam7)


## 参考文献

- [现代图片性能优化及体验优化指南 - 图片类型及 Picture 标签的使用](https://juejin.cn/post/7198182873366888509)
