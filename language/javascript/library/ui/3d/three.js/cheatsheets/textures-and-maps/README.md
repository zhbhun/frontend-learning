# 纹理

`Texture` 是材质采样图像数据的对象：它保存图片、Canvas 或 buffer 来源，也保存 UV 变换、采样方式和颜色空间。

一句话记住：

> 材质决定“这份纹理数据做什么”，纹理决定“这份数据怎样被读取、变换和采样”。

## 对象关系

纹理不是直接“贴到模型上”的图片。它更像材质可以读取的一份数据，这份数据从来源进入 `Texture`，再经过 UV 和材质贴图槽变成最终画面。

```text
图片 / Canvas / TypedArray
  提供像素数据
        ↓
Texture
  保存像素来源 + 采样规则
  repeat / offset / wrapS / wrapT / filter / colorSpace
        ↓
几何体 UV
  决定渲染器从纹理的哪个位置取样
        ↓
材质贴图槽
  map / normalMap / roughnessMap / alphaMap
  决定采样值被解释成颜色、法线、粗糙度或透明度
        ↓
渲染结果
```

这条关系里，`Texture` 主要回答“数据怎么被读取”，材质贴图槽回答“读取出来的数据用来做什么”。更新状态也按这个边界判断：像素或纹理采样状态变了，用 `texture.needsUpdate` 让纹理重新上传；材质是否使用某个贴图槽变了，用 `material.needsUpdate` 让材质刷新 shader 分支。

## 概念定位

- `TextureLoader` 从 URL 加载图片并生成 `Texture`，适合 PNG、JPG、WebP、SVG 等图片资源。
- `LoadingManager` 统一监听一组资源的加载状态，适合需要进度、完成、错误反馈的示例。
- `CanvasTexture` 从 `<canvas>` 创建纹理，适合动态绘制文字、图案或图表。
- `DataTexture` 从 TypedArray 创建纹理，适合程序生成的遮罩、参数图或数据贴图。
- UV 是几何体表面到纹理坐标的映射；贴图位置、方向、拉伸都先查 UV。
- 材质贴图槽决定纹理采样值的用途；同一张图放进不同槽位，含义会完全不同。

## 来源与生命周期

图片纹理常用 `TextureLoader.loadAsync()`，因为加载流程可以用 `await` 串起来。需要统一监听多张纹理时，再加 `LoadingManager` 处理开始、完成和错误状态。

`CanvasTexture` 和 `DataTexture` 的重点不是加载，而是更新：来源内容变了以后，要设置 `texture.needsUpdate = true`，否则 GPU 仍可能沿用旧像素。示例切换、页面销毁或替换贴图时，旧纹理要调用 `dispose()` 释放 GPU 资源。

## 坐标与方向

UV 是纹理定位的入口。默认 `UVMapping` 会读取几何体的 `uv` attribute，再用纹理自己的变换参数调整采样位置。

- `repeat` 控制 U/V 方向重复次数；数值越大，图案越密。
- `offset` 控制 U/V 起点偏移；常用于滚动纹理或对齐图案。
- `rotation` 围绕 `center` 旋转 UV；单位是弧度。
- `center` 是旋转中心；常用 `(0.5, 0.5)` 表示纹理中心。
- `flipY` 控制上传纹理时是否翻转 Y 方向；图片上下颠倒时优先检查它。

## 超出与缩放采样

`wrapS` 和 `wrapT` 处理 UV 超出 `[0, 1]` 后怎么读图。默认是夹到边缘；想让 `repeat` 真正平铺，需要把对应方向改成 `RepeatWrapping` 或 `MirroredRepeatWrapping`。

filter 处理纹理像素和屏幕像素尺寸不一致的情况：

- `magFilter` 在纹理被放大时生效；`NearestFilter` 更硬，`LinearFilter` 更平滑。
- `minFilter` 在纹理被缩小时生效；带 mipmap 的过滤通常更稳定，远处更少闪烁。
- `generateMipmaps` 控制是否生成缩小级别；图片纹理常用，程序数据纹理按需求开启。
- `anisotropy` 改善斜视角下的清晰度；数值越高远处越清楚，采样成本也更高。

## 颜色与数据

颜色贴图和数据贴图不能按同一套颜色空间处理。颜色贴图描述“看起来是什么颜色”，数据贴图描述“某个参数是多少”。

