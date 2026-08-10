# Konva.js

- 1. 起步与架构
  - [1.1 安装与第一个场景](cheatsheets/first-scene/README.mdx)
    安装 Konva，搭建 Stage + Layer + Shape 的最小场景并渲染到页面。
  - [1.2 核心架构](cheatsheets/architecture/README.mdx)
    Stage / Layer / Node 的树形结构、坐标系与绘制刷新机制。

- 2. 形状与样式
  - 2.1 形状
    - [2.1.1 矩形、圆与椭圆](cheatsheets/basic-shapes/README.mdx)
      Rect、Circle、Ellipse 的创建、定位与常用属性。
    - [2.1.2 线、多边形与路径](cheatsheets/lines-polygons/README.mdx)
      Line、Polygon、RegularPolygon、Star、Arrow、Path 的绘制。
    - [2.1.3 文本](cheatsheets/text/README.mdx)
      Text 的内容、字体、换行与文本测量。
    - [2.1.4 图片](cheatsheets/image/README.mdx)
      Image 的加载、裁剪与变换。
    - [2.1.5 自定义形状](cheatsheets/custom-shape/README.mdx)
      用 Shape + sceneFunc 绘制任意图形。
  - 2.2 样式
    - [2.2.1 填充、描边与阴影](cheatsheets/fill-stroke/README.mdx)
      fill、stroke 的颜色、宽度、虚线与阴影。
    - [2.2.2 渐变与图案](cheatsheets/gradients-patterns/README.mdx)
      线性 / 径向渐变与图案填充。

- 3. 变换与组织
  - [3.1 变换](cheatsheets/transform/README.mdx)
    位置、缩放、旋转、偏斜与层级（z-index）。
  - [3.2 分组](cheatsheets/group/README.mdx)
    Group 的组织、变换继承与子节点管理。
  - [3.3 变换器](cheatsheets/transformer/README.mdx)
    Transformer 的可视化缩放、旋转与锚点配置。

- 4. 事件与交互
  - [4.1 事件系统](cheatsheets/events/README.mdx)
    鼠标、触摸、键盘焦点与事件冒泡。
  - [4.2 拖拽](cheatsheets/drag-and-drop/README.mdx)
    draggable、拖拽事件、约束与对齐。
  - [4.3 命中检测](cheatsheets/hit-detection/README.mdx)
    命中区域、hitFunc 与命中性能。

- 5. 动画
  - [5.1 帧动画](cheatsheets/animation/README.mdx)
    Animation 的逐帧重绘与循环控制。
  - [5.2 补间与缓动](cheatsheets/tween/README.mdx)
    Tween 的属性过渡与缓动函数。

- 6. 数据与导出
  - [6.1 序列化](cheatsheets/serialization/README.mdx)
    toJSON 与从 JSON 还原整个场景。
  - [6.2 导出](cheatsheets/export/README.mdx)
    toDataURL、toCanvas、toImage 与高清导出。

- 7. 性能与滤镜
  - [7.1 缓存与性能](cheatsheets/cache-performance/README.mdx)
    cache、分层、批量绘制与重绘控制。
  - [7.2 滤镜](cheatsheets/filters/README.mdx)
    内置滤镜（模糊、颜色、像素化等）及其与缓存的关系。
