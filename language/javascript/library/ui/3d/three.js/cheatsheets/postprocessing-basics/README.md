# 后处理

`后处理` 是把 `renderer.render(scene, camera)` 拆成 `EffectComposer` 的 pass 链路：先把 3D 场景渲染到缓冲，再让 Bloom、Outline、抗锯齿等 pass 处理这张画面，最后输出到屏幕。

一句话记住：

> 后处理看的是“上一道 pass 画出的图”，不是直接改变场景里的 Mesh；用了 composer 后，渲染循环通常调用 `composer.render()`。

## 渲染链路

`EffectComposer` 管理一串 pass。每个 pass 按加入顺序执行，读取上一环的结果，写入下一环的缓冲；最后一个启用的 pass 会渲染到屏幕。

```text
scene + camera
  由 RenderPass 渲染成第一张画面
        ↓
Bloom / Outline / FXAA / 自定义 ShaderPass
  读取上一张图，写出处理后的图
        ↓
OutputPass 或最后的屏幕 pass
  做 tone mapping / color space 转换并显示
```

`RenderPass(scene, camera)` 通常放第一位。它负责把原始 3D 场景画进 composer 内部的 read / write render target。只有 `RenderPass + OutputPass` 时，画面通常接近直接 `renderer.render(scene, camera)`，但渲染入口已经变成 pass 链。

## Composer 和 Renderer

`renderer` 仍然负责 WebGL 上下文、尺寸、像素比、tone mapping、color space 和实际 GPU 绘制；`composer` 负责把多个 pass 串起来。

```js
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new OutputPass());

function render() {
  composer.render();
}
```

- `renderer.render(scene, camera)`：只画当前场景，不执行 composer 中的 pass。
- `composer.render()`：按 pass 顺序执行；后处理效果只会在这里出现。
- `composer.render(deltaTime)`：某些 pass 需要时间时可以传入秒单位 delta；不传时 composer 会自己取 delta。
- `composer.addPass(pass)`：把 pass 接到链尾，同时调用 pass 的 `setSize(...)`。
- `composer.removePass(pass)`：从链中移除 pass；长期不用还要调用对应 `dispose()`。

## Pass 顺序

顺序决定输入图像，也决定颜色空间是否正确。基础判断是：先画场景，中间做效果，末尾做输出；特殊抗锯齿按 pass 需求放置。

| 位置 | 常见 pass | 判断 |
| --- | --- | --- |
| 第一位 | `RenderPass` | 把 `scene + camera` 变成后续 pass 的输入 |
| 中间 | `UnrealBloomPass`、`OutlinePass` | 读取上一张图，再叠加发光、轮廓等效果 |
| 接近末尾 | `OutputPass` | 使用 renderer 的 `toneMapping`、`toneMappingExposure`、`outputColorSpace` |
| 特殊末尾 | `FXAAPass` | 当前 three.js 文档说明 FXAA 需要 sRGB 输入，因此可放在 `OutputPass` 后 |
| Output 前 | `SMAAPass` | SMAA 工作在线性 sRGB，通常放在 `OutputPass` 前 |

`OutputPass` 大多数时候应该在链尾。例外是 FXAA 这类明确要求 sRGB 输入的 pass：先 `OutputPass`，再 `FXAAPass`，让 FXAA 处理屏幕颜色空间下的边缘。

## 尺寸同步

后处理多了一层 render target，所以只更新 renderer 尺寸不够。容器尺寸或 pixel ratio 改变时，同步四件事：

- `renderer.setPixelRatio(pixelRatio)`：决定 WebGL drawing buffer 的像素密度。
- `renderer.setSize(width, height, false)`：让 canvas drawing buffer 跟 CSS 尺寸匹配。
- `camera.aspect = width / height` + `camera.updateProjectionMatrix()`：让相机投影不被拉伸。
- `composer.setPixelRatio(pixelRatio)` + `composer.setSize(width, height)`：让 composer 内部 render target 和每个 pass 的 `setSize(...)` 更新。

`composer.setSize(width, height)` 接收的是 CSS 逻辑尺寸；composer 会结合自己的 pixel ratio 得到实际 render target 尺寸。FXAA 的 `resolution` uniform、Bloom 的 mip render targets、Outline 的 mask / blur buffer 都依赖这个更新。

## Bloom

`UnrealBloomPass` 从上一张图里提取亮区，模糊后加回画面。它适合表现发光屏幕、霓虹、高亮能量体或强反射亮斑。

```js
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(width, height),
  strength,
  radius,
  threshold
);
```

- `threshold`：亮度阈值；越低，越多区域参与发光。
- `strength`：发光强度；越高，叠回画面的光越亮。
- `radius`：扩散半径，范围通常在 `0` 到 `1`；越高光晕越宽。
- `renderer.toneMapping`：UnrealBloomPass 文档要求开启 tone mapping；常配合 `ACESFilmicToneMapping` 和曝光调节。

Bloom 不知道哪个对象“应该发光”，它只看输入图像的亮度。想让某个物体稳定发光，可以使用高亮自发光材质、亮色 `MeshBasicMaterial`，或在进阶项目里做选择性 Bloom。

## Outline

