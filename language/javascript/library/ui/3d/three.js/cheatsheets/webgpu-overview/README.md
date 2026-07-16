# WebGPU

three.js 的 WebGPU 路线不是“把 WebGLRenderer 换个名字”，而是用 `WebGPURenderer` 进入新的 `Renderer` 抽象：场景、相机、Mesh 仍然熟悉，但初始化、后端能力、材质节点和 shader 心智模型都要重新判断。

一句话记住：

> 先检测浏览器能不能给 WebGPU device，再初始化 `WebGPURenderer`；写材质时优先理解 NodeMaterial / TSL，而不是假设旧的 GLSL `ShaderMaterial` 可以原样迁移。

## 概念定位

WebGPU 是浏览器暴露给网页的现代 GPU API。three.js 里的 `WebGPURenderer` 是它的渲染器入口，但这个入口属于 `Renderer` / backend 架构：默认尝试 WebGPU backend，不可用时可以落到 WebGL2 backend。

```text
浏览器能力
  secure context / navigator.gpu / adapter / device
        ↓
three.js renderer
  WebGPURenderer -> WebGPU backend 或 WebGL2 fallback backend
        ↓
three.js 场景
  Scene / Camera / Mesh / Light / Material
        ↓
材质生成
  NodeMaterial / TSL 优先，必要时再判断传统材质和 WebGL shader 边界
```

`WebGLRenderer` 仍然是当前最稳的主线选择。`WebGPURenderer` 适合学习新管线、验证 NodeMaterial / TSL、观察未来能力和做可控实验。

## 能力检测

WebGPU 检测不要只判断一个布尔值。实际链路至少有四层，每一层失败的含义不同。

| 检测点 | 判断 | 常见结果 |
| --- | --- | --- |
| `window.isSecureContext` | WebGPU 需要安全上下文 | `http://localhost` 通常可以；普通 `http://` 页面通常不行 |
| `navigator.gpu` | 浏览器是否暴露 WebGPU 入口 | 不存在时不能请求 adapter |
| `navigator.gpu.requestAdapter(...)` | 浏览器是否愿意给当前页面一个 GPU adapter | 可能返回 `null`，表示没有可用 adapter |
| `adapter.requestDevice()` | 是否能创建用于提交命令的 device | 可能因驱动、feature、limit 或策略失败 |

`three/addons/capabilities/WebGPU.js` 提供 `WebGPU.isAvailable()` 和 `WebGPU.getErrorMessage()`，适合快速提示用户。课程示例手写检测流程，是为了能把每一层状态展示出来。

## 初始化链路

`WebGPURenderer` 的关键变化是初始化是异步的。当前 `Renderer.render(scene, camera)` 在未初始化时会抛错；按需渲染或手动渲染前要显式等待。

```js
import * as THREE from 'three/webgpu';

const renderer = new THREE.WebGPURenderer({
  canvas,
  antialias: true
});

await renderer.init();
renderer.render(scene, camera);
```

`renderer.setAnimationLoop(callback)` 会在设置循环前确保 renderer 初始化，更适合连续动画、WebXR 和跨 renderer 兼容循环。按需渲染、初始化后只渲染一帧、或者在 UI 状态变化时手动 `render()`，仍然要自己管理 `await renderer.init()`。

初始化失败时不要让页面空白。常见策略是：

```text
尝试 WebGPU
  secure context 和 navigator.gpu 通过
  new WebGPURenderer(...)
  await renderer.init()
        ↓ 成功
  使用 WebGPURenderer 渲染
        ↓ 失败
  创建 WebGLRenderer 对照或显示中文 fallback 状态
```

## Renderer 边界

`Renderer` 抽象让很多调用看起来相似，但相似不代表完全兼容。

| 关注点 | `WebGLRenderer` | `WebGPURenderer` |
| --- | --- | --- |
| 创建方式 | `new THREE.WebGLRenderer(...)` | 从 `three/webgpu` 导入并 `new THREE.WebGPURenderer(...)` |
| 初始化 | 同步创建后通常可直接 `render()` | 手动 `render()` 前先 `await renderer.init()` |
| 后端 | WebGL | 默认 WebGPU，不可用时可 WebGL2 fallback；也可 `forceWebGL: true` |
| 常见接口 | `setSize`、`setPixelRatio`、`render`、`setAnimationLoop`、`dispose` | 接口相似，但语义受 backend 影响 |
| shader 心智模型 | `ShaderMaterial` / GLSL / `onBeforeCompile` 很常见 | 更偏向 NodeMaterial / TSL，再由节点系统生成后端代码 |
| 后处理 | 传统 `EffectComposer` 生态成熟 | WebGPU/节点后处理仍要按当前示例和文档确认 |
| 兼容性 | 浏览器覆盖和历史资料最多 | 浏览器、驱动、three.js 版本变化更快 |

写共享代码时可以抽出“renderer 有 `setSize`、`render`、`dispose`”这类共同接口；不要把 WebGL 的 shader chunk、后处理 pass、context 扩展和调试方式直接套到 WebGPU backend 上。

## 材质与 TSL

`NodeMaterial` 是节点材质体系的基类。`MeshStandardNodeMaterial` 可以理解成 `MeshStandardMaterial` 的节点版本：PBR 的外壳还在，但颜色、粗糙度、金属度、发光、位置等输入可以由节点表达式覆盖。

```text
TSL 节点表达式
  color(...) / uv() / time / sin(...) / mix(...)
        ↓
NodeMaterial 输入
  colorNode / roughnessNode / positionNode
        ↓
three.js 节点系统
  根据 backend 生成 WGSL 或 GLSL 等目标代码
```

