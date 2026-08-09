# PixiJS

- 1. 入门
  - [1.1 初始化](cheatsheets/getting-started/README.mdx)
    用 Application 启动 PixiJS，配置 init 选项并把画布挂载到页面。
  - [1.2 场景图与容器](cheatsheets/scene-graph/README.mdx)
    理解显示对象树、Container 与 stage，掌握父子关系和坐标空间。
  - [1.3 变换](cheatsheets/transform/README.mdx)
    position、scale、rotation、anchor、pivot、skew 的含义与变换组合方式。
  - [1.4 渲染循环](cheatsheets/ticker/README.mdx)
    用 Ticker 驱动每帧更新，用 delta time 做帧无关动画并控制启停。

- 2. 内容对象
  - [2.1 纹理与精灵](cheatsheets/sprite/README.mdx)
    Texture 与 Sprite 的关系，用 AnimatedSprite 播放逐帧动画。
  - [2.2 资源加载](cheatsheets/assets/README.mdx)
    用 Assets 异步加载纹理等资源，管理 bundles、缓存与卸载。
  - [2.3 图形绘制](cheatsheets/graphics/README.mdx)
    用 Graphics 绘制形状与路径，设置填充与描边。
  - [2.4 文本](cheatsheets/text/README.mdx)
    Text、BitmapText、HTMLText 三种文本的适用场景与样式。
  - [2.5 九宫格与平铺](cheatsheets/nine-slice-tiling/README.mdx)
    NineSliceSprite 做可拉伸面板，TilingSprite 做平铺背景。

- 3. 交互
  - [3.1 事件系统](cheatsheets/events/README.mdx)
    eventMode、命中测试与事件流，处理 pointer / touch 事件。
  - [3.2 拖拽与手势](cheatsheets/drag/README.mdx)
    实现拖拽、指针捕获与常见交互模式。

- 4. 视觉效果
  - [4.1 滤镜](cheatsheets/filters/README.mdx)
    给显示对象应用滤镜，组合滤镜链并调参。
  - [4.2 蒙版](cheatsheets/mask/README.mdx)
    用图形或精灵作为蒙版裁剪显示内容。
  - [4.3 混合模式与着色](cheatsheets/blend-color/README.mdx)
    blend modes、tint 与 Color 混合出不同视觉效果。

- 5. 进阶渲染
  - [5.1 渲染器与分辨率](cheatsheets/renderer/README.mdx)
    WebGPU 与 WebGL 渲染器选择、resolution 与 resizeTo 自适应。
  - [5.2 渲染纹理](cheatsheets/render-texture/README.mdx)
    用 RenderTexture 把场景渲染成可复用的动态纹理。
  - [5.3 网格与着色器](cheatsheets/mesh-shader/README.mdx)
    用 Mesh、Geometry 和 Shader 编写自定义 GLSL 渲染。
  - [5.4 层级与分组](cheatsheets/layers/README.mdx)
    RenderLayer、RenderGroup、zIndex 与 culling 管理渲染层级。
  - [5.5 粒子容器](cheatsheets/particle-container/README.mdx)
    用 ParticleContainer 高效渲染大量同纹理对象。

- 6. 工程与性能
  - [6.1 性能优化](cheatsheets/performance/README.mdx)
    减少 draw call、批渲染、culling 与瓶颈定位方法。
  - [6.2 内存与生命周期](cheatsheets/lifecycle/README.mdx)
    destroy、垃圾回收与资源释放，避免内存泄漏。
  - [6.3 构建与打包](cheatsheets/build/README.mdx)
    TypeScript 类型、Vite 集成、tree-shaking 与自定义打包。
