# Babylon.js

- 1. 起步
  - [1.1 安装](cheatsheets/install-babylonjs/README.mdx)
    安装 @babylonjs/core，保持依赖最小化，并认识按需引入的包结构。
  - [1.2 第一幅画面](cheatsheets/first-scene/README.mdx)
    用 Engine、Scene、相机、Mesh 和 render loop 画出立方体，并用 Inspector 查看场景。
  - [1.3 坐标与尺寸](cheatsheets/coordinate-system-and-units/README.mdx)
    学习默认左手系、世界单位、弧度、局部/世界空间，以及画布尺寸、像素比和 engine resize。

- 2. 场景与对象
  - [2.1 Node](cheatsheets/node/README.mdx)
    学习 Node 基类：继承关系、公共属性与方法、父子层级管理、启用状态传播。
  - [2.2 TransformNode](cheatsheets/transformnode-and-grouping/README.mdx)
    学习 TransformNode 的变换数学（局部/世界矩阵、rotationQuaternion、billboard）与分组实践。
  - [2.3 Scene](cheatsheets/scene-container/README.mdx)
    学习 Scene 作为中枢容器：相机、光源、网格、背景、雾、环境与渲染入口。
  - [2.4 相机与控制](cheatsheets/cameras-and-controls/README.mdx)
    学习 ArcRotate/Free/Universal 相机、attachControl 内置输入、Behavior 模式与投影。
  - [2.5 网格](cheatsheets/mesh-and-meshbuilder/README.mdx)
    学习 Mesh 作为对象组合几何与材质，以及 MeshBuilder 创建内置形状。
  - [2.6 几何与顶点](cheatsheets/geometry-and-vertex-data/README.mdx)
    学习 Geometry、VertexData、顶点属性、索引、法线与自定义几何。
  - [2.7 Sprite](cheatsheets/sprite-and-spritemanager/README.mdx)
    学习 SpriteManager 与 Sprite 渲染广告牌标签和图标。
  - [2.8 Lines](cheatsheets/lines-and-tubes/README.mdx)
    学习 CreateLines、CreateDashedLines 和 CreateTube 渲染路径与管道。
  - [2.9 光源](cheatsheets/lights/README.mdx)
    学习 Hemispheric/Point/Directional/Spot 光源作为场景节点。
  - [2.10 实例化](cheatsheets/instanced-mesh-and-thin-instances/README.mdx)
    学习 InstancedMesh 与 thin instances 高效渲染大量重复物体。
  - [2.11 LOD](cheatsheets/lod-and-levels/README.mdx)
    学习 addLODLevel 按相机距离切换细节层级。
  - [2.12 特殊对象](cheatsheets/special-mesh-types/README.mdx)
    学习 Mirror、TrailMesh、MultiMaterial 等特殊网格类型的适用场景。

- 3. 材质与光照
  - [3.1 材质](cheatsheets/materials/README.mdx)
    对比 Standard/PBR/Node 材质，理解颜色、透明、wireframe、背面剔除与材质库。
  - [3.2 纹理](cheatsheets/textures/README.mdx)
    学习 Texture 加载、采样、UV、color space、环境贴图与程序化/动态贴图。
  - [3.3 明暗与阴影](cheatsheets/shadows-and-shading/README.mdx)
    学习 ShadowGenerator、shadow map、阴影开关与受光材质。
  - [3.4 PBR 与环境](cheatsheets/pbr-and-environment/README.mdx)
    学习 PBRMaterial 金属度/粗糙度、IBL 环境光照、反射与渲染目标。

- 4. 动画与时间
  - [4.1 渲染循环与时间](cheatsheets/render-loop-and-timing/README.mdx)
    学习 runRenderLoop、getDeltaTime、onBeforeRenderObservable 推进业务状态。
  - [4.2 动画](cheatsheets/animation-system/README.mdx)
    用 Animation、Animatable、缓动函数和 AnimationGroup 播放、切换与混合关键帧动画。
  - [4.3 形变动画](cheatsheets/morph-targets/README.mdx)
    用 MorphTargetManager 做表情、形变和混合变形。