TSL 写在 JavaScript 里，但它不是普通运行时计算。它描述的是 shader graph：节点系统会把表达式接入材质编译流程。示例里的 `time` 节点不是手写 uniform 字符串，`uv()` 也不是 GLSL 变量名；它们是 three.js 节点系统能理解的对象。

常见入门判断：

- 想写一段 WebGL GLSL 并精细控制 `gl_Position` / `gl_FragColor`：继续用 `ShaderMaterial` 学旧管线。
- 想在 WebGPU 路线里组合颜色、噪声、时间、PBR 输入或未来跨后端材质：优先看 `NodeMaterial` / TSL。
- 想把旧 `ShaderMaterial` 直接搬到 WebGPU：先停一下，通常要重写成 TSL 或改用当前 WebGPU 支持的路径。
- 想在内置 PBR 上小改：WebGL 时代常用 `onBeforeCompile`，WebGPU 路线更应该先看对应节点输入。

## 兼容性边界

WebGPU 课程要默认用户机器可能不支持 WebGPU。能构建、能打开、能显示状态，比“只在作者浏览器上跑出漂亮画面”更重要。

- 没有 `navigator.gpu`：页面显示中文 fallback，必要时使用 `WebGLRenderer` 对照。
- 有 `navigator.gpu` 但 `requestAdapter()` 返回 `null`：说明入口存在但当前环境没有可用 adapter。
- `await renderer.init()` 报错：捕获错误并切换到 WebGLRenderer 或显示失败原因。
- `WebGPURenderer` 落到 WebGL2 backend：它仍是 `WebGPURenderer` 抽象，不等同于传统 `WebGLRenderer`。
- 传统后处理、GLSL shader、WebGL 扩展、调试工具和性能读数：逐项确认，不按 WebGL 经验默认成立。

## 现在怎么选

继续选 `WebGLRenderer`：

- 项目要面向更广浏览器和更可预测的兼容性。
- 已经依赖成熟的 GLSL `ShaderMaterial`、`EffectComposer` pass 或 WebGL 调试经验。
- 课程或产品的重点是 three.js 核心对象、模型、材质、动画、性能和部署，而不是新 renderer。

可以实验 `WebGPURenderer`：

- 想学习 three.js 新的 `Renderer` / backend 架构。
- 想从 NodeMaterial / TSL 建立跨后端 shader graph 心智模型。
- 想验证 WebGPU backend、compute、未来渲染能力或官方 WebGPU 示例。
- 可以接受浏览器、驱动和 three.js 版本变化带来的维护成本。

## 常见判断

| 现象 / 需求 | 先看哪里 | 判断 |
| --- | --- | --- |
| 页面不是 HTTPS | `window.isSecureContext` | WebGPU 需要安全上下文，先换到 HTTPS 或 localhost |
| `navigator.gpu` 不存在 | 浏览器和上下文 | 不要继续 `requestAdapter()`，直接显示 fallback |
| `requestAdapter()` 返回 `null` | adapter 检测 | 浏览器没有给当前页面可用 GPU adapter |
| `render()` 报未初始化 | `await renderer.init()` | 按需渲染前必须等待初始化 |
| WebGPU 不可用但画面仍出现 | `WebGPURenderer` backend | 可能落到了 WebGL2 fallback 后端 |
| 旧 GLSL 示例迁不过去 | `ShaderMaterial` 与 TSL 边界 | WebGPU 路线优先重写成 NodeMaterial / TSL |
| 后处理示例不兼容 | 当前 renderer 和 pass 来源 | WebGL 后处理链不要默认可用于 WebGPU |
| 生产项目要稳 | 浏览器覆盖和维护成本 | 当前仍优先 WebGLRenderer，WebGPU 放实验分支 |

## 记忆句

WebGPU 先问“能不能拿到 device”，three.js 再问“renderer 初始化了吗”，材质最后问“这是 GLSL 字符串还是 TSL 节点图”。

`WebGLRenderer` 是稳态主线，`WebGPURenderer` 是新管线入口；接口相似可以复用经验，backend 不同必须重新验证边界。

## 参考示例

- 能力检测
  - [`navigator.gpu`、`requestAdapter()` 和 `requestDevice()`](src/capability-check-main.js)

- 初始化
  - [`WebGPURenderer` 初始化与 `WebGLRenderer` fallback](src/scenes/renderer-init-scene.js)

- Renderer 边界
  - [`WebGLRenderer` 与 `WebGPURenderer` 对照](src/scenes/webgl-webgpu-boundary-scene.js)

- NodeMaterial / TSL
  - [`MeshStandardNodeMaterial`、`colorNode`、`roughnessNode` 和 `positionNode`](src/scenes/node-material-tsl-scene.js)

## 参考资料

- [WebGPURenderer docs](https://threejs.org/docs/pages/WebGPURenderer.html)
- [WebGPU capability docs](https://threejs.org/docs/pages/WebGPU.html)
- [Renderer docs](https://threejs.org/docs/pages/Renderer.html)
- [NodeMaterial docs](https://threejs.org/docs/pages/NodeMaterial.html)
- [MeshStandardNodeMaterial docs](https://threejs.org/docs/pages/MeshStandardNodeMaterial.html)
- [TSL Specification](https://threejs.org/docs/TSL.html)
- [MDN WebGPU API](https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API)
- [MDN Navigator.gpu](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/gpu)
- [MDN GPU.requestAdapter()](https://developer.mozilla.org/en-US/docs/Web/API/GPU/requestAdapter)
- [MDN GPUAdapter.requestDevice()](https://developer.mozilla.org/en-US/docs/Web/API/GPUAdapter/requestDevice)
