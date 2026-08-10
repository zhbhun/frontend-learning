# LeaferJS

- 1. 起步
  - [1.1 认识 LeaferJS](cheatsheets/intro/README.mdx)
    LeaferJS 的定位、能力边界，以及它与 PixiJS、Konva 等同类库的差异。
  - [1.2 安装与第一个场景](cheatsheets/getting-started/README.mdx)
    用 npm 安装 leafer-ui，创建 Leafer 实例并把第一个图形渲染到页面。
  - [1.3 渲染后端](cheatsheets/render-backend/README.mdx)
    Canvas 2D 默认后端与 WebGPU/WebGL 切换，以及渲染循环的工作方式。

- 2. 节点树与坐标
  - [2.1 节点树结构](cheatsheets/node-tree/README.mdx)
    App、Tree/Layer、Group 与 Leaf 的层级关系，以及增删与层级排序。
  - [2.2 坐标体系](cheatsheets/coordinate/README.mdx)
    本地坐标与世界坐标的换算，以及 x/y、translate 的含义。
  - [2.3 包围盒](cheatsheets/bounds/README.mdx)
    getBounds 与 boxBounds 的区别，以及包围盒在布局和命中中的作用。

- 3. 图形与样式
  - [3.1 基础图形](cheatsheets/basic-shapes/README.mdx)
    矩形、圆、椭圆、线条、折线与多边形的创建与常用属性。
  - [3.2 路径与画笔](cheatsheets/path-and-pen/README.mdx)
    Path 的 SVG 路径写法与 Pen 的命令式自由绘制。
  - [3.3 填充与描边](cheatsheets/fill-and-stroke/README.mdx)
    纯色、渐变与图案填充，以及描边粗细、虚线与线帽。
  - [3.4 视觉效果](cheatsheets/shadow-and-blend/README.mdx)
    阴影、内阴影与混合模式如何叠加到图形上。
  - [3.5 遮罩、裁剪与擦除](cheatsheets/mask-and-eraser/README.mdx)
    mask、clip 与 eraser 三种限定可见区域的手段及其差异。

- 4. 变换与布局
  - [4.1 变换](cheatsheets/transform/README.mdx)
    位置、缩放、旋转、斜切，以及锚点 around 与原点 origin 的对齐方式。
  - [4.2 自动布局](cheatsheets/layout/README.mdx)
    Box 容器与 @leafer-in/flow 的 Flex 自动布局。

- 5. 文本与图片
  - [5.1 文本](cheatsheets/text/README.mdx)
    Text 的字体、换行、富文本与文字测量。
  - [5.2 图片](cheatsheets/image/README.mdx)
    Image 的加载、跨域、填充模式与位图缓存。

- 6. 交互与事件
  - [6.1 事件系统](cheatsheets/events/README.mdx)
    on/off 绑定、事件类型与事件流，以及命中检测和按键状态。
  - [6.2 视图控制](cheatsheets/view-control/README.mdx)
    拖拽、缩放、旋转与平移等内置交互，以及 @leafer-in/view 的视图缩放。
  - [6.3 滚动条](cheatsheets/scroll/README.mdx)
    @leafer-in/scroll 为大画布提供滚动条与滚动控制。

- 7. 状态与动画
  - [7.1 过渡与状态](cheatsheets/transition-and-state/README.mdx)
    transition 过渡动画与 @leafer-in/state 的交互状态切换。
  - [7.2 动画系统](cheatsheets/animation/README.mdx)
    @leafer-in/animate 的关键帧、动画曲线与排队控制。
  - [7.3 运动路径与精灵帧](cheatsheets/motion-and-robot/README.mdx)
    motionPath 沿路径运动与 robot 精灵帧动画。

- 8. 编辑器
  - 8.1 编辑器基础
    - [8.1.1 启用编辑器](cheatsheets/editor-basics/README.mdx)
      引入 @leafer-in/editor，给场景挂上编辑器并选中元素。
    - [8.1.2 选中与变换手柄](cheatsheets/select-transform/README.mdx)
      单选与多选、变换手柄的缩放旋转，以及编辑边界约束。
  - 8.2 编组与对齐
    - [8.2.1 框选、打组与解组](cheatsheets/group/README.mdx)
      框选区域元素，以及 Group 的打组与解组操作。
    - [8.2.2 吸附、对齐与标尺](cheatsheets/snap-align-ruler/README.mdx)
      网格吸附、元素对齐线与标尺参考线辅助精确编辑。
  - 8.3 文字与内部编辑
    - [8.3.1 文字编辑器](cheatsheets/text-editor/README.mdx)
      @leafer-in/text-editor 的双击进入文字内联编辑。
    - [8.3.2 内部编辑器与编辑工具](cheatsheets/inner-editor/README.mdx)
      InnerEditor 与 EditTool 的自定义编辑入口与工具扩展。

- 9. 进阶与工程
  - [9.1 分层渲染与视口](cheatsheets/layer-and-viewport/README.mdx)
    App 多 Layer 分层渲染，以及视口控制与坐标系映射。
  - [9.2 性能优化](cheatsheets/performance/README.mdx)
    局部渲染 partRender、位图缓存与海量元素的优化策略。
  - [9.3 滤镜](cheatsheets/filter/README.mdx)
    @leafer-in/filter 的模糊、颜色与自定义滤镜。
  - [9.4 箭头元素](cheatsheets/arrow/README.mdx)
    @leafer-in/arrow 的箭头绘制与端点跟随。
  - [9.5 自定义元素](cheatsheets/custom-element/README.mdx)
    register 注册自定义 UI 元素并复用内核能力。
  - [9.6 导出](cheatsheets/export/README.mdx)
    导出 JSON、图片与 SVG 路径，以及场景的序列化与还原。
