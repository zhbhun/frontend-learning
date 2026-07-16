# Object3D：变换与层级

`Object3D` 是 three.js 的空间节点：负责位置、旋转、缩放和父子层级。

一句话记住：

> `Object3D` 管“怎么摆”，`geometry` 管“什么形状”，`material` 管“表面长什么样”。

## 概念定位

| 对象 | 是否可见 | 作用 |
| --- | --- | --- |
| `Object3D` | 不可见 | 空间节点、旋转中心、容器 |
| `Group` | 不可见 | 语义更明确的分组节点 |
| `Mesh` | 可见 | `geometry` + `material` + `Object3D` |
| `Camera` | 不可见 | 也是可以移动、旋转的 `Object3D` |
| `Scene` | 不可见 | 整棵对象树的根节点 |

空的 `Object3D` 不会渲染任何东西，但它很有用：可以当容器、旋转中心、局部坐标系。

## 核心属性

| 属性 | 含义 | 默认值 |
| --- | --- | --- |
| `position` | 相对父节点的位置 | `(0, 0, 0)` |
| `rotation` | 相对自身局部轴的旋转 | `(0, 0, 0)` |
| `scale` | 相对原始尺寸的缩放 | `(1, 1, 1)` |

```js
object.position.set(2, 1, 0);
object.rotation.y = THREE.MathUtils.degToRad(45);
object.scale.setScalar(1.5);
```

注意：`rotation` 使用弧度，不是角度。界面上如果显示角度，传给 three.js 前通常要转换：

```js
THREE.MathUtils.degToRad(degrees);
```

## 父子层级

```js
parent.add(child);
```

含义：`child` 进入 `parent` 的局部坐标系。

之后再写：

```js
child.position.set(2, 0, 0);
```

这个 `2` 不是“世界坐标里的 x = 2”，而是“在 `parent` 的局部 X 方向偏移 2”。

父节点变化会影响子节点：

| 父节点变化 | 子节点结果 |
| --- | --- |
| `parent.position` | 子节点跟着移动 |
| `parent.rotation` | 子节点绕父节点原点旋转 |
| `parent.scale` | 子节点位置距离和尺寸一起缩放 |

## Local 和 World

| 概念 | 含义 |
| --- | --- |
| local position | 对象相对父节点的位置 |
| world position | 叠加所有父级变换后的最终位置 |

读取世界位置：

```js
const worldPosition = object.getWorldPosition(new THREE.Vector3());
```

坐标转换：

```js
object.localToWorld(vector);
object.worldToLocal(vector);
```

调试位置时，先问一句：这个数是 local，还是 world？

## 尺寸判断

空的 `Object3D` / `Group` 没有可见尺寸。

可见对象的原始尺寸来自 `geometry`：

```js
new THREE.BoxGeometry(1.2, 0.35, 0.7);
```

最终世界尺寸会叠加对象和父节点的缩放：

```txt
geometry 原始尺寸
× object.scale
× parent.scale
× 更上层父节点的 scale
```

读取世界包围盒：

```js
const box = new THREE.Box3().setFromObject(object);
const size = box.getSize(new THREE.Vector3());
```

注意：`Box3().setFromObject(object)` 得到的是世界轴对齐包围盒。对象旋转后，包围盒会按世界 X/Y/Z 重新包住它。

## 常用方法

| 方法 | 用途 |
| --- | --- |
| `add(child)` | 添加子节点 |
| `remove(child)` | 移除子节点 |
| `getWorldPosition(v)` | 读取世界位置 |
| `getWorldScale(v)` | 读取世界缩放 |
| `lookAt(target)` | 朝向世界中的某个点 |
| `localToWorld(v)` | 局部坐标转世界坐标 |
| `worldToLocal(v)` | 世界坐标转局部坐标 |

## 记忆句

`Object3D` 不负责长相，负责空间关系。

看到 `add()`，就要想到：子对象进入父对象的局部世界。

## 参考示例

先创建一个不可见的父节点：

```js
const parent = new THREE.Object3D();
scene.add(parent);
```

给父节点挂一个可见的盒子：

```js
const parentMesh = new THREE.Mesh(
  new THREE.BoxGeometry(1.2, 0.35, 0.7),
  new THREE.MeshNormalMaterial({ flatShading: true })
);

parent.add(parentMesh);
```

再创建一个子节点。它的位置是相对 `parent` 的：

```js
const child = new THREE.Object3D();
child.position.set(2.2, 0.6, 0);
parent.add(child);
```

给子节点挂一个可见的球：

```js
const childMesh = new THREE.Mesh(
  new THREE.SphereGeometry(0.36, 24, 16),
  new THREE.MeshNormalMaterial({ flatShading: true })
);

child.add(childMesh);
```

页面控件会修改这些值：

```js
parent.rotation.y = THREE.MathUtils.degToRad(parentRotation);
parent.scale.setScalar(parentScale);

child.position.x = childOffsetX;
child.position.y = childOffsetY;
```

观察重点：

- 父对象旋转时，子对象绕 `parent` 原点转动。
- 父对象缩放时，子对象的位置距离和尺寸一起变化。
- 子对象的 `position` 仍然是 local position。
- `getWorldPosition(...)` 读到的是叠加父级变换后的 world position。

## 参考资料

- [Object3D docs](https://threejs.org/docs/#api/en/core/Object3D)
- [Mesh docs](https://threejs.org/docs/#api/en/objects/Mesh)
- [Box3 docs](https://threejs.org/docs/#api/en/math/Box3)
- [Group docs](https://threejs.org/docs/#api/en/objects/Group)
- [AxesHelper docs](https://threejs.org/docs/#api/en/helpers/AxesHelper)
- [three.js Manual: Scenegraph](https://threejs.org/manual/#en/scenegraph)
