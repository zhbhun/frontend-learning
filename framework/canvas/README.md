## 通用框架

| 维度 | PixiJS | Konva.js | LeaferJS | Fabric.js | Two.js | p5.js |
| --- | --- | --- | --- | --- | --- | --- |
| 定位 | 高性能 2D 渲染引擎，偏游戏 / 可视化 | Canvas 场景图框架，偏交互 UI | 现代 Canvas 引擎，偏图形编辑与无限画布 | 对象模型 Canvas 库，偏设计编辑器 | 渲染器无关的 2D 绘图 API | 创意编程库，偏艺术 / 教学 / 原型 |
| 渲染后端 | WebGL / WebGPU（可回退 Canvas） | Canvas 2D（可选 WebGL） | Canvas 2D / WebGL | Canvas 2D | SVG / Canvas / WebGL 可切换 | Canvas 2D（WebGL 需扩展） |
| 性能取向 | 极强；大量精灵 / 粒子首选 | 中上；分层可优化静态层 | 强；面向海量元素与编辑场景 | 中等；改动常触发整画布重绘 | 中等；矢量动画友好 | 弱于性能库；优先易用与表达 |
| 场景 / 对象模型 | DisplayObject 显示树（Stage / Container / Sprite） | Stage → Layer → Group / Shape | Leafer / 树形 UI 节点 | 丰富的 Object 模型（可直接选中编辑） | Scenegraph（Path / Group） | 偏即时模式（每帧重绘），非编辑器对象模型 |
| 交互编辑 | 事件齐全；拖拽 / 变换手柄需自建或插件 | 内置拖拽、Transformer、命中检测 | 内置框选、打组、吸附、标尺、文字编辑等 | 内置拖拽 / 缩放 / 旋转手柄、内联文字 | 基础变换；不是编辑器导向 | 输入事件简单；非对象编辑器 |
| SVG | 弱；需自行处理 | 弱 | 有路径 / 导出能力，偏自有模型 | 强；SVG 导入导出是核心卖点 | 强；可 SVG 渲染与解析 | 弱；非主路径 |
| 文本 | Text / BitmapText / HTMLText | Text 基础能力 | 文本与编辑能力较强 | 内联文字编辑强 | 基础文本 | 文字绘制友好，偏视觉表达 |
| 滤镜 / 特效 | WebGL Filters、混合模式强 | 基础滤镜 | 阴影、裁剪、遮罩等较完善 | 图像滤镜丰富 | 偏矢量造型与动画 | 创意向绘制 / 像素操作 |
| 动画 | Ticker + 社区（GSAP 等） | Tween 内置；也常接 GSAP | 过渡 / 状态 / 运动路径 | 基础动画 | 内置 animation loop | `draw()` 循环是核心范式 |
| 框架集成 | `@pixi/react` 等 | `react-konva` / `vue-konva` 成熟 | 官方偏原生；生态在增长 | 官方偏原生；社区封装多 | 轻量，易嵌入任意框架 | 常独立 sketch；也可嵌入组件 |
| TypeScript | 官方类型完善 | 类型完善 | 原生 TypeScript | 有类型支持 | 有类型支持 | 有类型；创意脚本仍以 JS 常见 |
| 体积与依赖 | 中等；可按需拆包 | 中等，零依赖感强 | 轻（约 70KB min+gzip 量级），零依赖 | 偏重 | 轻 | 中等；完整包偏大 |
| 学习曲线 | 入门快；管线 / 批处理需深入 | 低；API 贴近 DOM 思维 | 低到中；概念现代但面较全 | 中；对象编辑概念多 | 低；矢量 API 简洁 | 极低；Processing 风格极易上手 |
| 适用场景 | 2D 游戏、粒子、高密度可视化 | 看板、交互图、白板、移动端 Canvas UI | AI 无限画布、在线设计器、图形编辑产品 | 海报 / 图片编辑器、SVG 设计工具 | 扁平矢量动画、跨后端一致绘制 | 创意编码、生成艺术、教学 Demo |
| 不适合 | 需要开箱即用的矢量编辑器 | 超大量动态精灵 / 粒子 | 纯创意素描或极简草图脚本 | 超大规模实时动画 | 复杂对象编辑器、像素级游戏 | 高性能游戏或生产级设计器内核 |

## 参考资料

- [PixiJS](https://www.pixijs.com/)
- [Konva.js](https://konvajs.org/)
- [LeaferJS](https://www.leaferjs.com/)
- [Fabric.js](http://fabricjs.com/)
- [Two.js](https://two.js.org/)
- [p5.js](https://p5js.org/)
- [canvas-engines-comparison](https://github.com/slaylines/canvas-engines-comparison)
- [leaferjs/canvas-benchmark](https://github.com/leaferjs/canvas-benchmark)
