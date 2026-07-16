# Three.js 学习路线

## 学习路线

- 1. 快速启动
  - [1.1 安装](cheatsheets/vite-threejs-setup/README.md)
    用 Vite、npm 和 ES Modules 搭出最小 three.js 项目。
  - [1.2 第一幅画面](cheatsheets/first-scene/README.md)
    用 renderer、scene、camera、mesh 和 render loop 画出旋转立方体。
  - [1.3 循环与尺寸](cheatsheets/render-loop-and-resize/README.md)
    处理动画循环、画布尺寸、像素比和响应式渲染。
  - [1.4 坐标与单位](cheatsheets/coordinate-system-and-units/README.md)
    学习 X/Y/Z 轴、原点、世界单位、角度/弧度、局部空间和世界空间。

- 2. 核心系统
  - 2.1 空间与对象
    - [2.1.1 Object3D](cheatsheets/object3d-transform-hierarchy/README.md)
      学习可变换对象的共同能力、父子层级、局部坐标和世界坐标。
    - [2.1.2 Scene](cheatsheets/scene-render-root/README.md)
      学习 Scene 作为场景根容器、渲染入口、背景、雾效和对象挂载位置。
    - [2.1.3 相机](cheatsheets/camera-and-orbitcontrols/README.md)
      学习透视相机、正交相机、视锥体和 OrbitControls。
    - [2.1.4 Mesh](cheatsheets/mesh-geometry-material/README.md)
      学习 Mesh 如何把 Geometry 和 Material 组合成可渲染物体。
    - [2.1.5 Group](cheatsheets/group-and-local-space/README.md)
      学习 Group 如何用局部坐标组织多个对象、整体变换和层级调试。
    - [2.1.6 Helper](cheatsheets/helpers-and-debug-objects/README.md)
      学习 Helper 作为 Object3D 调试对象如何显示坐标轴、网格、包围盒、相机和光源。
    - [2.1.7 Line](cheatsheets/line-and-segments/README.md)
      学习 Line、LineSegments 和 LineLoop 如何渲染路径、边框和调试线。
    - [2.1.8 Points](cheatsheets/points-object/README.md)
      学习 Points 如何用顶点集合渲染点、粒子和点云的基础形态。
    - [2.1.9 Sprite](cheatsheets/sprite-billboard/README.md)
      学习 Sprite 作为面向相机的对象如何制作标签、图标和标注。
    - [2.1.10 Light](cheatsheets/light-objects/README.md)
      学习 Light 作为 Object3D 如何进入场景树并影响受光材质。
    - [2.1.11 🧩 InstancedMesh](cheatsheets/instanced-mesh-object/README.md)
      学习实例化对象如何用一个几何和材质高效渲染大量重复物体。
    - [2.1.12 🧩 LOD](cheatsheets/lod-object/README.md)
      学习 LOD 如何按相机距离切换不同细节层级。
    - [2.1.13 🧩 SkinnedMesh](cheatsheets/skinned-mesh-and-bones/README.md)
      学习 SkinnedMesh、Bone 和骨骼层级如何支撑角色和模型动画。
    - [2.1.14 🧩 特殊对象](cheatsheets/special-object3d-types/README.md)
      学习 BatchedMesh、ClippingGroup、ArrayCamera、CubeCamera 和 StereoCamera 的适用场景。
  - 2.2 形状与表面
    - [2.2.1 几何](cheatsheets/geometry-and-buffergeometry/README.md)
      学习内置几何体、BufferGeometry、attribute、index 和顶点数据。
    - [2.2.2 材质](cheatsheets/materials-and-render-states/README.md)
      对比常用材质并理解颜色、透明、线框和深度相关选项。
    - [2.2.3 明暗与阴影](cheatsheets/lighting-and-shadows/README.md)
      在 Light 对象基础上学习受光材质、明暗层次、阴影开关和 shadow map。

- 3. 纹理与模型
  - [3.1 纹理](cheatsheets/textures-and-maps/README.md)
    学习贴图加载、UV、常见贴图类型、color space、wrap 和 filter。
  - [3.2 模型](cheatsheets/gltf-and-gltfloader/README.md)
    用 GLTFLoader 加载 glTF/GLB 并处理路径、节点和加载错误。
  - [3.3 查看器](cheatsheets/minimal-model-viewer/README.md)
    组合相机控制、光照、环境、模型加载、加载状态和 resize。
  - [3.4 资产](cheatsheets/asset-pipeline-checklist/README.md)
    梳理模型来源、Blender 导出、压缩、贴图尺寸和部署路径。

- 4. 动画与交互
  - 4.1 时间与动画
    - [4.1.1 时间](cheatsheets/clock-and-animation-loop/README.md)
      区分 frame、delta time、elapsed time 和业务状态更新。
    - [4.1.2 动画](cheatsheets/gltf-animation-mixer/README.md)
      用 AnimationMixer 播放、暂停、切换和混合 glTF 内置动画。
  - 4.2 交互与调试
    - [4.2.1 拾取](cheatsheets/raycaster-pointer-interaction/README.md)
      用 Raycaster 做 hover、click、选中和高亮。
    - [4.2.2 TransformControls](cheatsheets/transform-controls/README.md)
      用变换 gizmo 平移、旋转和缩放对象，并结合 Raycaster 切换当前对象。
    - [4.2.3 调试](cheatsheets/debug-gui-and-stats/README.md)
      建立 helper、调参面板、帧率观察、控制台检查和最小复现习惯。

- 5. 质量与交付
  - 5.1 视觉质量
    - [5.1.1 PBR](cheatsheets/pbr-and-environment-maps/README.md)
      学习 MeshStandardMaterial、金属度、粗糙度、环境贴图和 color management。
    - [5.1.2 后处理](cheatsheets/postprocessing-basics/README.md)
      学习 EffectComposer、render pass、bloom、outline 和抗锯齿后处理。
  - 5.2 交付质量
    - [5.2.1 性能](cheatsheets/performance-and-disposal/README.md)
      学习 draw calls、triangles、纹理尺寸、dispose、资源复用和按需渲染。
    - [5.2.2 页面](cheatsheets/page-integration-and-deploy/README.md)
      学习 three.js canvas 与 DOM、CSS、UI 控件、路由和构建产物共存。

- 6. 进阶分支
  - 6.1 渲染技术
    - [6.1.1 Shader](cheatsheets/shader-basics/README.md)
      从 ShaderMaterial、uniform、attribute、vertex shader 和 fragment shader 入门。
    - [6.1.2 WebGPU](cheatsheets/webgpu-overview/README.md)
      了解 WebGPURenderer、NodeMaterial/TSL 和 WebGPU 示例现状。
    - [6.1.3 粒子](cheatsheets/points-particles-instancing/README.md)
      深入 Points、PointsMaterial、BufferGeometry attributes 和 InstancedMesh 的大量点/实例渲染。
    - [6.1.4 Splatting](cheatsheets/gaussian-splatting-viewer/README.md)
      学习 Gaussian Splatting 与 mesh/glTF 的差异、文件格式、排序和 viewer 选型。
  - 6.2 应用生态
    - [6.2.1 框架](cheatsheets/framework-integration-overview/README.md)
      理解 imperative three.js 与 React/Vue 等 declarative UI 框架之间的边界。
    - [6.2.2 WebXR](cheatsheets/webxr-basics/README.md)
      学习启用 XR、XR 渲染循环、控制器输入和设备限制。
    - [6.2.3 物理](cheatsheets/physics-with-rapier/README.md)
      学习刚体、碰撞体、重力、约束、step 更新和 mesh 同步。
