BFC(Block Formatting Context)，块级格式化上下文，是Web页面中盒模型布局的CSS渲染模式。它的定位体系属于常规文档流。
========


## 布局规则

- > 内部的Box会在垂直方向，一个接一个地放置。
- > Box垂直方向的距离由margin决定。属于同一个BFC的两个相邻Box的margin会发生重叠
- > 每个元素的margin box的左边， 与包含块border box的左边相接触(对于从左往右的格式化，否则相反)。即使存在浮动也是如此。
> BFC的区域不会与float box重叠。
> BFC就是页面上的一个隔离的独立容器，容器里面的子元素不会影响到外面的元素。反之也如此。
> 计算BFC的高度时，浮动元素也参与计算

## 触发机制

- float 不等于 none
- position 不等于 static, relative
- display 等于 inline-blocks, table-cells, table-captions, flex, inline-flex
- overflow 不等于 visible

## 实际应用

- 防止外边距折叠
- 清除浮动
- 防止文字环绕

## 参考文献

- [理解CSS中BFC](https://www.w3cplus.com/css/understanding-block-formatting-contexts-in-css.html)
- [前端精选文摘：BFC 神奇背后的原理](http://www.cnblogs.com/lhb25/p/inside-block-formatting-ontext.html)
