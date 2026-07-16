# Shader

`ShaderMaterial` 是在 three.js 中写自定义 GLSL 的材质：JavaScript 准备几何、uniform 和材质，vertex shader 决定顶点位置，fragment shader 决定每个像素颜色。

一句话记住：

> `uniform` 是每次 draw call 共享的参数，`attribute` 是每个顶点自己的数据，`varying` 是从顶点阶段插值到片元阶段的桥。

## 渲染链路

自定义 shader 没有脱离 three.js。`Mesh` 仍然把 `BufferGeometry` 和 `Material` 交给 renderer；区别是材质里的 shader 代码接管了“顶点怎么投影、像素怎么上色”。

```text
JavaScript / three.js 对象
  创建 geometry、attribute、uniform、ShaderMaterial
        ↓
vertex shader
  读取 position / normal / uv / 自定义 attribute
  计算 gl_Position，并把中间值写入 varying
        ↓
光栅化
  把三角形覆盖区域切成片元，并插值 varying
        ↓
fragment shader
  读取 uniform、varying、纹理采样等数据
  写出 gl_FragColor
```

`ShaderMaterial` 仍会参与 three.js 的相机、对象矩阵、深度、透明、side、wireframe 等材质状态。它不是“完全自己画 WebGL”，而是在 three.js 材质系统里替换表面程序。

## ShaderMaterial

`ShaderMaterial` 会把 three.js 常用内置变量和 GLSL 前缀接到 shader 前面，因此入门时可以直接使用这些名字：

- `position`：几何体的顶点位置 attribute，来自 `geometry.attributes.position`。
- `normal`：顶点法线 attribute，受光、法线可视化和表面方向判断常用。
- `uv`：纹理坐标 attribute，平面、纹理和屏幕式效果常用。
- `modelViewMatrix`：对象世界矩阵与相机视图矩阵的组合。
- `projectionMatrix`：相机投影矩阵。
- `cameraPosition`：相机世界位置，做视线方向或边缘效果时常见。

最小顶点阶段通常是把局部顶点位置变成裁剪空间位置：

```js
const material = new THREE.ShaderMaterial({
  uniforms,
  vertexShader: `
    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 uColor;
    varying vec2 vUv;

    void main() {
      gl_FragColor = vec4(uColor * vec3(vUv, 1.0), 1.0);
    }
  `
});
```

自定义 `uniform` 和自定义 `attribute` 不会因为 JS 里创建了就自动出现在 GLSL 里；shader 源码里也要写 `uniform` 或 `attribute` 声明。

## uniform

`uniform` 是 JavaScript 到 shader 的参数入口。它对一次 draw call 中的所有顶点和片元相同，适合时间、颜色、分辨率、鼠标、强度、开关、贴图等全局状态。

```js
const uniforms = {
  uTime: { value: 0 },
  uColor: { value: new THREE.Color('#2f83d8') },
  uResolution: { value: new THREE.Vector2(1, 1) }
};
```

- 改 `uniforms.uTime.value`：下一帧 shader 会读到新时间；不需要 `material.needsUpdate`。
- 改 `Color` / `Vector2`：优先复用对象并调用 `.set(...)`，避免每帧创建临时对象。
- 改画布尺寸：同步 renderer 和 camera 后，把 drawing buffer 尺寸写入 `uResolution`，片元阶段才能按像素比例计算。
- 改鼠标位置：把 pointer 坐标转成 `0..1` 或 NDC 后写入 uniform，shader 只负责按同一坐标系使用它。

`uniform` 适合“所有点都知道同一个值”。如果每个顶点都要不同，就用 `attribute`。

## attribute

`attribute` 是每个顶点自己的数据。three.js 的 `BufferGeometry` 用命名 `BufferAttribute` 保存它们；shader 用同名 `attribute` 读取。

```js
geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
geometry.setAttribute('aTint', new THREE.BufferAttribute(tints, 3));
```

