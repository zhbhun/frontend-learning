# 性能

`three.js` 性能观察链路是：先用 `renderer.info` 定位每帧提交成本，再把成本拆到 draw call、几何复杂度、纹理预算、资源生命周期和渲染调度。

一句话记住：

> 先看这一帧提交了什么，再判断哪些资源可以复用、哪些资源该释放、哪些帧根本不用渲染。

## 观察链路

性能不要只看“卡不卡”。先拿到一帧渲染后的读数，再回到场景树和资源生命周期找原因。

```text
renderer.render(scene, camera)
  产生本帧 WebGL 提交
        ↓
renderer.info.render
  calls / triangles / points / lines
        ↓
renderer.info.memory
  geometries / textures
        ↓
renderer.info.programs
  已编译 shader program 变体
        ↓
场景结构和资源策略
  对象数量、材质分组、几何分段、纹理尺寸、dispose、按需渲染
```

`renderer.info` 是渲染后的读数。先渲染一帧，再读取 `renderer.info.render`，否则容易读到上一帧或初始值。

## 渲染读数

`renderer.info.render` 记录这一帧提交给渲染器的几何工作量。

| 字段 | 含义 | 常见来源 |
| --- | --- | --- |
| `calls` | draw calls 数量 | 可渲染对象、材质数组、geometry groups、渲染目标和后处理 pass |
| `triangles` | 本帧提交的三角形数量 | Mesh 几何体、模型细节、实例数量 |
| `points` | 本帧提交的点数量 | `Points`、点云、粒子 |
| `lines` | 本帧提交的线段数量 | `Line`、`LineSegments`、Helper 和线框调试对象 |

`renderer.info.memory` 记录 WebGL 资源数量，不记录真实字节大小。

- `memory.geometries`：当前被 WebGL 管理的 geometry 数量；切换模型或生成临时几何后持续上涨，先查 `dispose()`。
- `memory.textures`：当前纹理数量；它不会告诉你 64x64 和 2048x2048 谁更贵，只告诉你有几份纹理资源。
- `programs`：已编译 shader program 列表；材质类型、贴图槽、灯光、雾、裁剪、线框、flatShading 等状态组合会生成不同变体。

## Draw Call

draw call 可以先按“渲染器需要提交几批东西”理解。普通 `Mesh` 不会因为共享 geometry 或 material 就自动合成一个 draw call；共享资源主要减少内存和 shader 变体，不等于自动批处理。

- 一个普通 `Mesh` 通常至少产生一次 `calls`。
- 一个 `Mesh` 如果使用 material 数组，并且 geometry 有多个 group，可能每个 group 都产生一次 `calls`。
- 多个对象共享同一个 material，通常仍是多个 draw call，但 program 数量更稳定，状态切换也更少。
- 透明对象、后处理、多 render target、阴影贴图和多相机渲染都会让实际提交链路变长。
- 大量重复物体优先考虑 `InstancedMesh`；它把“很多实例”压进一次或少数 draw call。

## 几何复杂度

`triangles` 是 Mesh 的几何成本入口。对象数量不变时，球体分段、模型细节、细分曲面和高模资产都会推高它。

- `BoxGeometry` 面数稳定，适合当基准。
- `SphereGeometry`、`TorusKnotGeometry` 等分段参数越高，三角形越多。
- glTF 模型要同时看节点数量、mesh 数量、primitive 数量和三角形数。
- `Line` 和 `Points` 不增加 `triangles`，但会增加 `lines` 或 `points`，大量调试线和点云也会成为成本。
- 看不见的对象如果仍在渲染列表里，也可能产生提交；需要按业务设置 `visible`、layers、LOD 或移出场景。

## 纹理预算

纹理成本由数量、尺寸、格式、mipmap、采样方式和是否压缩共同决定。`renderer.info.memory.textures` 只显示纹理“份数”，不要把它当显存字节。

粗略估算未压缩 RGBA 纹理：

```text
width x height x 4 bytes
mipmap 约再增加 1/3
```

- 64x64 很便宜，1024x1024 已经约 4 MB，2048x2048 约 16 MB，4096x4096 约 64 MB。
- `generateMipmaps` 会增加存储，但远处缩小时更稳定，通常减少闪烁。
- `minFilter` 使用 mipmap 过滤时，需要有 mipmap；如果关闭 mipmap，使用 `LinearFilter` 或 `NearestFilter` 更稳。
- `magFilter` 影响纹理放大时的观感，`NearestFilter` 像素感强，`LinearFilter` 更平滑。
- 多个材质引用同一张纹理时，只占一份 texture 资源；重复创建相同图案会让 `memory.textures` 上升。
- 大型真实项目应考虑 KTX2/Basis 等 GPU 压缩纹理，减少显存和带宽压力。

## 复用与实例化

复用的目标是让数据和 shader 变体稳定，实例化的目标是减少提交次数。两者不是同一个层级。

- 复用 geometry：多个 mesh 指向同一个 `BufferGeometry`，减少 geometry 资源数量。
- 复用 material：多个 mesh 指向同一个 `Material`，减少材质对象和 program 变体风险。
- 复用 texture：多个材质指向同一个 `Texture`，减少 texture 资源数量和上传成本。
- `InstancedMesh`：多个实例共享一份 geometry 和 material，用 `setMatrixAt(...)` 写入每个实例的矩阵。
- `instanceMatrix.needsUpdate = true`：实例矩阵改完后需要上传。
- `setColorAt(...)` / `instanceColor.needsUpdate = true`：实例颜色改完后需要上传。

