# 粒子

`THREE.Points` 是用一组顶点渲染大量屏幕点的对象：位置、颜色、随机数和其他每点数据主要来自 `BufferGeometry` attribute，外观由 `PointsMaterial` 或 `ShaderMaterial` 决定。

一句话记住：

> 像点云就用 `Points`，像许多可旋转小物体就用 `InstancedMesh`；动态粒子的成本重点不是对象数量，而是 attribute 上传、透明状态和 draw call。

## 渲染链路

粒子不是很多个 `Object3D`。一个 `Points` 通常就是一个可渲染对象，一份 `BufferGeometry` 保存所有点的数据，一份材质决定这些点在屏幕上怎样变成片元。

```text
TypedArray
  保存 position / color / size / seed 等连续数据
        ↓
BufferAttribute
  用 itemSize 把连续数据切成每个点自己的记录
        ↓
BufferGeometry
  以 attribute 名称组织点数据
        ↓
THREE.Points
  把 geometry 和 material 作为一次可渲染提交
        ↓
PointsMaterial 或 ShaderMaterial
  决定点大小、颜色、贴图、透明和片元外观
```

`renderer.info.render.calls` 用来看提交批次，`renderer.info.render.points` 用来看本帧点数量。一个 `Points` 有几千或几万个顶点时，通常仍是一批提交，但 GPU 要处理的点和片元会变多。

## Points 和 Attribute

`Points` 读取 `geometry.attributes.position` 作为点的位置。其他 attribute 是否生效取决于材质：`PointsMaterial` 能直接使用顶点颜色，`ShaderMaterial` 可以读取自定义 attribute。

- `position`：必须是 `itemSize=3`，每个点一个局部空间坐标。
- `color`：配合 `vertexColors: true` 使用；会和材质 `color`、贴图颜色一起影响最终颜色。
- `aSize`：`PointsMaterial` 不会自动读取每点尺寸；要每点不同大小，通常改用 `ShaderMaterial`。
- `aSeed` / `aRandom`：常用于 shader 中制造每点不同的相位、闪烁、偏移或颜色。
- `usage`：动态 attribute 可在首次渲染前设置为 `DynamicDrawUsage`，作为更新频率提示。

```js
const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
```

如果点的位置范围会变化，记得处理包围体。`computeBoundingSphere()` 会根据当前 position 计算包围球；动态粒子也可以设置一个足够大的 `geometry.boundingSphere`，避免点移动后被视锥裁剪误判。

## PointsMaterial

`PointsMaterial` 是内置点材质，适合不用自定义 GLSL 的点云、星空、简单粒子和调试点。

| 属性 | 影响 | 常见判断 |
| --- | --- | --- |
| `size` | 点在屏幕上的基础尺寸 | 过大可能受 WebGL 点大小上限影响 |
| `sizeAttenuation` | 透视相机下远处点是否变小 | 星空常开；屏幕 UI 点可关 |
| `color` | 整体颜色 | 和 `vertexColors`、`map` 共同作用 |
| `vertexColors` | 是否读取 `geometry.attributes.color` | 每点不同颜色时打开 |
| `map` | 点贴图 | 常用 `CanvasTexture` 做圆点，避免外部资源 |
| `alphaTest` | 低于阈值的透明片元直接丢弃 | 圆点硬边、减少透明混合问题时有用 |
| `transparent` | 是否启用透明混合 | 软边、发光、半透明点常开 |
| `depthWrite` | 是否写入深度缓冲 | 半透明软粒子常关，实心点可按遮挡需求打开 |

`PointsMaterial` 的每个点本质上先是一个面向屏幕的方块片元区域。圆形、软边或发光通常靠贴图 alpha、`alphaTest` 或 shader 丢弃边缘来完成。

## ShaderMaterial 点外观

用 `ShaderMaterial` 画点时，顶点阶段负责点在哪里和多大，片元阶段负责点块内部是什么形状。

