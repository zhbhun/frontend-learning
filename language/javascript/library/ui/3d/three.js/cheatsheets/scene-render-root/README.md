# Scene

`Scene` 是 three.js 的场景根对象：它是一棵 `Object3D` 树的入口，也是 `renderer.render(scene, camera)` 的第一个参数。

一句话记住：

> renderer 只渲染传入的那棵 `scene` 树；背景、环境和雾效是 `Scene` 上的场景级状态。

## 概念定位

| 对象 | 作用 | 和 `Scene` 的关系 |
| --- | --- | --- |
| `Scene` | 场景根、渲染入口、场景级状态 | 传给 `renderer.render(scene, camera)` |
| `Object3D` | 位置、旋转、缩放、父子层级 | `Scene` 继承它，所以也有 `add()`、`remove()`、`children` |
| `Group` | 组织一组对象 | 通常作为 `scene` 的子节点 |
| `Mesh` / `Light` / `Helper` | 可见物、光源、调试对象 | 直接或间接挂到 `scene` 下才会参与渲染 |
| `Camera` | 观察这棵树的视角 | 可以放进 `scene`，但渲染时仍要单独传给 renderer |

## 渲染入口

```js
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);

renderer.render(scene, camera);
```

`renderer.render(scene, camera)` 会从 `scene` 开始收集可见对象、光源、背景、雾效和材质状态，再用 `camera` 的视角画到 canvas。

没有挂进 `scene` 或 `scene` 子层级的对象仍然存在于内存里，但不会出现在这次渲染结果中。

## 场景树

| API | 含义 | 观察方式 |
| --- | --- | --- |
| `scene.add(object)` | 把对象挂到场景根或子树里 | `object.parent` 变成 `scene` |
| `scene.remove(object)` | 从场景树移除对象 | 对象不再参与这棵树的渲染 |
| `scene.children` | `scene` 的直接子级数组 | 只数第一层，不递归 |
| `scene.traverse(callback)` | 从 `scene` 自己开始递归遍历整棵树 | 适合统计、批量设置或调试 |
| `object.parent` | 对象当前父节点 | 同一对象同一时间只能有一个父节点 |

复杂项目不要把所有对象直接塞到 `scene` 第一层。常见做法是先建 `Group`，再把一组相关对象挂进去：

```js
const modelRoot = new THREE.Group();
modelRoot.name = 'modelRoot';

modelRoot.add(mesh, helper);
scene.add(modelRoot);
```

## 场景级外观

| 属性 | 含义 | 常见值 |
| --- | --- | --- |
| `scene.background` | canvas 背景 | `null`、`THREE.Color`、`Texture`、天空盒纹理 |
| `scene.environment` | 给物理材质使用的环境贴图 | `Texture`，常配合 PBR 和模型查看器 |
| `scene.fog` | 远处物体混入雾色 | `null`、`THREE.Fog`、`THREE.FogExp2` |
| `scene.overrideMaterial` | 强制整场景使用同一个材质渲染 | 调试深度、法线或特殊渲染时使用 |

`scene.background` 控制画布底色或天空盒；`renderer.setClearColor(...)` 是 renderer 的清屏色。一般课程示例优先用 `scene.background`，因为它跟具体场景绑定。

## 雾效

线性雾用 `THREE.Fog(color, near, far)`：

```js
scene.background = new THREE.Color('#dbeafe');
scene.fog = new THREE.Fog('#dbeafe', 4, 13);
```

| 参数 | 含义 | 影响 |
| --- | --- | --- |
| `color` | 雾的颜色 | 常和背景色一致，远处物体会融进背景 |
| `near` | 开始出现雾的相机距离 | 越小，雾越早出现 |
| `far` | 雾达到最浓的相机距离 | 越小，远处物体越快被雾色吞没 |

雾效按“物体到当前相机的距离”计算，不是按对象的世界坐标 `z` 直接计算。材质如果关闭 `fog` 支持，就不会受 `scene.fog` 影响。

## 常用判断

| 问题 | 先检查 |
| --- | --- |
| 对象为什么不显示 | 是否挂到了当前渲染的 `scene` 树里 |
| 光为什么没效果 | 光源是否在 `scene` 里，材质是否受光 |
| 背景为什么不是预期颜色 | `scene.background` 和 renderer 清屏色谁在生效 |
| 雾为什么看不出来 | `near/far` 是否离相机太远，背景色和雾色是否差异太小 |
| 遍历数量为什么比直接子级多 | `traverse()` 会递归，`children` 只看第一层 |

## 记忆句

`Scene` 是“这一帧要画哪棵树”的根。

对象的位置归 `Object3D`，对象是否进入画面先看它有没有挂到当前 `scene`。

## 参考示例

`scene-root.html` 只观察根容器和对象挂载：

```js
const scene = new THREE.Scene();
scene.background = new THREE.Color('#eef2f6');

scene.add(grid, ambient);
scene.add(cube, sphere, axes, keyLight);

scene.remove(cube);

scene.traverse((object) => {
  if (object.isMesh) meshes += 1;
  if (object.isLight) lights += 1;
});

renderer.render(scene, camera);
```

观察重点：

- 取消“立方体”后，`scene.children` 和 `Mesh` 数量都会变化。
- `remove(cube)` 不会销毁 `cube`，再次 `add(cube)` 可以重新显示。
- `traverse()` 的总数会包含 `scene` 自己、直接子级和更深层对象。

`background-fog.html` 只观察背景和线性雾：

```js
scene.background = new THREE.Color(state.background);
scene.fog = state.fog ? new THREE.Fog(state.background, state.near, far) : null;

renderer.render(scene, camera);
```

观察重点：

- 背景色改变时，远处雾色也跟着改变，因为示例让二者使用同一个颜色。
- `near` 变小，近处物体更早开始变淡。
- `far` 变小，远处方块更快融入背景。
- 关闭雾效后，同一排方块只剩透视远近变化，不再被雾色混合。

## 参考资料

- [Scene docs](https://threejs.org/docs/#api/en/scenes/Scene)
- [Object3D docs](https://threejs.org/docs/#api/en/core/Object3D)
- [Fog docs](https://threejs.org/docs/#api/en/scenes/Fog)
- [FogExp2 docs](https://threejs.org/docs/#api/en/scenes/FogExp2)
- [three.js Manual: Scenegraph](https://threejs.org/manual/#en/scenegraph)
