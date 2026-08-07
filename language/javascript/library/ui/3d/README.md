## 通用框架

| 维度 | Three.js | Babylon.js |
| --- | --- | --- |
| 定位 | 轻量渲染库，偏底层拼装 | 完整游戏 / 渲染引擎，开箱即用 |
| 体积与引入 | 更轻；核心小，功能靠扩展 | 更重；可按模块按需引入 |
| API 风格 | 命令式，手动组装场景 / 相机 / 灯光 | 引擎化，Scene 体系与内置子系统更完整 |
| TypeScript | 官方类型声明 | 原生 TypeScript 编写 |
| 渲染后端 | WebGL / WebGPU | WebGL / WebGPU |
| 材质与着色器 | `ShaderMaterial` 等灵活；节点材质靠生态 | 内置 Node Material Editor，可视化节点材质强 |
| 物理 | 需接 Cannon / Ammo / Rapier 等第三方 | 官方集成物理（含 Havok 等） |
| GUI / 调试 | 无内置 GUI；常用 lil-gui；调试靠社区工具 | 内置 GUI、Inspector |
| 工具链 | 官方编辑器偏弱，社区方案多 | Playground、Sandbox、Inspector、NME 等官方工具完善 |
| XR | 支持 WebXR，偏底层 | WebXR 辅助与体验封装更完整 |
| 生态与社区 | 社区更大，可视化 / 创意 / React 生态（R3F）更丰富 | Microsoft 支持，游戏与产品可视化文档 / 教程更成体系 |
| 适用场景 | 数据可视化、创意站点、需要高度定制渲染管线 | 游戏、互动产品、希望少造轮子的完整 3D 应用 |
| 学习曲线 | 入门快；复杂能力需自己组合 | API 面更大，但官方文档与 Playground 降低上手成本 |

## 参考资料

- [three.js](https://github.com/mrdoob/three.js)
- [Babylon.js](https://github.com/BabylonJS/Babylon.js)
- [Whitestorm.js](https://github.com/WhitestormJS/whs.js) - 🚀 🌪 Super-fast 3D framework for Web Applications 🥇 & Games 🎮. Based on Three.js
- [lightgl.js](https://github.com/evanw/lightgl.js/) - A lightweight WebGL library
- [litegl.js](https://github.com/jagenjo/litegl.js) - Lightweight Javascript WebGL library for handling Context, Meshes, Textures and Shaders. Relies on glMatrix 2.0, very easy to use.
- [philogl](https://github.com/senchalabs/philogl) - A WebGL Framework for Data Visualization, Creative Coding and Game Development
