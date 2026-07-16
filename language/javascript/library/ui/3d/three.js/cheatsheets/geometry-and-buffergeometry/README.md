# 几何

`Geometry` 是网格、线和点的形状数据：内置几何体用构造参数生成顶点，`BufferGeometry` 直接保存顶点属性，`index` 让三角形复用顶点。

一句话记住：

> `Mesh` 负责“拿什么材质画出来”，`Geometry` 负责“有哪些顶点、顶点怎么组成面”。

## 概念定位

| 概念 | 负责什么 | 常见观察方式 |
| --- | --- | --- |
| 内置几何体 | 用构造参数生成常见形状 | 改尺寸、半径、分段，看线框和顶点数量 |
| `BufferGeometry` | 保存顶点属性、索引、包围体和绘制范围 | 查看 `attributes`、`index`、`boundingBox` |
| `BufferAttribute` | 用 TypedArray 存一类顶点数据 | 看 `itemSize`、`count`、`needsUpdate` |
| `index` | 用顶点编号组装三角形 | 比较唯一顶点数和三角形索引数 |
| `normal` | 顶点或面的朝向 | 影响受光、法线调试色和边界平滑 |
| `uv` | 顶点在贴图上的二维坐标 | 纹理课程会重点使用 |

## 内置几何体

内置几何体都继承自 `BufferGeometry`。它们的 `parameters` 记录创建时的构造参数，但创建后直接改 `parameters` 不会重建顶点；要改变形状通常重新创建 geometry。

| 构造器 | 核心参数 | 判断句 |
| --- | --- | --- |
| `BoxGeometry(width, height, depth, widthSegments, heightSegments, depthSegments)` | X/Y/Z 三个尺寸和三个方向的分段 | 分段越多，每个面被切得越细 |
| `SphereGeometry(radius, widthSegments, heightSegments, phiStart, phiLength, thetaStart, thetaLength)` | 半径、水平/垂直分段、水平/垂直扫角 | `widthSegments` 最少 3，`heightSegments` 最少 2 |
| `CylinderGeometry(radiusTop, radiusBottom, height, radialSegments, heightSegments, openEnded)` | 上下半径、高度、环向分段、是否封口 | 上半径为 `0` 时接近圆锥 |
| `PlaneGeometry(width, height, widthSegments, heightSegments)` | 宽高和 X/Y 分段 | 默认在 XY 平面上，是很多贴图和地面示例的基础 |
| `TorusGeometry(radius, tube, radialSegments, tubularSegments, arc)` | 主半径、管道半径、管道分段、环向分段、圆弧 | `tube` 应小于 `radius` |

## BufferGeometry 数据

`BufferGeometry` 不是“一个三角形数组”，而是一组命名顶点属性加可选索引。

| 数据 | 写法 | 含义 |
| --- | --- | --- |
| 顶点位置 | `geometry.setAttribute('position', attribute)` | 必要属性；每个顶点的 `x/y/z` |
| 顶点颜色 | `geometry.setAttribute('color', attribute)` | 配合 `vertexColors: true` 的材质使用 |
| 法线 | `geometry.computeVertexNormals()` | 从顶点和三角形关系推导受光方向 |
| 索引 | `geometry.setIndex([0, 1, 2, ...])` | 每 3 个索引组成一个三角形 |
| 包围盒 | `geometry.computeBoundingBox()` | 得到局部空间的轴对齐包围盒 |
| 包围球 | `geometry.computeBoundingSphere()` | 视锥裁剪、射线检测等会用到 |

```js
const geometry = new THREE.BufferGeometry();
const positions = new Float32Array([
  -1, 0, 0,
  1, 0, 0,
  0, 1.5, 0
]);

geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.computeVertexNormals();
```

## Attribute 读法

`BufferAttribute(array, itemSize)` 把一段连续 TypedArray 切成固定宽度的顶点数据。

| 属性 | 含义 | 例子 |
| --- | --- | --- |
| `array` | 原始连续数据 | `Float32Array` 最常见 |
| `itemSize` | 每个顶点占几个数字 | `position`/`normal` 常用 `3`，`uv` 常用 `2` |
| `count` | 顶点条目数量 | `array.length / itemSize` |
| `needsUpdate` | 标记 CPU 数据已变 | 改 TypedArray 后设为 `true`，让渲染器重新上传 |
| `usage` | 数据更新模式提示 | 初次使用后不能直接改；需要新建 attribute |

