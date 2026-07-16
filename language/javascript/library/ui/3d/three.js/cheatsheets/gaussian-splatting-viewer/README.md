# Splatting

`Gaussian Splatting viewer` 是把大量带位置、尺度、旋转、颜色和透明度的 splat 当成专用场景数据来显示的查看器；它不是 glTF 网格，也不是普通点云，本课只建立 viewer 工程心智模型，不实现真实 3D Gaussian Splatting 渲染器。

一句话记住：

> Gaussian Splatting 先是数据表示和 viewer 选型问题，再是透明排序、加载预算和页面生命周期问题；不要把它当成换一种材质的 `Mesh`。

## 概念定位

一个 splat 可以先理解为“空间里的软椭圆贡献”。真实 3D Gaussian Splatting 数据通常为每个 splat 保存：

- `position`：三维中心点。
- `scale`：三维尺度，决定高斯椭球展开范围。
- `rotation`：方向，常用四元数或等价压缩形式。
- `color` / `SH`：基础颜色或球谐系数；SH 会让颜色随视角变化。
- `opacity`：透明度或密度贡献。

它和三角网格的根本差异是：mesh 用顶点、三角形、法线和材质描述表面；splatting 用大量半透明贡献重建视角下的辐射场外观。viewer 的主要工作不是加载 `Geometry + Material`，而是把 splat 数据解码、排序、打包进 GPU 可用缓冲，并在相机变化时保持正确的透明叠加。

```text
splat 文件
  .ply / .splat / .ksplat / 其他 viewer 格式
        ↓
解码和预处理
  position / scale / rotation / color 或 SH / opacity
        ↓
排序和分块
  按视角深度、tile、chunk、worker 或 GPU 路径组织绘制顺序
        ↓
viewer renderer
  把 splat 投影成屏幕椭圆并透明混合
        ↓
页面组件
  mount / resize / pause / dispose / fallback
```

## 表达差异

| 表达 | 数据核心 | 适合什么 | 边界 |
| --- | --- | --- | --- |
| glTF mesh | 节点、mesh、primitive、材质、贴图、动画 | 产品模型、角色、硬表面、需要精确轮廓和交互的资产 | 真实感取决于建模、材质、贴图和光照；大场景采集重建成本高 |
| `THREE.Points` 点云 | `position` 加可选颜色、大小、随机数等 attribute | 采样点、粒子、星空、调试点云 | 点是屏幕点块，不携带椭球协方差和视角相关颜色 |
| Sprite / billboard | 面向相机的小平面或贴图 | 标签、图标、简化的软片元观察 | 对象数量和透明排序会变成成本；不等于真实 3DGS |
| Gaussian Splatting viewer | 大量 splat 的位置、尺度、旋转、颜色/SH、透明度 | 照片重建场景、真实空间扫描、快速展示复杂外观 | 需要专用 viewer、格式处理、排序、内存预算和加载策略 |

本课示例里的 `splat mock` 使用 `InstancedMesh + ShaderMaterial` 做椭圆 billboard，只用来观察“软片元、透明、排序、预算和生命周期”。它不会训练、解码或渲染真实 3D Gaussian Splatting 数据。

## 文件和生态

`.ply` 常见于原始或训练导出的 splat 数据，可能包含位置、法线占位、SH、opacity、scale、rotation 等属性。它可读性和通用性较好，但体积和解析成本通常不适合直接当最终 Web 交付格式。

`.splat` 常被 viewer 用作更紧凑的二进制数据。不同实现的 `.splat` 细节不一定完全相同，选型时要看目标 viewer 的转换工具、是否保留 SH、是否支持渐进加载。

`.ksplat` 是部分 viewer 使用的预处理/压缩格式名称，常见目标是减少加载和运行时转换成本。它不是 Web 平台标准，项目迁移时要确认生成工具、许可证、版本兼容和回退路径。

viewer 库只在工程选型时引入，不在本课安装：