| 贴图 | colorSpace | 原因 |
| --- | --- | --- |
| `map` | `SRGBColorSpace` | 基础颜色需要按颜色管理转换 |
| `emissiveMap` | `SRGBColorSpace` | 自发光颜色仍然是颜色数据 |
| `normalMap` | `NoColorSpace` | RGB 是法线方向数据，不是颜色 |
| `roughnessMap` / `metalnessMap` | `NoColorSpace` | 通道值是参数数据 |
| `alphaMap` | `NoColorSpace` | 灰度值控制透明度 |
| `aoMap` | `NoColorSpace` | 红色通道是遮蔽强度 |

## 材质贴图槽

贴图槽决定材质 shader 怎么解释纹理采样值。

- `map` 是基础颜色贴图，影响表面颜色分布，通常配 `SRGBColorSpace`。
- `emissiveMap` 是自发光颜色贴图，不靠灯光照亮，但仍受材质自发光设置影响。
- `normalMap` 改变光照法线，不改变真实几何；调 `normalScale` 可以观察凹凸强弱。
- `roughnessMap` 改变粗糙度，让同一个物体同时出现亮面和哑光区域。
- `metalnessMap` 控制金属度，PBR 材质中常和 roughness 组合使用。
- `alphaMap` 控制透明度，需要材质开启 `transparent`。
- `aoMap` 控制环境遮蔽，通常需要第二套 UV，后续模型课程会更常见。

## 更新和释放

纹理和材质都有缓存状态。改对象属性不一定等于 GPU 或 shader 已经重新准备好。

- 改 canvas 或 TypedArray 像素：设置 `texture.needsUpdate = true`。
- 改 `wrapS`、`wrapT`、`magFilter`、`minFilter`、`colorSpace`、`flipY`：设置 `texture.needsUpdate = true`。
- 改 `repeat`、`offset`、`rotation`：通常不需要重新上传，它们更新纹理变换矩阵。
- 给材质新增、移除或切换贴图槽：设置 `material.needsUpdate = true`。
- 替换旧纹理或销毁示例：对旧纹理调用 `dispose()`。

## 常见判断

- 颜色偏灰、偏亮或不符合原图：先查 `colorSpace`。颜色贴图通常用 `SRGBColorSpace`，数据贴图保留 `NoColorSpace`。
- 图案上下颠倒：先查 `flipY` 和模型 UV。图片、canvas、模型 UV 的方向可能不一致。
- `repeat` 设置后没有重复：先查 `wrapS` / `wrapT`。默认 clamp 到边缘，不会自动平铺。
- 远处纹理闪烁或模糊：先查 `minFilter`、mipmap 和 `anisotropy`。
- Canvas 画了新内容但画面没变：先查 `texture.needsUpdate`。
- 切换 `map` / `normalMap` 后没变化：先查 `material.needsUpdate`。
- 透明贴图看不到透明效果：先查 `transparent`、`alphaMap` 和贴图灰度通道。
- 凹凸光影方向奇怪：先查 `normalMap`、`normalScale` 和 `colorSpace`；normal 是数据贴图，不要按颜色处理。

## 记忆句

来源决定像素从哪里来，UV 决定贴在哪里，wrap 和 filter 决定怎么采样，材质槽决定采样值用来做什么。

颜色贴图按颜色处理，数据贴图按数字处理；画面没变时先区分是纹理需要 `needsUpdate`，还是材质需要 `material.needsUpdate`。

## 参考示例

- 加载与来源
  - [TextureLoader](src/scenes/texture-loader-scene.js)
  - [CanvasTexture](src/scenes/canvas-texture-scene.js)
  - [DataTexture](src/scenes/data-texture-scene.js)

- 颜色与方向
  - [Color Space](src/scenes/color-space-scene.js)
  - [flipY](src/scenes/flip-y-scene.js)

- UV 与采样
  - [UV Transform](src/scenes/uv-transform-scene.js)
  - [Wrapping Modes](src/scenes/wrapping-modes-scene.js)
  - [Filters / Mipmaps](src/scenes/filters-mipmaps-scene.js)

- 材质贴图槽
  - [Material Map Slots](src/scenes/material-map-slots-scene.js)

## 参考资料

- [Texture docs](https://threejs.org/docs/pages/Texture.html)
- [TextureLoader docs](https://threejs.org/docs/pages/TextureLoader.html)
- [LoadingManager docs](https://threejs.org/docs/pages/LoadingManager.html)
- [CanvasTexture docs](https://threejs.org/docs/pages/CanvasTexture.html)
- [DataTexture docs](https://threejs.org/docs/pages/DataTexture.html)
- [MeshStandardMaterial docs](https://threejs.org/docs/pages/MeshStandardMaterial.html)
- [three.js Manual: Textures](https://threejs.org/manual/#en/textures)
