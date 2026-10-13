# Lottie（Web 动画）

- 1. 认识与上手
  - [1.1 什么是 Lottie](cheatsheets/what-is-lottie/README.mdx)
    Lottie 解决的问题与生态全景：AE 导出到 JSON、各端播放器与格式规范的角色分工。
  - [1.2 第一次播放](cheatsheets/first-animation/README.mdx)
    用 script 引入 lottie-web，跑通 loadAnimation 的 container、renderer、loop、path 最小闭环。
  - [1.3 获取动画素材](cheatsheets/getting-assets/README.mdx)
    从 LottieFiles 免费库、设计师导出与已有 JSON 中拿到动画，并区分 path 与 animationData 两种加载方式。

- 2. lottie-web 核心
  - [2.1 渲染器选型](cheatsheets/renderers/README.mdx)
    svg、canvas、html 三种渲染器的原理、优劣与适用场景。
  - [2.2 播放控制](cheatsheets/playback-control/README.mdx)
    play、pause、stop、goToAndStop、setSpeed、setDirection 等运行时控制方法。
  - [2.3 事件与生命周期](cheatsheets/events-lifecycle/README.mdx)
    DOMLoaded、enterFrame、complete 等事件的监听时机与实例销毁。
  - [2.4 帧与片段](cheatsheets/frames-segments/README.mdx)
    用 playSegments 与 goToAndStop 控制播放区间，实现局部循环与进度驱动。

- 3. 数据与工程化
  - [3.1 动画数据管理](cheatsheets/animation-data/README.mdx)
    animationData 内联加载、资源与字体路径、预加载和多实例管理。
  - [3.2 性能优化](cheatsheets/performance/README.mdx)
    按体积、图层数与渲染器评估开销，用懒加载和可见性暂停控制页面成本。
  - [3.3 JSON 结构概览](cheatsheets/json-structure/README.mdx)
    读懂 Lottie JSON 顶层结构（v、fr、ip、op、layers、assets），为调试排错建立地图。
  - [3.4 制作流程](cheatsheets/production-workflow/README.mdx)
    bodymovin 从 AE 导出动画的流程、支持的特性范围与开发者设计师协作注意点。

- 4. 交互与生态
  - [4.1 交互式动画](cheatsheets/interactivity/README.mdx)
    用 lottie-interactivity 实现滚动、悬停、点击驱动的动画交互。
  - [4.2 播放器组件](cheatsheets/web-components/README.mdx)
    以 Web Component 方式使用播放器：lottie-player 已归档，重点讲继任者 dotlottie-wc。
  - [4.3 dotLottie 与新运行时](cheatsheets/dotlottie-runtime/README.mdx)
    .lottie 打包格式与 dotlottie-web（Rust + WASM）运行时的能力与适用场景。
