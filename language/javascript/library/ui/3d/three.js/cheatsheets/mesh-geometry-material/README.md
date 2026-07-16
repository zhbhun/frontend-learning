# Mesh

`Mesh` 是 three.js 中最常见的可渲染物体：它把 `geometry` 的形状数据、`material` 的表面规则和 `Object3D` 的空间变换组合在一起。

一句话记住：

> `geometry` 管“有哪些三角形”，`material` 管“这些三角形怎么画”，`Mesh` 管“把这套形状和表面放到场景哪里”。

## 概念定位

| 部件 | 负责什么 | 常见对象 |
| --- | --- | --- |
| `Mesh` | 可渲染对象本体，继承 `Object3D` | `new THREE.Mesh(geometry, material)` |
| `geometry` | 顶点、三角形、法线、UV、颜色等形状数据 | `BoxGeometry`、`SphereGeometry`、`BufferGeometry` |
| `material` | 颜色、光照响应、透明、线框、深度等表面规则 | `MeshStandardMaterial`、`MeshBasicMaterial`、`MeshNormalMaterial` |
| `Object3D` 能力 | 位置、旋转、缩放、父子层级、可见性 | `position`、`rotation`、`scale`、`visible` |

最小写法：

```js
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshStandardMaterial({ color: '#4277d9' });
const mesh = new THREE.Mesh(geometry, material);

scene.add(mesh);
```

## 核心属性

| 属性 | 含义 | 观察方式 |
| --- | --- | --- |
| `mesh.geometry` | 当前形状数据 | 换掉它，物体轮廓会变 |
| `mesh.material` | 当前表面规则 | 换掉它，颜色、明暗、线框、透明会变 |
| `mesh.isMesh` | 类型标记 | `scene.traverse()` 时常用来筛选 Mesh |
| `mesh.position` | 相对父节点的位置 | 来自 `Object3D` |
| `mesh.rotation` | 相对自身局部轴的旋转 | 来自 `Object3D`，单位是弧度 |
| `mesh.scale` | 对几何体最终显示尺寸的缩放 | 来自 `Object3D` |
| `mesh.visible` | 是否参与渲染 | 设为 `false` 后对象还在场景树里，但不显示 |

`Mesh` 自己不生成形状，也不决定表面细节。它只是把 `geometry` 和 `material` 挂到一个可变换节点上。

## Geometry 和 Transform

`geometry` 的尺寸是原始形状数据，`mesh.scale` 是显示时的对象缩放。

```js
const geometry = new THREE.BoxGeometry(1.8, 1.2, 1.1);
const mesh = new THREE.Mesh(geometry, material);

mesh.scale.setScalar(1.5);
mesh.rotation.y = THREE.MathUtils.degToRad(35);
```

| 操作 | 改变什么 | 适合用途 |
| --- | --- | --- |
| 换 `geometry` | 原始顶点和三角形 | 形状本身改变，例如盒子换球 |
| 改 `mesh.scale` | 对整个对象做变换 | 同一个模型临时放大或缩小 |
| 改 `mesh.rotation` | 对整个对象做变换 | 动画、摆放、朝向 |
| `geometry.translate/rotate/scale(...)` | 直接改几何数据 | 一次性校正模型轴心或原点 |

普通动画优先改 `mesh.position/rotation/scale`。直接改 `geometry` 更像“改模型数据”，通常是一次性处理。

## Material 和显示

同一个 `geometry` 可以配不同 `material`，同一个 `material` 也可以给多个 Mesh 共享。

| 材质 | 特点 | 适合观察 |
| --- | --- | --- |
| `MeshStandardMaterial` | 受光照影响，适合 PBR 主线 | 真实项目默认选择之一 |
| `MeshBasicMaterial` | 不受光照影响 | 调试颜色、贴图、UI 面片 |
| `MeshNormalMaterial` | 用法线方向生成颜色 | 快速检查几何方向和表面变化 |
| `material.wireframe` | 只画三角形边线 | 观察几何分段和拓扑 |
| `material.transparent` + `opacity` | 开启透明混合 | 观察透明、深度和排序问题 |

