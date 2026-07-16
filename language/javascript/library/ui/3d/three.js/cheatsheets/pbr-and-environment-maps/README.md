# PBR

`PBR` 是基于物理的材质渲染：材质用颜色、金属度和粗糙度描述表面，环境贴图给这些表面提供来自四周的光照和反射来源。

一句话记住：

> `MeshStandardMaterial` 决定表面性质，`scene.environment` 决定 PBR 从周围采样什么光，color management 决定这些颜色最后怎样显示到屏幕。

## 渲染链路

PBR 不是单独一个材质开关。它需要材质参数、几何法线、灯光、环境贴图和 renderer 输出共同成立。

```text
颜色 / 贴图 / 数据贴图
  提供基础色或参数值
        ↓
MeshStandardMaterial / MeshPhysicalMaterial
  用 color / metalness / roughness / clearcoat / transmission 描述表面
        ↓
Light + scene.environment
  直接光给方向，环境贴图给周围反射和间接光
        ↓
renderer.outputColorSpace + toneMapping + exposure
  把线性渲染结果转换成屏幕颜色
```

`scene.background` 只决定画布背后显示什么；`scene.environment` 才会被 PBR 材质用来计算环境光照和反射。两者可以使用同一张纹理，也可以完全不同。

## Standard 表面

`MeshStandardMaterial` 是 three.js 中最常用的 PBR 材质，核心参数先看三项：

- `color`：基础颜色，也会和 `map` 采样结果相乘；非金属表面更接近这个颜色。
- `metalness`：金属度，范围 `0` 到 `1`；金属更依赖环境反射，基础色更像反射颜色。
- `roughness`：粗糙度，范围 `0` 到 `1`；越低高光越集中，越高反射越发散。

这三个数值通常可以运行时直接更新，不需要 `material.needsUpdate`。如果切换的是是否使用某个贴图槽、透明路径或 shader 分支，才需要考虑 `material.needsUpdate`。

```js
const material = new THREE.MeshStandardMaterial({
  color: '#2f83d8',
  metalness: 0.2,
  roughness: 0.45
});
```

## 环境贴图

PBR 的金属、高光和玻璃效果非常依赖环境。没有 `scene.environment` 时，金属表面常会显得发黑，因为它没有可反射的周围世界。

- `scene.environment`：给所有支持环境光照的物理材质提供默认环境贴图。
- `PMREMGenerator`：把普通环境来源预过滤成 PBR 可用的不同粗糙度反射级别。
- `RoomEnvironment`：three.js 内置的轻量房间环境，适合不准备外部 HDR 图片时做 PBR 示例和模型查看器默认环境。
- `material.envMapIntensity`：单个材质读取环境贴图的强度；调试环境贡献时很方便。

```js
const pmrem = new THREE.PMREMGenerator(renderer);
const room = new RoomEnvironment();
const environment = pmrem.fromScene(room).texture;

scene.environment = environment;
```

`PMREMGenerator.fromScene(...)` 生成的纹理要在不用时 `dispose()`；`RoomEnvironment` 和 `PMREMGenerator` 本身也要释放。

## Color Management

three.js 的 PBR 计算在线性空间里进行，输入和输出要分清“颜色”与“数据”。

| 对象 | 常用设置 | 判断 |
| --- | --- | --- |
| `renderer.outputColorSpace` | `THREE.SRGBColorSpace` | 浏览器屏幕输出通常用 sRGB |
| `renderer.toneMapping` | `THREE.ACESFilmicToneMapping` 或 `THREE.NoToneMapping` | 有高亮压缩需求时开启 tone mapping |
| `renderer.toneMappingExposure` | `1` 附近调节 | 改整体曝光，不改变材质参数 |
| `material.map.colorSpace` | `THREE.SRGBColorSpace` | 基础颜色贴图是颜色 |
| `emissiveMap.colorSpace` | `THREE.SRGBColorSpace` | 自发光贴图也是颜色 |
| `roughnessMap.colorSpace` | `THREE.NoColorSpace` | 通道值是参数数据 |
| `metalnessMap.colorSpace` | `THREE.NoColorSpace` | 通道值是参数数据 |
| `normalMap.colorSpace` | `THREE.NoColorSpace` | RGB 表示法线方向，不是颜色 |
| `alphaMap.colorSpace` | `THREE.NoColorSpace` | 灰度值控制透明度 |

改 `texture.colorSpace` 后要设置 `texture.needsUpdate = true`，因为纹理上传和采样解释已经变化。改 `toneMappingExposure` 属于 renderer 状态，通常可以直接观察到画面亮度变化。

## Physical 进阶

`MeshPhysicalMaterial` 继承 `MeshStandardMaterial` 的 PBR 基础，再增加更细的物理表层。普通真实感模型先用 Standard；遇到车漆、清漆、玻璃、薄透明材质时再看 Physical。

- `clearcoat`：额外清漆层强度，像在原材质外面盖一层亮面涂层。
- `clearcoatRoughness`：清漆层自己的粗糙度；越低越像光滑亮漆。
- `transmission`：透光程度，适合玻璃、透明塑料一类仍有反射的材质。
- `thickness`：透光材质的厚度感；配合 `transmission` 观察背景透过物体时的变化。
- `ior`：折射率，玻璃常在 `1.4` 到 `1.6` 附近；本课只作为固定参数观察。

`transmission` 不是简单的 `opacity`。`opacity` 更像透明混合，`transmission` 仍按物理材质处理透光、反射和粗糙度。

## 常见判断

| 现象 / 需求 | 先看哪里 | 判断 |
| --- | --- | --- |
| 金属物体发黑 | `scene.environment` | 金属需要环境反射，只靠直接光常不够 |
| 背景变了但反射没变 | `scene.background` / `scene.environment` | 背景和环境是两个状态 |
| 颜色偏灰或偏亮 | `map.colorSpace`、`renderer.outputColorSpace` | 颜色贴图用 sRGB，输出通常也用 sRGB |
| 粗糙度贴图效果怪 | `roughnessMap.colorSpace` | 数据贴图保留 `NoColorSpace` |
| 整体过曝或太暗 | `toneMappingExposure` | 先调曝光，再判断材质参数 |
| 想做车漆或玻璃 | `MeshPhysicalMaterial` | Standard 不够时再加 clearcoat 或 transmission |

## 记忆句

PBR 先问表面是什么，再问周围有什么，最后问颜色怎样输出。

颜色贴图进 sRGB，数据贴图进 NoColorSpace；背景负责“看见什么”，环境负责“反射什么”。

## 参考示例

- PBR 参数
  - [MeshStandardMaterial](src/scenes/standard-material-scene.js)

- 环境贴图
  - [scene.environment / scene.background](src/scenes/environment-map-scene.js)

- 颜色管理
  - [Color Space / Tone Mapping](src/scenes/color-management-scene.js)

- 进阶材质
  - [MeshPhysicalMaterial](src/scenes/physical-material-scene.js)

## 参考资料

- [MeshStandardMaterial docs](https://threejs.org/docs/pages/MeshStandardMaterial.html)
- [MeshPhysicalMaterial docs](https://threejs.org/docs/pages/MeshPhysicalMaterial.html)
- [Scene docs](https://threejs.org/docs/#api/en/scenes/Scene)
- [PMREMGenerator docs](https://threejs.org/docs/pages/PMREMGenerator.html)
- [RoomEnvironment docs](https://threejs.org/docs/pages/RoomEnvironment.html)
- [WebGLRenderer docs](https://threejs.org/docs/pages/WebGLRenderer.html)
- [Texture docs](https://threejs.org/docs/pages/Texture.html)