- `itemSize` 决定每个顶点读几个数字；`float` 用 `1`，`vec2` 用 `2`，`vec3` 用 `3`。
- attribute 的 `count` 要和 `position.count` 对齐；否则顶点数据会错位或渲染异常。
- 改 TypedArray 后设置 `attribute.needsUpdate = true`，让 GPU 缓冲重新上传。
- 内置 `position`、`normal`、`uv` 也是 attribute；自定义 attribute 适合每点大小、每顶点颜色、随机种子、实例外观等。

`attribute` 只在 vertex shader 中直接读取。fragment shader 想使用每顶点数据时，要先在 vertex shader 写进 `varying`。

## varying

`varying` 是顶点阶段到片元阶段的插值通道。vertex shader 在三角形三个顶点上写值；光栅化时，GPU 会把这些值按片元位置插值；fragment shader 读到的是插值后的结果。

```text
attribute / 内置顶点数据
  vertex shader 读取并计算
        ↓
varying
  每个顶点写一次
        ↓
三角形内部自动插值
        ↓
fragment shader
  每个片元读取插值值
```

常见用法：

- `vUv`：把 `uv` 传给片元阶段，用于纹理采样或 2D 渐变。
- `vNormal`：把法线或变换后的法线传给片元阶段，用于方向着色。
- `vHeight`：把顶点形变后的高度传给片元阶段，用颜色显示波峰波谷。
- `vTint`：把自定义顶点颜色传给片元阶段，形成平滑颜色过渡。

`varying` 会插值，所以它适合连续渐变。若想表达每个三角形完全不插值的离散值，需要更进阶的 flat 插值、拆顶点或换数据组织方式。

## 阶段分工

vertex shader 负责“点在哪里”，fragment shader 负责“像素是什么颜色”。很多视觉效果其实是两阶段配合出来的。

| 阶段 | 输入 | 必须输出 | 适合做什么 |
| --- | --- | --- | --- |
| vertex shader | attribute、uniform、矩阵、少量纹理 | `gl_Position` | 顶点形变、点大小、传递 varying、坐标空间转换 |
| fragment shader | uniform、varying、纹理采样、内置片元状态 | `gl_FragColor` | 颜色、透明、边缘、噪声、渐变、贴图混合 |

顶点阶段只能在已有顶点上移动位置。几何分段不够时，波浪、弯曲和位移会显得很硬；这时先增加 `PlaneGeometry` 等几何体的分段，再判断 shader 公式。

片元阶段不能改变真实几何轮廓，但可以改变颜色和透明。圆形点云常用 `gl_PointCoord` 在片元阶段把方形点裁成圆点。

## RawShaderMaterial

`RawShaderMaterial` 更接近底层 WebGL：three.js 不会替你把常见内置变量声明预置到 shader 源码里。它适合理解边界和迁移底层 shader，不是入门默认。

| 材质 | 内置声明 | 入门判断 |
| --- | --- | --- |
| `ShaderMaterial` | 自动接入常用 attribute、uniform、precision 和 shader chunk 前缀 | 默认用它写 three.js 自定义材质 |
| `RawShaderMaterial` | 需要手动声明 `attribute vec3 position;`、矩阵 uniform、precision 等 | 需要完全控制 GLSL 边界时再用 |

Raw 顶点 shader 至少要自己声明位置和矩阵：

```glsl
precision mediump float;

attribute vec3 position;
attribute vec2 uv;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
```

如果 Raw 版本少声明了 `position`、`modelViewMatrix` 或 `projectionMatrix`，常见结果是 shader 编译失败，控制台会出现 GLSL 报错。

## onBeforeCompile

`material.onBeforeCompile` 可以在内置材质编译前修改 shader 源码，适合只想微调 `MeshStandardMaterial`、`MeshPhongMaterial` 等内置材质的一小段逻辑。

- 优点：保留内置材质的光照、PBR、贴图、fog、skinning、morph target 等能力。
- 代价：依赖 three.js 内部 shader chunk 名称和源码结构，升级版本时维护成本更高。
- 判断：想完全自定义外观，先用 `ShaderMaterial`；想在 PBR 上加一点顶点摆动或颜色修饰，再考虑 `onBeforeCompile`。