```text
vertex shader
  读取 position / aSize / aSeed
  写 gl_Position 和 gl_PointSize
        ↓
fragment shader
  用 gl_PointCoord 读取当前片元在点块里的 0..1 坐标
  计算圆形、光环、星芒、透明边缘或 discard
```

- `gl_PointSize`：只能在 vertex shader 写；决定屏幕上点块的像素尺寸。
- `gl_PointCoord`：只能在 fragment shader 读；左下到右上的二维坐标，用来把方点裁成圆点或图案。
- `uniform`：适合时间、整体点径、边缘柔和度、模式开关。
- `attribute`：适合每点大小、颜色、随机相位、生命周期、速度等。
- `varying`：把 vertex shader 读到的每点数据传给 fragment shader。

shader 能改变点块内部的颜色和透明，但不能让一个点变成真实三角网格，也不能自动解决所有半透明排序问题。

## 动态更新

动态粒子常见做法是复用同一批 TypedArray，每帧改数组里的数值，再标记对应 attribute 需要上传。

```js
const position = geometry.getAttribute('position');
position.array[index * 3 + 1] = nextY;
position.needsUpdate = true;
```

- 只改 TypedArray：CPU 数据变了，GPU buffer 不一定变。
- 设置 `attribute.needsUpdate = true`：下一次渲染前上传这份 attribute。
- 改 `uniform.value`：不需要 `material.needsUpdate`，下一次 draw call 会读取新值。
- 改 attribute 的 `itemSize`、`count` 或数据类型：新建 attribute 或 geometry，比原地改更清楚。
- 改材质是否使用贴图、透明分支、alphaTest 等 shader 变体：通常设置 `material.needsUpdate = true`。

每帧上传很大的 position/color/size 会消耗带宽。真正的大量粒子会尽量减少上传范围、把动画放进 shader，或把生命周期和随机种子作为稳定 attribute，只用 `uniform` 推进时间。

## 拾取与遮挡边界

点云适合“看很多点”，不适合天然承担精确交互。

- `Raycaster` 可以检测 `Points`，精度由 `raycaster.params.Points.threshold` 控制，阈值是世界单位。
- 屏幕上看到的是点块片元，射线检测的是点位置附近的容差；两者不总是完全一致。
- 透明点通常按对象排序，不会自动按每个点内部深度完美排序。
- `depthWrite: false` 能减少软透明点互相写深度造成的硬洞，但也会改变遮挡关系。
- 需要稳定点击某个独立对象时，`InstancedMesh` 的命中结果有 `instanceId`，通常比把所有交互压在点云里更可控。

如果交互需要精确轮廓、旋转、独立 hover、独立遮挡或复杂贴图，先考虑 `Sprite`、小 `Mesh`、`InstancedMesh` 或 GPU picking。

## InstancedMesh 取舍

`InstancedMesh` 不是 `Points` 的替代品，而是“大量共享小 mesh”的方案。它用一份 geometry 和 material，加上每个实例自己的矩阵和可选颜色，渲染很多可变对象。

| 需求 | 优先选择 | 原因 |
| --- | --- | --- |
| 大量点云、星点、采样点 | `Points` | 顶点数据少，通常一次提交画很多点 |
| 每个对象要独立旋转、缩放、真实轮廓 | `InstancedMesh` | 每个实例有矩阵，保留 mesh 几何形状 |
| 每点大小和颜色随 shader 变化 | `Points + ShaderMaterial` | attribute + uniform 成本低，适合屏幕颗粒 |
| 每个对象要被稳定拾取 | `InstancedMesh` | Raycaster 返回 `instanceId` |
| 每个对象材质、贴图、子节点都不同 | 普通对象或分组批处理 | 实例化要求共享 geometry/material，差异太大会别扭 |

`InstancedMesh` 能减少 draw call，但不会让几何成本消失。一个平面实例有三角形，一个小盒子实例有更多三角形；实例数量增加时，`renderer.info.render.triangles` 仍会增加。

## 性能判断

