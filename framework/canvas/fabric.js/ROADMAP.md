# Fabric.js

- 1. 起步
  - [1.1 认识 Fabric.js](cheatsheets/intro/README.mdx)
    Fabric.js 的定位、能力地图与 v5/v6/v7 版本演进。
  - [1.2 安装与第一个画布](cheatsheets/getting-started/README.mdx)
    npm 安装与包结构现状（`fabric` 入口、`@fabricjs/*` 为未落地方向）、创建画布并渲染第一个图形。
  - [1.3 渲染模型](cheatsheets/rendering-model/README.mdx)
    双层画布结构、`requestRenderAll` 刷新时机与对象缓存的作用。

- 2. 图形与样式
  - 2.1 图形
    - [2.1.1 基础图形](cheatsheets/basic-shapes/README.mdx)
      Rect、Circle、Ellipse、Triangle、Line、Polyline、Polygon 的创建与通用属性。
    - [2.1.2 路径](cheatsheets/path/README.mdx)
      Path 与 SVG path 命令，绘制任意轮廓并理解路径数据结构。
  - 2.2 样式
    - [2.2.1 填充、描边与阴影](cheatsheets/fill-stroke-shadow/README.mdx)
      fill 与 stroke 的颜色、宽度、虚线，以及 Shadow、透明度与混合模式。
    - [2.2.2 渐变与图案](cheatsheets/gradients-patterns/README.mdx)
      Gradient 线性 / 径向渐变与 Pattern 图案填充。
  - 2.3 文本与图片
    - [2.3.1 文本](cheatsheets/text/README.mdx)
      FabricText 的字体、换行、富文本样式分片与文字测量。
    - [2.3.2 交互文本](cheatsheets/itext-textbox/README.mdx)
      IText / Textbox 的双击编辑与上标下标。
    - [2.3.3 图片](cheatsheets/image/README.mdx)
      FabricImage 的加载、跨域、裁剪与视频元素。
    - [2.3.4 裁剪与遮罩](cheatsheets/clip-path/README.mdx)
      clipPath 在对象与画布上限定可见区域。

- 3. 变换与组织
  - [3.1 变换](cheatsheets/transform/README.mdx)
    位置、缩放、旋转、倾斜、翻转与变换矩阵，以及 originX / originY 的作用。
  - [3.2 对象管理](cheatsheets/stacking/README.mdx)
    增删插入、层级调整与对象树遍历。
  - [3.3 分组与多选](cheatsheets/group-selection/README.mdx)
    Group 的创建与子对象、ActiveSelection 多选和分组布局策略。
  - [3.4 视口与坐标](cheatsheets/viewport/README.mdx)
    viewportTransform、缩放平移与场景 / 视口坐标转换。

- 4. 交互与编辑
  - [4.1 事件系统](cheatsheets/events/README.mdx)
    画布级与对象级事件、目标发现与事件对象字段。
  - [4.2 拖拽与选择](cheatsheets/drag-select/README.mdx)
    默认拖拽、框选与多选行为的配置和约束。
  - [4.3 变换控件](cheatsheets/controls/README.mdx)
    内置控件的角落 / 旋转手柄、样式与可见性配置。
  - [4.4 自定义控件](cheatsheets/custom-controls/README.mdx)
    Control 与 controlsUtils：自定义控件的渲染与行为。
  - [4.5 自由绘制](cheatsheets/free-drawing/README.mdx)
    isDrawingMode 与 PencilBrush 等笔刷的自由绘制。

- 5. 滤镜与动画
  - [5.1 滤镜](cheatsheets/filters/README.mdx)
    内置图片滤镜、WebGL 后端与自定义滤镜。
  - [5.2 动画](cheatsheets/animation/README.mdx)
    util.animate / animateColor 的属性动画与缓动函数。

- 6. 数据与导出
  - [6.1 序列化](cheatsheets/serialization/README.mdx)
    toJSON / loadFromJSON 的场景往返与自定义属性。
  - [6.2 SVG 互操作](cheatsheets/svg/README.mdx)
    loadSVGFromString / loadSVGFromURL 导入与 toSVG 导出。
  - [6.3 图片导出](cheatsheets/export/README.mdx)
    toDataURL 的格式、质量与 multiplier 高清导出。

- 7. 进阶与工程
  - [7.1 历史栈](cheatsheets/history/README.mdx)
    官方无内置历史栈的现实与 undo / redo 的自建命令栈模式。
  - [7.2 性能优化](cheatsheets/performance/README.mdx)
    对象缓存、渲染控制与大数据量策略。
  - [7.3 自定义对象](cheatsheets/custom-object/README.mdx)
    FabricObject 子类、classRegistry 注册与自定义序列化。
  - [7.4 扩展包](cheatsheets/extensions/README.mdx)
    `@fabricjs/*` 官方扩展与按需引入。