`onBeforeCompile` 不是本课默认示例入口，因为它的重点是“修改已有材质生成代码”，不是 shader 最小心智模型。

## 调试方法

shader 调试先把中间量变成颜色。不要一上来写复杂公式；每次只确认一个数据源。

- 先输出固定色：确认材质、Mesh、相机和渲染循环正常。
- 输出 `vUv`：`gl_FragColor = vec4(vUv, 0.0, 1.0);`，确认 UV 和 varying。
- 输出法线：把 `normal * 0.5 + 0.5` 传到片元阶段，确认方向数据。
- 输出时间：用 `sin(uTime)` 改颜色，确认 JS 每帧更新 uniform。
- 输出 NDC 或分辨率：用 `gl_FragCoord.xy / uResolution` 检查像素坐标和尺寸。
- 输出自定义 attribute：先传到 `varying` 并显示颜色，再做复杂计算。

编译错误优先看浏览器控制台里的 shader log。常见线索是变量未声明、类型不匹配、`vec3` / `float` 混用、缺少分号、RawShaderMaterial 少写 precision 或矩阵声明。

## 常见判断

| 现象 / 需求 | 先看哪里 | 判断 |
| --- | --- | --- |
| 画面全黑 | fragment shader 固定色 | 先确认 Mesh、相机、材质和渲染循环，不急着查公式 |
| 控件改了没变化 | uniform `.value` | 改 uniform 值不需要 `needsUpdate`，但必须写到正确 uniform 对象 |
| 点或面数据错乱 | attribute `itemSize` / `count` | 自定义 attribute 条目数要和 position 对齐 |
| 动态 attribute 没更新 | `attribute.needsUpdate` | 改 TypedArray 后要标记重新上传 |
| 顶点波浪太硬 | geometry 分段 | vertex shader 只能移动已有顶点 |
| fragment 读不到 attribute | `varying` | attribute 先在 vertex shader 读取，再通过 varying 传给 fragment |
| Raw 版本编译失败 | 变量声明和 precision | RawShaderMaterial 需要自己声明更多内置变量 |
| 内置材质只想小改 | `onBeforeCompile` | 可以微调，但要接受升级维护成本 |

## 记忆句

先让 shader 输出看得懂的颜色，再让公式变复杂；先确认数据从 JS 到 uniform、从 geometry 到 attribute、从 vertex 到 varying。

`ShaderMaterial` 适合入门自定义外观，`RawShaderMaterial` 适合理解边界，`onBeforeCompile` 适合谨慎改造内置材质。

## 参考示例

- uniform
  - [uniform 控制颜色、时间、分辨率和指针](src/scenes/uniform-color-scene.js)

- 阶段分工
  - [vertex shader 波浪形变](src/scenes/vertex-displacement-scene.js)
  - [varying 插值渐变](src/scenes/varying-gradient-scene.js)

- attribute
  - [BufferGeometry 自定义 attribute](src/scenes/custom-attribute-scene.js)

- 边界
  - [ShaderMaterial / RawShaderMaterial 对照](src/scenes/raw-material-boundary-scene.js)

## 参考资料

- [ShaderMaterial docs](https://threejs.org/docs/pages/ShaderMaterial.html)
- [RawShaderMaterial docs](https://threejs.org/docs/pages/RawShaderMaterial.html)
- [Uniform docs](https://threejs.org/docs/pages/Uniform.html)
- [BufferGeometry docs](https://threejs.org/docs/#api/en/core/BufferGeometry)
- [BufferAttribute docs](https://threejs.org/docs/#api/en/core/BufferAttribute)
- [Material.onBeforeCompile docs](https://threejs.org/docs/pages/Material.html#onBeforeCompile)
- [three.js Manual: Custom BufferGeometry](https://threejs.org/manual/#en/custom-buffergeometry)
- [three.js Manual: How to update things](https://threejs.org/manual/#en/how-to-update-things)
