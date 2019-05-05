IFC，Inline Formatting Context。
========

- 盒子一个接一个地水平排列，起点是包含块的顶部；
- 水平方向上的 margin，border 和 padding 在盒子之间得到保留；
- 盒子在垂直方向上可以以不同的方式对齐：它们的顶部或底部对齐，或根据其中文字的基线对齐；
- 对于非替换元素，比如a，span等标签可以设置水平方向上的margin和padding但是无法设置垂直方向的margin和padding；
- 而对于替换元素比如input、img等标签，是可以正常使用margin、border、padding的。