粒子性能先看“提交了什么”，再看“每帧上传了什么”。

- `render.calls`：一个 `Points` 或一个 `InstancedMesh` 通常是一批提交；材质数组、后处理和阴影会增加提交。
- `render.points`：`Points` 顶点数量；点越大，片元填充成本越高。
- `render.triangles`：`InstancedMesh` 的几何成本；实例越多，三角形越多。
- attribute 上传：每帧 `needsUpdate` 的数组越大，CPU 到 GPU 带宽压力越明显。
- 透明混合：`transparent`、软边贴图、加法混合和 `depthWrite` 组合会影响排序、遮挡和过度绘制。
- 纹理预算：粒子贴图通常很小，但重复创建很多 `CanvasTexture` 仍会增加 texture 资源。
- 生命周期：替换 geometry、material、texture 后，不再使用时调用 `dispose()`。

## 常见判断

| 现象 / 需求 | 先看哪里 | 判断 |
| --- | --- | --- |
| 点数量很多但 calls 仍是 1 | `THREE.Points` | 一个点云对象通常一次提交，成本转到 points 和片元 |
| 每点大小要不同 | `ShaderMaterial + aSize` | `PointsMaterial.size` 是整体尺寸 |
| TypedArray 改了画面没变 | `attribute.needsUpdate` | 改数组后要标记上传 |
| 动态点突然消失或裁切 | `geometry.boundingSphere` | 位置变化后包围体可能过小 |
| 圆点边缘有方块 | `map` / `alphaTest` / `transparent` | 没贴图或透明状态不匹配会看到方形点块 |
| 软透明点互相遮挡出硬洞 | `depthWrite` | 半透明粒子常先试 `depthWrite: false` |
| 点很难被选中 | `raycaster.params.Points.threshold` | 阈值是世界单位，不是屏幕像素 |
| 需要每个粒子旋转成小卡片 | `InstancedMesh` | `Points` 点块始终是屏幕点，不是可旋转 mesh |
| triangles 暴涨 | `InstancedMesh` 几何 | 实例化省提交，不省每个实例的几何成本 |

## 记忆句

`Points` 管“大量点的数据提交”，`PointsMaterial` 管“内置点外观”，`ShaderMaterial` 管“每点自定义外观”，`InstancedMesh` 管“大量真实小物体”。

少建对象，多复用 buffer；能用 uniform 推动就别每帧上传大数组；透明粒子先查 alpha、depth 和排序。

## 参考示例

- 点云数据
  - [BufferGeometry 点云](src/scenes/points-buffer-scene.js)

- 材质外观
  - [PointsMaterial 透明边界](src/scenes/point-material-alpha-scene.js)

- 动态更新
  - [attribute 上传](src/scenes/dynamic-attributes-scene.js)

- Shader 外观
  - [gl_PointSize 和 gl_PointCoord](src/scenes/shader-points-scene.js)

- 大量对象边界
  - [Points 与 InstancedMesh](src/scenes/instanced-particles-scene.js)

## 参考资料

- [Points docs](https://threejs.org/docs/#api/en/objects/Points)
- [PointsMaterial docs](https://threejs.org/docs/#api/en/materials/PointsMaterial)
- [BufferGeometry docs](https://threejs.org/docs/#api/en/core/BufferGeometry)
- [BufferAttribute docs](https://threejs.org/docs/#api/en/core/BufferAttribute)
- [ShaderMaterial docs](https://threejs.org/docs/pages/ShaderMaterial.html)
- [InstancedMesh docs](https://threejs.org/docs/#api/en/objects/InstancedMesh)
- [Raycaster docs](https://threejs.org/docs/pages/Raycaster.html)
- [Info docs](https://threejs.org/docs/pages/Info.html)
- [three.js Manual: Custom BufferGeometry](https://threejs.org/manual/#en/custom-buffergeometry)
- [three.js Manual: How to update things](https://threejs.org/manual/#en/how-to-update-things)
