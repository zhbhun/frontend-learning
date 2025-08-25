- [SVG](https://www.joshwcomeau.com/svg/friendly-introduction-to-svg/) - https://www.joshwcomeau.com/svg/friendly-introduction-to-svg/

---

缩放矢量图形，即 SVG，是 W3C XML 的分支语言之一，用于标记可缩放的矢量图形。
========

# 历史

- 1999年: SVG 诞生
- 2003年: SVG 成为 W3C 标准，并且推出了 SVG Tiny 和 SVG Basic

    - SVG 1.0
    - SVG 1.1
    - SVG Tiny: 主要是为性能低的小设备生成图元
    - SVG Basic: 实现了完整版 SVG 里的很多功能, 只是舍弃了难以实现的大型渲染（比如动画）

- 2008年: SVG Tiny 1.2 成为 W3C 推荐标准
- 2011年: SVG 1.1 第二个版本成为 W3C 推荐标准
- 进行中: SVG 2.0

# 用法
- 绘制

    1. 配置 svg 根元素

        - 应舍弃来自 (X)HTML的doctype声明，因为基于SVG的DTD验证导致的问题比它能解决的问题更多。
        - 属性 version 和 属性 baseProfile 属性是必不可少的，供其它类型的验证方式确定SVG版本。
        - 作为 XML 的一种方言，SVG 必须正确的绑定命名空间 （在xmlns属性中绑定）。

    2. 配置子元素：SVG 文件全局有效的规则是“后来居上”，越后面的元素越可见。

- 展示

    - 浏览器：可以直接打开 svg 文件
    - HTML 内嵌

        - XHTML 且声明类型为 `application/xhtml+xml`：可以直接把 SVG 嵌入到 XML 源码中
        - HTML5：可以直接嵌入SVG，但为了符合 HTML5 标准，需要做一些语法调整。

    - HTML 元素

        - `<object data="image.svg" type="image/svg+xml" />`
        - `<iframe src="image.svg"></iframe>`
        - `<img src="image.svg">`

    - JavaScript：通过 JavaScript 动态创建并注入到 HTML DOM 中

# 坐标
TODO

# 形状
- `rect`：矩形
- `circle`：圆形
- `ellipse`：椭圆形
- `line`：线条
- `polyline`：折线
- `polygon`：多边形
- `path`：路径

# 教程
- [SVG教程](https://developer.mozilla.org/zh-CN/docs/Web/SVG/Tutorial)
- [An SVG Primer for Today's Browsers](https://www.w3.org/Graphics/SVG/IG/resources/svgprimer.html)
- [caniuse SVG](https://caniuse.com/#search=svg)
