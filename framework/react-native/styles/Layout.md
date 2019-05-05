- [Styles with percentage values](https://github.com/facebook/react-native/issues/364)

# 布局
- [react-native 之布局篇](https://segmentfault.com/a/1190000002658374)
- https://github.com/tmallfe/tmallfe.github.io/issues/19

# 适配
- [PixelRatio](http://reactnative.cn/docs/0.45/pixelratio.html)

---

- [How to dynamically set height of view based on its width by keeping aspect ratio?](https://stackoverflow.com/questions/37133897/how-to-dynamically-set-height-of-view-based-on-its-width-by-keeping-aspect-ratio)

# 像素密度

- 1

    - mdpi Android 设备 (160 dpi)
- 1.5

    - hdpi Android 设备 (240 dpi)
- 2

    - iPhone 4, 4S
    - iPhone 5, 5c, 5s
    - iPhone 6
    - xhdpi Android 设备 (320 dpi)

- 3

    - iPhone 6 plus
    - xxhdpi Android 设备 (480 dpi)

- 3.5

    - Nexus 6

# 响应式设计
- 等比缩放：大屏设备等比缩放效果差，
- 媒体查询：开发成本高（需要维护多套样式），但可以针对特殊大小屏幕的做布局调整
- 等比缩放 + 媒体查询

## 等比缩放
- 位置：根据容器宽高和设计稿占比计算
- 大小
    
    - 宽度：根据容器宽度和设计稿占比计算
    - 高度：根据响应式的宽度和比例缩放

- 字体：根据容器高度和行高，行高和字体大小比例计算实际字体大小

    例如，实际容器高度为 100，行高与容器高度比例为 2 / 5，行高和字体大小比例为 14 / 20，则实际字体大小为 14。如果容器高度为 200，则字体大小为 28。

- 居中：使用 Flebox 的 justifyContent 和 alignItems 来实现居中。如果遇到特殊的背景图片（可能上下不对称），先细微调整内外边距。

## 媒体查询
TODO