`OutlinePass(resolution, scene, camera, selectedObjects)` 会围绕 `selectedObjects` 中的对象渲染轮廓。它常用于点击选中、hover 高亮和编辑器式对象标记。

- `selectedObjects`：数组为空时没有轮廓；数组里放对象时，会对该对象及其可描边子级生成轮廓。
- `visibleEdgeColor`：可见边缘颜色。
- `hiddenEdgeColor`：被遮挡边缘颜色。
- `edgeStrength`：轮廓亮度强度。
- `edgeThickness`：轮廓线粗细。
- `edgeGlow` / `pulsePeriod`：用于发光或脉冲式轮廓。

OutlinePass 会额外渲染 depth、mask、edge 和 blur 缓冲。对象多、分辨率高或轮廓持续开启时，成本比普通颜色高亮更大；只需要简单 hover 颜色变化时，不一定要用 OutlinePass。

## 抗锯齿

使用 `EffectComposer` 后，画面先进入离屏 render target。`WebGLRenderer({ antialias: true })` 只保证默认 framebuffer 的 MSAA，不一定能处理 composer 内部缓冲的边缘，所以常用后处理抗锯齿。

- `FXAAPass`：便宜、简单、屏幕空间处理；会略微柔化高对比边缘和细线。
- `SMAAPass`：质量通常更好，成本和内部资源更多；按官方文档放在 `OutputPass` 前。
- `pixelRatio`：提高像素比能增加采样密度，但 render target 面积按平方增长，成本也会明显上升。
- `setSize(...)`：抗锯齿 pass 必须拿到最新实际 buffer 尺寸，否则边缘采样偏移会不准。

移动端或大画布不要盲目把 pixel ratio 设成设备原生值。常见做法是限制在 `1` 到 `2`，再用 FXAA / SMAA 补边缘质量。

## 性能和颜色

后处理的成本来自“多画几遍全屏图”和“多占几张 render target”。Bloom 会创建多级模糊目标；Outline 会多次渲染 mask / depth；抗锯齿会额外扫一遍屏幕。画布越大、pixel ratio 越高，成本越明显。

颜色空间上，`OutputPass` 负责把线性渲染结果按 renderer 的 `toneMapping` 和 `outputColorSpace` 转成屏幕颜色。没有 `OutputPass` 时，后处理链的最终颜色可能和直接 renderer 输出不一致；有多个颜色相关 pass 时，先确认谁在线性空间工作，谁需要 sRGB 输入。

## 常见判断

| 现象 / 需求 | 先看哪里 | 判断 |
| --- | --- | --- |
| 后处理完全没效果 | 渲染循环 | 用 `composer.render()`，不是 `renderer.render(scene, camera)` |
| 画面被拉伸或 FXAA 错位 | `composer.setSize(...)` | renderer、camera、composer 和 pass 尺寸要一起更新 |
| Bloom 不发光 | `threshold` 和输入亮度 | Bloom 看亮度；先降低阈值或提高发光对象亮度 |
| Bloom 太糊或太亮 | `strength` / `radius` | 强度控制亮度，半径控制扩散宽度 |
| 轮廓不出现 | `selectedObjects` | 数组为空、对象未进场景或选错父子节点都会没轮廓 |
| 轮廓成本高 | `OutlinePass` 是否常驻 | 它会多次渲染额外缓冲，简单 hover 可用材质高亮 |
| 抗锯齿开了仍糊 | `pixelRatio` 和 pass 顺序 | FXAA 会柔化边缘；先确认尺寸 uniform 和 OutputPass 顺序 |
| 颜色和直接渲染不同 | `OutputPass` / renderer color 设置 | 后处理链末尾要处理 tone mapping 和 output color space |

## 记忆句

先 `RenderPass`，再效果 pass，最后按颜色空间放 `OutputPass`；用了 composer，就让 composer 负责最后一帧。

尺寸同步是后处理的生命线：renderer、camera、composer、pass 都要知道同一组 CSS 尺寸和 pixel ratio。

## 参考示例

- 基础链路
  - [EffectComposer / RenderPass / OutputPass](src/scenes/composer-chain-scene.js)

- 效果 Pass
  - [UnrealBloomPass](src/scenes/bloom-pass-scene.js)
  - [OutlinePass / selectedObjects](src/scenes/outline-pass-scene.js)

- 抗锯齿
  - [FXAAPass / pixel ratio](src/scenes/antialias-pass-scene.js)

## 参考资料

- [EffectComposer docs](https://threejs.org/docs/pages/EffectComposer.html)
- [RenderPass docs](https://threejs.org/docs/pages/RenderPass.html)
- [OutputPass docs](https://threejs.org/docs/pages/OutputPass.html)
- [UnrealBloomPass docs](https://threejs.org/docs/pages/UnrealBloomPass.html)
- [OutlinePass docs](https://threejs.org/docs/pages/OutlinePass.html)
- [FXAAPass docs](https://threejs.org/docs/pages/FXAAPass.html)
- [SMAAPass docs](https://threejs.org/docs/pages/SMAAPass.html)
- [WebGLRenderer docs](https://threejs.org/docs/pages/WebGLRenderer.html)