如果用材质数组：

```js
const mesh = new THREE.Mesh(geometry, [redMaterial, blueMaterial]);
```

这时 `geometry.groups` 里的 `materialIndex` 会决定哪一段三角形使用哪个材质。没有分组时，先用单个材质，理解成本最低。

## 运行时替换

`mesh.geometry` 和 `mesh.material` 可以在运行时替换：

```js
const oldGeometry = mesh.geometry;
mesh.geometry = new THREE.SphereGeometry(0.9, 32, 18);
oldGeometry.dispose();

const oldMaterial = mesh.material;
mesh.material = new THREE.MeshNormalMaterial();
oldMaterial.dispose();
```

替换后旧对象不会自动释放 GPU 资源。确定不用时调用 `dispose()`，尤其是频繁换模型、换几何、换材质或切换页面时。

## 常用判断

| 现象 | 先检查 |
| --- | --- |
| 对象不显示 | Mesh 是否 `scene.add(...)`，`visible` 是否为 `true` |
| 有形状但一片黑 | 材质是否需要光照，场景里是否有 Light |
| 形状不对 | `geometry` 构造参数、顶点、索引是否正确 |
| 表面不对 | `material` 类型和选项是否匹配，例如 `wireframe`、`transparent` |
| 尺寸不对 | 先区分 `geometry` 原始尺寸和 `mesh.scale` |
| 替换后内存越来越高 | 旧 `geometry` / `material` 是否 `dispose()` |
| 遍历时只想处理网格 | 用 `object.isMesh` 过滤 |

## 记忆句

`Mesh` 是 `Object3D` 家族里“真的能把三角形画出来”的常用对象。

看到一个 Mesh，先拆成三层看：形状数据、表面规则、空间变换。

## 参考示例

`mesh-parts.html` 观察 `Mesh` 的三个组成部分：

```js
const geometry = new THREE.BoxGeometry(1.8, 1.2, 1.1, 2, 1, 1);
const material = new THREE.MeshStandardMaterial({ color: '#4277d9' });
const mesh = new THREE.Mesh(geometry, material);

mesh.rotation.y = THREE.MathUtils.degToRad(rotation);
mesh.scale.setScalar(scale);
mesh.material.wireframe = wireframe;
```

观察重点：

- 开启“线框材质”后，可以看到 `geometry` 的三角形和分段。
- 开启“法线材质”后，表面颜色来自法线方向，不再是普通颜色。
- 改旋转和缩放只影响 `Mesh` 的 `Object3D` 变换，不会改写 `geometry` 顶点。
- 包围盒读到的是叠加旋转和缩放后的世界轴对齐尺寸。

`replace-parts.html` 观察运行时替换：

```js
const previousGeometry = mesh.geometry;
mesh.geometry = createGeometry(kind);
previousGeometry.dispose();

const previousMaterial = mesh.material;
mesh.material = createMaterial(kind, opacity);
previousMaterial.dispose();
```

观察重点：

- 选择“形状”只替换 `mesh.geometry`，Mesh 的位置和旋转保留。
- 选择“表面”只替换 `mesh.material`，形状顶点不变。
- 透明度小于 `1` 时，材质会开启 `transparent`。
- 替换旧 geometry/material 后立刻 `dispose()`，避免示例反复切换时堆积 GPU 资源。

## 参考资料

- [Mesh docs](https://threejs.org/docs/#api/en/objects/Mesh)
- [BufferGeometry docs](https://threejs.org/docs/#api/en/core/BufferGeometry)
- [Material docs](https://threejs.org/docs/#api/en/materials/Material)
- [MeshStandardMaterial docs](https://threejs.org/docs/#api/en/materials/MeshStandardMaterial)
- [MeshBasicMaterial docs](https://threejs.org/docs/#api/en/materials/MeshBasicMaterial)
- [MeshNormalMaterial docs](https://threejs.org/docs/#api/en/materials/MeshNormalMaterial)
- [Box3 docs](https://threejs.org/docs/#api/en/math/Box3)
- [three.js Manual: Scenegraph](https://threejs.org/manual/#en/scenegraph)
