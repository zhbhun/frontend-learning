# z-index

- 层叠上下文形成条件：

    - 文档根元素（`<html>`）；
    - position 值为 absolute（绝对定位）或  relative（相对定位）且 z-index 值不为 auto 的元素；
    - position 值为 fixed（固定定位）或 sticky（粘滞定位）的元素； 
    - flex (flex) 容器的子元素，且 z-index 值不为 auto；
    - grid (grid) 容器的子元素，且 z-index 值不为 auto；
    - opacity 属性值小于 1 的元素；
    - mix-blend-mode 属性值不为 normal 的元素；
    - 以下任意属性值不为 none 的元素：transform、filter、backdrop-filter、perspective、clip-path、mask / mask-image / mask-border
    - isolation 属性值为 isolate 的元素；
    - will-change 值设定了任一属性而该属性在 non-initial 值时会创建层叠上下文的元素（参考这篇文章）；
    - contain 属性值为 layout、paint 或包含它们其中之一的合成值（比如 contain: strict、contain: content）的元素。

- 子元素层叠上下文的 z-index 值只在父级中才有意义；

## 参考文献

- [层叠上下文](https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_Positioning/Understanding_z_index/The_stacking_context)
- [用 3D 方式查看层叠上下文（CSS `z-index` 属性）](http://blog.zjffun.com/2020/05/30/view-the-stacking-context/)