- `GaussianSplats3D`：three.js 生态中的经典实现，支持 `.ply`、`.splat` 和 `.ksplat`，文档也直接讨论排序、渐进加载、移动端限制和 `.ksplat` 预处理。
- `Spark`：面向 three.js 的较新 renderer，当前 README 强调与 three.js 渲染管线融合、多 splat 排序、多格式支持和移动端性能。
- `gsplat.js`：更像独立 Gaussian Splatting 库，API 心智模型接近自有 `Scene`、`Camera`、`Renderer`；其 README 也提醒 `.splat` 不包含 SH 时颜色不会随视角变化。

判断 viewer 时先看这几件事：支持的格式、是否需要转换、排序路径在 CPU/worker/GPU 哪一侧、是否能和 three.js mesh 混合、移动端策略、许可证和示例维护活跃度。

## 透明排序

splatting 的核心视觉依赖半透明叠加。普通不透明 mesh 可以依靠深度缓冲解决遮挡；半透明对象如果一边写深度一边混合，容易把后面的颜色挡掉。不开 `depthWrite` 又会让绘制顺序变重要。

```text
相机变化
  每个 splat 到相机的深度改变
        ↓
排序或分块结果需要更新
        ↓
远处 splat 通常先混合，近处 splat 后混合
        ↓
错误顺序会导致发灰、闪烁、穿帮或局部遮挡不稳定
```

three.js 会按对象做透明排序，但真实 splat viewer 往往把海量 splat 放进少数 buffer 或纹理里。此时“对象级排序”不够，需要 viewer 内部按 splat、chunk、tile 或深度图做自己的排序。相机快速移动时，排序频率、worker 通信和 GPU 数据更新都会进入性能预算。

常见取舍：

- `transparent: true`：启用混合，但排序和过度绘制成本会上来。
- `depthWrite: false`：半透明对象常用，减少透明片元互相写深度造成的硬洞。
- `alphaTest`：低透明片元直接丢弃，适合硬边或减少软边混合成本，但会牺牲柔和过渡。
- 分块排序：不必每个 splat 都完整排序，但边界可能出现局部错误。
- worker 排序：避免主线程卡顿，但会增加数据传输和同步复杂度。
- GPU 路径：潜力高，兼容性、实现复杂度和调试成本也更高。

## 加载链路

splat 场景常是几十 MB 到数百 MB 的资源。加载体验要像模型查看器一样被设计，而不是只写一个 `await load(url)`。

- 首屏占位：先显示边界盒、低清预览、封面图或普通 mesh fallback。
- 进度状态：区分下载、解码、排序/转换、GPU 上传和可交互。
- 渐进加载：先加载低密度或前几个 chunk，再补细节；注意渐进数据可能不具备最终优化顺序。
- 压缩格式：减少网络体积，但会增加解码峰值内存或 WASM/worker 依赖。
- 失败 fallback：CORS、404、格式版本、内存不足和移动端 WebGL 限制都要能落到可解释状态。
- 静态托管：大文件要确认 MIME、缓存、range request、跨域头和 Vite `base` 后的 URL。

真实项目里不要把 viewer 直接散落在 UI 组件中。包一层 adapter，让页面只关心 `mount`、`load`、`pause`、`resize`、`dispose` 和状态回调。

## 性能预算

估算 splat viewer 时先用粗略预算判断项目是否应该继续推进，再用真实设备验证。

| 成本 | 看什么 | 判断 |
| --- | --- | --- |
| 网络体积 | splat 数量 x 每 splat 文件字节 | `.ply` 通常更大，压缩格式更适合交付 |
| 解码峰值 | 文件 buffer + 解码后 attribute + 临时排序数据 | 移动端容易先死在峰值内存，而不是最终显存 |
| GPU buffer | position、scale、rotation、color/SH、opacity、index 或 texture packing | viewer 内部格式不同，不能只看文件大小 |
| 排序成本 | splat 数量、相机变化频率、worker/GPU 路径 | 相机动得越频繁，排序压力越明显 |
| 片元成本 | 屏幕覆盖面积、DPR、透明 overdraw | 降 DPR 或降低 splat 尺寸常比减少 draw call 更有效 |
| 生命周期 | 页面隐藏、路由切换、模型替换 | 暂停循环并释放旧 buffer、material、texture、worker |

