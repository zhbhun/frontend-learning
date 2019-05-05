定位
========

## 静态定位

TODO

## 相对定位

TODO

## 绝对定位

TODO

## 固定定位

TODO

## 吸附定位

- 测试示例

    - [粘性页签栏](./examples/sticky-tabs.html)

- 参考文献

    - [An event for CSS position:sticky](https://developers.google.com/web/updates/2017/09/sticky-headers)
    - [Making Elements Stick in CSS Using position: sticky](https://alligator.io/css/position-sticky/)
    - [dollarshaveclub/stickybits](https://github.com/dollarshaveclub/stickybits)

## 常见问题

### position 的值 relative 和 absolute 定位原点是？

- absolute：生成绝对定位的元素，相对于值不为 static 的第一个父元素进行定位；
- relative：生成相对定位的元素，相对于其正常位置进行定位；

### 绝对定位对父元素的布局影响

- 父元素（固定高度+相对定位+溢出滚动）+子元素（绝对定位）

    子元素的高度大于父元素的高度时会产生内部滚动

- 父元素（固定高度+相对定位+溢出隐藏）+子元素（绝对定位）

    子元素的高度大于父元素的高度时，子元素会被父元素的溢出隐藏给裁剪掉

- 父元素（固定高度+溢出滚动）+子元素（绝对定位）

    子元素的高度大于父元素的高度时不会产生内部滚动，子元素会溢出显示

- 父元素（固定高度+相对定位）+子元素（绝对定位）

    子元素的高度大于父元素的高度时父元素不会被撑开，子元素会溢出显示

- 父元素（固定高度+溢出隐藏）+子元素（绝对定位）

    子元素的高度大于父元素的高度时子元素会溢出显示

- 父元素（固定高度）+子元素（绝对定位）

    子元素的高度大于父元素的高度时子元素会溢出显示

[测试示例](./examples/absolute-layout.html)

参考文献

- https://www.w3.org/TR/CSS21/visufx.html#overflow
- [overflow不一定能隐藏元素（position:absolute）](https://blog.csdn.net/liufeng520/article/details/26058775)
- [Absolute position and Overflow:hidden](https://stackoverflow.com/questions/5513382/absolute-position-and-overflowhidden)
- [position: relative, overflow: hidden parent and absolute child](https://stackoverflow.com/questions/11319102/position-relative-overflow-hidden-parent-and-absolute-child)
- [Advanced: Overflow hidden with absolutely positioned child of static parent](https://css-tricks.com/forums/topic/advanced-overflow-hidden-with-absolutely-positioned-child-of-static-parent/)

## TODO

- [CSS Stacking Context 里那些鲜为人知的坑](https://segmentfault.com/a/1190000002783265)
