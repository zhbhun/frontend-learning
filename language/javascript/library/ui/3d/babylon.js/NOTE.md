# Babylon.js

- 主题边界：以 Babylon.js 的渲染与场景系统为主线——Engine、Scene、相机、网格、光源、材质、纹理、模型、动画、渲染循环、交互与拾取。Babylon 区别于 three.js 的内置系统（GUI、音频、物理、Action Manager）按所属主题延伸或作为进阶分支。
- 不把 React Babylon、Vue 集成、three.js、Unity/Unreal、PlayCanvas/Construct 等其他引擎、完整游戏开发流程作为入门主线；不在第一阶段深入 WebGPU 底层、自写着色器原理、Havok 物理数学、Gaussian Splatting 原理、WebXR 设备适配细节和大型 3D 资产制作流程。
- 路线按 Babylon.js 自身的能力地图和学习节奏设计，不机械对照同目录的 three.js 手册。关键差异已体现在 ROADMAP：相机与控制合并、Observable 单列、调试（Inspector）尽早引入、PBR 在外观章、后处理在渲染进阶章、GUI/物理/音频/Action Manager 作为内建能力独立成章、默认左手系在坐标课突出。
- 交互课统一复用 `assets/babylon-canvas.js` 的 `createBabylonRuntime(canvas, setup)`：setup 里 `new Scene(engine)` + 相机/光源/网格 + 用 `scene.onBeforeRenderObservable` 做每帧业务更新并 `emit(...)` 派生读数，返回 scene；runtime 用 `engine.runRenderLoop` + 视口可见性启停、resize 自动 `engine.resize()`、dispose 释放 Engine/Scene。不自造渲染循环。范式参考 `cheatsheets/first-scene/example.ts`。
- `stories.ts` 写法（CSF 多 Story 的 args 类型易冲突，已验证可编译）：`export default { id, title: '<章节>/<标题>', tags: ['!dev'] };` + 每个 Story 用 `export const X = { name, args, argTypes, render, parameters }`（**plain object，不要 `satisfies Meta` / `StoryObj` 类型注解**）。`render: canvasStory({...})`，`parameters: storySource(source)`。参考 `cheatsheets/coordinate-system-and-units/coordinate-system-and-units.stories.ts`。