- 5. 事件与交互
  - [5.1 Observables 与事件](cheatsheets/observables-and-events/README.mdx)
    分清 Observable/Observer，学习渲染、指针和键盘 observable 的订阅与清理。
  - [5.2 指针与拾取](cheatsheets/pointer-input-and-picking/README.mdx)
    用 scene.pick、PointerEventTypes 和 pickInfo 做 hover、click、选中和高亮。
  - [5.3 Gizmo](cheatsheets/gizmos/README.mdx)
    用 GizmoManager 的 Position/Rotation/ScaleGizmo 交互式变换对象。
  - [5.4 图层与高亮](cheatsheets/highlight-and-glow-layers/README.mdx)
    用 HighlightLayer 和 GlowLayer 做选中描边与发光。

- 6. 模型与资产
  - [6.1 加载模型](cheatsheets/sceneloader-and-gltf/README.mdx)
    用 SceneLoader 加载 glTF/GLB 与 .babylon，处理根节点、AssetContainer 与加载错误。
  - [6.2 骨骼与蒙皮](cheatsheets/skeleton-and-bones/README.mdx)
    学习 Skeleton、Bone 和骨骼层级如何支撑角色蒙皮与动画。
  - [6.3 查看器](cheatsheets/minimal-viewer/README.mdx)
    组合相机、光照、环境、模型加载、加载状态与 resize。
  - [6.4 资产清单](cheatsheets/asset-pipeline-checklist/README.mdx)
    梳理模型来源、导出、压缩、贴图尺寸与部署路径。

- 7. 渲染进阶
  - [7.1 后处理](cheatsheets/post-processing/README.mdx)
    学习 DefaultRenderingPipeline 的 bloom、FXAA、景深与 SSAO。
  - [7.2 粒子](cheatsheets/particles/README.mdx)
    深入 ParticleSystem、GPU particles 与 SolidParticleSystem。
  - [7.3 Node Material 与着色器](cheatsheets/node-material-and-shaders/README.mdx)
    从 NodeMaterial 可视化节点和 ShaderMaterial 入门自定义着色。
  - [7.4 WebGPU](cheatsheets/webgpu-overview/README.mdx)
    了解 WebGPUEngine、WebGPU 支持现状与 WebGL Engine 的差异。
  - [7.5 高斯泼溅](cheatsheets/gaussian-splatting/README.mdx)
    学习 Gaussian Splatting 与网格/glTF 的差异、加载与查看。

- 8. 工程实践
  - [8.1 调试](cheatsheets/inspector-and-debug/README.mdx)
    用 Inspector、调试层、AxesViewer 与帧率观察建立排查习惯。
  - [8.2 性能](cheatsheets/performance-and-disposal/README.mdx)
    学习 draw calls、freeze、dispose、硬件缩放、sceneOptimizer 与按需渲染。
  - [8.3 页面集成](cheatsheets/page-integration-and-deploy/README.mdx)
    学习 Babylon canvas 与 DOM、CSS、UI 控件、路由和构建产物共存。

- 9. 应用扩展
  - [9.1 GUI](cheatsheets/gui-system/README.mdx)
    学习 @babylonjs/gui 的 2D/3D 控件、容器、锚定与事件。
  - [9.2 物理](cheatsheets/physics-with-havok/README.mdx)
    学习 Havok 插件、刚体、碰撞体、重力、约束与 step 更新。
  - [9.3 音频](cheatsheets/audio/README.mdx)
    学习 Sound、AudioEngine、空间音频与音量控制。
  - [9.4 Action Manager](cheatsheets/action-manager/README.mdx)
    学习 ActionManager 把场景事件映射为触发动作。
  - [9.5 WebXR](cheatsheets/webxr-basics/README.mdx)
    学习 WebXR Experience Helper、XR 渲染循环、控制器输入与设备限制。
  - [9.6 框架集成](cheatsheets/framework-integration-overview/README.mdx)
    理解 imperative Babylon 与 React/Vue 等 declarative 框架的边界。
