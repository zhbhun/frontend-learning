# 学习笔记：PixiJS

## 偏好
- 主题：PixiJS v8——基于 WebGL / WebGPU 的 2D 渲染引擎；安装统一包 `pixi.js`。
- 版本：以 v8 为准（当前主版本）。关键差异：`Application` 选项通过异步 `init()` 传入，多数构造函数改为 options 对象，交互用 `eventMode`，并提供 WebGPU 渲染器。v7 及更早不在范围内。
- 主题边界：覆盖 PixiJS 渲染核心与官方内置能力。排除 3D（Three.js / Babylon.js，独立工作区）、游戏引擎（Phaser 等）、物理引擎，以及社区扩展包（pixi-filters 扩展、pixi-layout/UI、spine、tilemap、sound 等）——相关课程提到时只给入口，不展开。
- 工具链：npm、Storybook `@storybook/html-vite`、TypeScript（由初始化确认）。
- 示例媒介：每课用 PixiJS `Application` 把场景渲染到 Storybook 内嵌 Canvas；复用共享 `canvasStory` 外壳——`app.init({ canvas })` 复用传入画布，实例 `dispose()` 调 `app.destroy()` 释放资源；离屏时暂停 Ticker 以省 GPU。
- 语言：正文与注释中文，标识符、API、包名保留英文（技能默认）。

## 工作笔记
- 内置滤镜在「滤镜」课讲；`pixi-filters` 扩展包只作参考链接，不单设课程。
- PixiJS 自带数学类型（Point / Matrix 等）在「变换」「网格与着色器」中按需使用，不单设课程。
- 渲染循环用 Ticker；共享 `assets/canvas-runtime.js` 的离屏暂停思路（IntersectionObserver）套到 Ticker 上即可，不必为 PixiJS 单独造生命周期。