移动端先保守处理：限制 DPR，提供低密度资源，允许暂停渲染，避免同时挂多个 viewer，加载失败时给可读 fallback。

## 工程选型

优先用 glTF：

- 资产来自 DCC 工具，强调形状、材质、动画和精确交互。
- 需要稳定拾取、轮廓高亮、骨骼动画、LOD、贴图压缩和标准资产管线。
- 项目要长期维护，团队已经有 Blender/glTF 交付流程。

优先用 `Points` 或点云：

- 数据本质是采样点、粒子、传感器点、星空或调试散点。
- 不需要照片级重建外观，也不需要每个点携带旋转椭球和 SH。
- 希望用 three.js 原生对象、attribute 和 shader 自己控制。

考虑 Gaussian Splatting viewer：

- 输入来自照片/视频重建或扫描结果，目标是快速展示真实空间外观。
- mesh 重建成本高，或表面复杂到传统建模很难还原。
- 能接受专用格式、viewer 依赖、透明排序和较高资源预算。
- 已经规划好加载、移动端降级、许可证、静态托管和生命周期。

## 常见判断

| 现象 / 需求 | 先看哪里 | 判断 |
| --- | --- | --- |
| 想把 `.splat` 当 glTF 用 `GLTFLoader` 加载 | 文件格式 | splat 是 viewer 专用数据，不是 glTF 场景 |
| 点云已经能表达需求 | `THREE.Points` | 不需要为“很多点”直接上 3DGS viewer |
| 透明区域发灰或遮挡错乱 | 排序和 `depthWrite` | 先确认绘制顺序，再看 alpha 和深度写入 |
| 相机移动时画面闪烁 | viewer 排序频率 | 排序滞后、分块边界或 CPU 排序压力都可能导致 |
| 文件下载完还卡很久 | 解码、排序、GPU 上传 | 进度条要拆阶段，不要只显示网络进度 |
| 移动端直接崩溃 | 峰值内存和 DPR | 降资源密度、限制 DPR、减少同时挂载 viewer |
| 页面切换后仍占 GPU | adapter 生命周期 | 查 `pause`、`unmount`、`dispose`、worker 终止和 DOM 清理 |
| viewer 库看起来都能用 | 选型矩阵 | 对照格式、排序、three.js 混合、移动端、许可证和维护状态 |

## 记忆句

mesh 是表面，Points 是点集合，billboard 是面向相机的小片，Gaussian Splatting 是大量带形状和透明贡献的 viewer 数据。

先选对资产表达，再选 viewer；先估网络、内存、排序和 DPR，再谈视觉效果。

## 参考示例

- 表达差异
  - [mesh / points / splat mock](src/scenes/representation-compare-scene.js)

- 透明排序
  - [绘制顺序和 alpha](src/scenes/sort-and-alpha-scene.js)

- 加载预算
  - [加载状态和内存估算](src/scenes/loading-budget-scene.js)

- 项目集成
  - [viewer adapter 生命周期](src/scenes/viewer-integration-scene.js)

## 参考资料

- [3D Gaussian Splatting for Real-Time Radiance Field Rendering](https://arxiv.org/abs/2308.04079)
- [GaussianSplats3D](https://github.com/mkkellogg/GaussianSplats3D)
- [Spark](https://github.com/sparkjsdev/spark)
- [gsplat.js](https://github.com/huggingface/gsplat.js)
- [Points docs](https://threejs.org/docs/#api/en/objects/Points)
- [PointsMaterial docs](https://threejs.org/docs/#api/en/materials/PointsMaterial)
- [ShaderMaterial docs](https://threejs.org/docs/pages/ShaderMaterial.html)
- [Material docs](https://threejs.org/docs/#api/en/materials/Material)
- [WebGLRenderer docs](https://threejs.org/docs/pages/WebGLRenderer.html)
- [Info docs](https://threejs.org/docs/pages/Info.html)