实例化适合“同一种几何、同一种材质、很多位置/旋转/缩放不同”的对象，例如草、石头、货架、点位标记。对象差异太大、材质贴图各不相同、需要复杂子节点交互时，实例化会变得不自然。

## 释放生命周期

从场景树移除对象只是不再渲染它，不等于释放 GPU 资源。几何、材质、纹理、渲染目标和部分 loader 资源需要明确释放。

```text
scene.remove(object)
  解除场景树关系
        ↓
object.traverse(...)
  收集 geometry / material / texture
        ↓
geometry.dispose()
material.dispose()
texture.dispose()
        ↓
清理业务引用
  数组、Map、闭包、缓存、选中状态、loader 结果
```

常见释放规则：

- `geometry.dispose()`：释放顶点、索引和相关 buffer。
- `material.dispose()`：释放材质关联的 shader program 引用；材质上的纹理不会被自动一起释放。
- `texture.dispose()`：释放纹理对象的 WebGL 资源。
- `WebGLRenderTarget.dispose()`：释放渲染目标、深度缓冲和关联纹理。
- 替换 `material.map` 时，先保存旧纹理引用，再决定是否 `oldTexture.dispose()`。
- glTF 模型通常要遍历整棵 `gltf.scene`；如果图片来源是 `ImageBitmap`，释放时还要留意 `image.close()`。
- 清理业务引用和调用 `dispose()` 同样重要；只 dispose 但数组仍保存旧对象，会让 JavaScript 内存继续留住它们。

## 按需渲染

不是所有页面都需要 60 FPS 的永久循环。产品展示、配置器、静态模型查看器和嵌入式 3D 卡片可以在状态变化时只渲染一帧。

- 连续渲染：动画、物理、粒子、视频纹理、实时交互时使用 `requestAnimationFrame` 或 `renderer.setAnimationLoop(...)`。
- 按需渲染：相机、尺寸、材质、模型、控件状态变化时调用一次 `render()`。
- `ResizeObserver`：容器尺寸变化时请求一帧，避免 canvas 尺寸旧值。
- `Page Visibility API`：页面隐藏时暂停循环，显示后再恢复或补一帧。
- `IntersectionObserver`：canvas 离开视口时暂停，回到视口再恢复。
- 交互控件：pointer move、drag、wheel 期间可以连续请求，交互结束后停止。

按需渲染的核心是集中管理 `requestRender()`。不要让多个 UI 回调各自直接 `renderer.render(...)`，否则很难控制暂停、恢复和重复帧。

## 常见判断

| 现象 / 需求 | 先看哪里 | 判断 |
| --- | --- | --- |
| 对象数量增加后明显变慢 | `render.calls` | 普通 mesh 多半是一对象一提交，先考虑实例化、合并或 LOD |
| 对象不多但三角形很高 | `render.triangles` | 查几何分段、模型细节和不可见高模 |
| Helper 开很多后读数变高 | `render.lines` | Helper、线框和调试线也会提交线段 |
| 点云卡顿 | `render.points` | 查点数量、材质尺寸、透明排序和是否能分块或降采样 |
| 纹理数量不高但显存压力大 | 纹理尺寸估算 | `memory.textures` 不显示字节，按尺寸、mipmap 和格式估算 |
| 切换模型后 memory 持续上升 | dispose 流程 | `scene.remove` 不会自动释放 geometry/material/texture |
| programs 越来越多 | 材质变体 | 查贴图槽开关、灯光、wireframe、flatShading 和材质类型 |
| 页面不可见仍占 CPU/GPU | 渲染循环 | 用 Page Visibility 和 IntersectionObserver 暂停循环 |
| 静态页面也每帧渲染 | render 调度 | 改成状态变化时 `requestRender()` |

## 记忆句

`calls` 看提交批次，`triangles/points/lines` 看几何工作量，`geometries/textures/programs` 看资源状态。

复用资源减少内存和变体，`InstancedMesh` 减少大量重复对象的 draw calls，`dispose()` 管住旧资源，按需渲染管住不必要的帧。

## 参考示例

- 渲染读数
  - [对象数量、材质分组和 calls / triangles / points / lines](src/scenes/render-cost-scene.js)

- 复用与实例化
  - [普通 Mesh 与 InstancedMesh 读数对比](src/scenes/instancing-reuse-scene.js)

- 纹理预算
  - [CanvasTexture / DataTexture 尺寸、复用、filter 和 mipmap](src/scenes/texture-budget-scene.js)

- 释放生命周期
  - [添加、替换、移除和释放资源](src/scenes/dispose-lifecycle-scene.js)

- 渲染调度
  - [按需渲染、Page Visibility 和 IntersectionObserver](src/scenes/on-demand-render-scene.js)

## 参考资料

- [WebGLRenderer docs](https://threejs.org/docs/pages/WebGLRenderer.html)
- [Info docs](https://threejs.org/docs/pages/Info.html)
- [InstancedMesh docs](https://threejs.org/docs/#api/en/objects/InstancedMesh)
- [BufferGeometry docs](https://threejs.org/docs/#api/en/core/BufferGeometry)
- [Texture docs](https://threejs.org/docs/pages/Texture.html)
- [Material docs](https://threejs.org/docs/#api/en/materials/Material)
- [three.js Manual: How to update things](https://threejs.org/manual/#en/how-to-update-things)
- [MDN Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)
- [MDN Intersection Observer API](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)
- [MDN requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)