```js
const position = geometry.getAttribute('position');
position.set(newPositions);
position.needsUpdate = true;
geometry.computeVertexNormals();
geometry.computeBoundingBox();
```

## Index 和非 Index

没有 `index` 时，渲染器把每 3 个连续 `position` 顶点当作一个三角形；有 `index` 时，每 3 个索引值引用 3 个已有顶点。

| 方式 | 顶点数据 | 适合场景 | 代价 |
| --- | --- | --- | --- |
| 非索引 | 每个三角形直接写 3 个顶点 | 每个面需要独立法线、独立颜色或独立 UV | 重复顶点多 |
| 索引 | 顶点只写一次，三角形写顶点编号 | 拓扑稳定、相邻面能共享数据 | 共享顶点会影响法线和属性分配 |

```js
geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
geometry.setIndex([
  0, 1, 2,
  2, 3, 0
]);
```

## 更新时机

| 改动 | 要做什么 | 原因 |
| --- | --- | --- |
| 改 TypedArray 里的数值 | `attribute.needsUpdate = true` | GPU 端缓冲需要重新上传 |
| 改顶点位置后还要正确受光 | `geometry.computeVertexNormals()` | 法线由面和顶点关系推导 |
| 改顶点位置后要正确测尺寸 | `computeBoundingBox()` / `computeBoundingSphere()` | 包围体不会替你一直同步 |
| 改内置几何体构造参数 | 重新创建 geometry | `parameters` 只是记录，不会反向改顶点 |
| 不再使用 geometry | `geometry.dispose()` | 释放 WebGL 资源 |

## 记忆句

几何体的本质是 buffer：`position` 决定点在哪里，`index` 决定点怎么连成三角形，`normal` 和 `uv` 决定表面如何被光照和贴图理解。

## 参考示例

内置几何体的构造参数不同，所以每个示例入口单独拆开：

```js
new THREE.BoxGeometry(width, height, depth, widthSegments, heightSegments, depthSegments);
new THREE.SphereGeometry(radius, widthSegments, heightSegments, 0, phiLength, 0, thetaLength);
new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSegments, heightSegments, openEnded);
new THREE.PlaneGeometry(width, height, widthSegments, heightSegments);
new THREE.TorusGeometry(radius, tube, radialSegments, tubularSegments, arc);
```

手写顶点数据时先建立 `BufferGeometry`，再写属性和索引：

```js
const geometry = new THREE.BufferGeometry();

geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
geometry.setIndex([0, 1, 2, 2, 3, 0]);
geometry.computeVertexNormals();
```

观察重点：

- `box-geometry.html`：三个方向的分段会增加线框密度和三角形数量。
- `sphere-geometry.html`：水平/垂直分段越低，球越像多面体；扫角小于完整角度时会露出切口。
- `cylinder-geometry.html`：`radiusTop`、`radiusBottom` 和 `openEnded` 决定圆柱、圆台、近似圆锥和开口形态。
- `plane-geometry.html`：平面默认没有厚度，分段只增加表面网格。
- `torus-geometry.html`：`radius` 管整体环大小，`tube` 管截面粗细。
- `buffer-attribute.html`：非索引金字塔用 18 个 `position` 顶点描述 6 个三角形。
- `indexed-geometry.html`：同一个金字塔只保存 5 个唯一顶点，再用 18 个索引描述 6 个三角形。

## 参考资料

- [BoxGeometry docs](https://threejs.org/docs/pages/BoxGeometry.html)
- [SphereGeometry docs](https://threejs.org/docs/pages/SphereGeometry.html)
- [CylinderGeometry docs](https://threejs.org/docs/pages/CylinderGeometry.html)
- [PlaneGeometry docs](https://threejs.org/docs/pages/PlaneGeometry.html)
- [TorusGeometry docs](https://threejs.org/docs/pages/TorusGeometry.html)
- [BufferGeometry docs](https://threejs.org/docs/pages/BufferGeometry.html)
- [BufferAttribute docs](https://threejs.org/docs/pages/BufferAttribute.html)
- [three.js Manual: Custom BufferGeometry](https://threejs.org/manual/#en/custom-buffergeometry)
- [three.js Manual: How to update things](https://threejs.org/manual/#en/how-to-update-things)
