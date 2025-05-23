# [moveable](https://github.com/daybrush/moveable)

> Moveable! Draggable! Resizable! Scalable! Rotatable! Warpable! Pinchable! Groupable! Snappable!

## 基础

### 事件处理

#### OnDrag

偏移量

- delta：The delta of [translateX, translateY]

    单次拖拽的偏移量

- dist：The distance of [translateX, translateY]

    累积拖拽的偏移量

- translate：The position of [translateX, translateY]

    累积拖拽的偏移量（同 dist）

- beforeDelta：The delta of [left, top]

    同 delta ？

- beforeDist：The distance of [left, top]

    同 dist ?

- beforeTranslate：The position of [left, top]

    同 translate ?

目标信息

- left：a target's left
- top：a target's top
- right：a target's right
- bottom：a target's bottom
- width：number	a target's offset width
- height：number a target's offset height
- transform：a target's transform

## 进阶

### 可视化编辑器的实现方案

要求：

- 禁用画布元素内部的交互行为
- 拖拽控制元素的层级是最高的
- 支持元素嵌套

方案

- 方案1：事件拦截机制

    通过事件拦截机制来禁用元素内部的交互行为，并结合 elementsFromPoint 来实现特定元素的高优先级。

    问题：事件拦截起来较为麻烦

- 方案2：遮挡和模拟事件

    通过全局遮挡层来禁用元素内部的交互行为，并结合 elementsFromPoint 来识别是否与某个元素交互。如果点击的是选中节点的话，触发 moveable 的拖拽；如果是其他元素的话，更新选中节点。
