# Group

`Group` 是语义更清晰的 `Object3D` 容器：它自己不画形状，负责把多个对象收进同一个局部坐标系。

一句话记住：

> `Group` 不负责长相，负责让一组对象共享一个原点、一套变换和一棵子树。

## 概念定位

| 对象 | 是否可见 | 作用 |
| --- | --- | --- |
| `Object3D` | 不可见 | 空间节点、父子层级、局部/世界变换 |
| `Group` | 不可见 | 语义明确的对象组，适合组织一组子对象 |
| `Mesh` | 可见 | 把 `geometry` 和 `material` 画出来 |
| `Scene` | 不可见 | 整棵场景树的根 |

`Group` 几乎就是一个专门命名的 `Object3D`。它的好处不是能力更多，而是代码读起来更清楚：

```js
const vehicle = new THREE.Group();
vehicle.name = 'vehicle';

vehicle.add(body, cabin, wheels);
scene.add(vehicle);
```

## 父子层级

| API / 属性 | 含义 | 观察方式 |
| --- | --- | --- |
| `group.add(child)` | 把子对象放进 group 的局部坐标系 | `child.parent` 变成 `group` |
| `group.remove(child)` | 把子对象移出 group | 子对象不再跟随 group 变换 |
| `group.children` | 直接子级数组 | 只看第一层，不递归 |
| `group.traverse(fn)` | 从 group 自己开始递归整棵子树 | 统计、批量开关、调试层级 |
| `group.name` | 给节点命名 | 配合 `getObjectByName(...)` 和调试 |
| `group.isGroup` | 类型标记 | 区分 `Group` 和普通 `Object3D` |

同一个对象同一时间只能有一个父节点。把对象 `add()` 到新的 group 时，它会从旧父节点移走。

## 整组变换

`Group` 的 `position`、`rotation`、`scale` 会作用到整棵子树：

```js
vehicle.position.x = groupX;
vehicle.rotation.y = THREE.MathUtils.degToRad(rotationY);
vehicle.scale.setScalar(groupScale);
```

| 改 group | 子对象结果 | 子对象局部值 |
| --- | --- | --- |
| `group.position` | 整组移动 | `child.position` 不变 |
| `group.rotation` | 子对象绕 group 原点旋转 | `child.rotation` 不变 |
| `group.scale` | 子对象位置距离和尺寸一起缩放 | `child.scale` 不变 |

调试时先问：这个对象的位置是相对 group 的 local position，还是叠加父级后的 world position？

## Local 和 World

```js
const localX = body.position.x;
const worldPosition = body.getWorldPosition(new THREE.Vector3());
```

| 概念 | 含义 |
| --- | --- |
| local position | 对象相对父节点的位置 |
| world position | 叠加 group、scene 中所有父级变换后的最终位置 |
| local axes | group 自己的 X/Y/Z 方向 |
| world axes | 场景整体的 X/Y/Z 方向 |

`Group` 旋转后，子对象的 local X 轴也会跟着转。子对象 `position.x = 1` 表示沿父 group 的局部 X 方向偏移，不一定等于世界 X 增加 1。

## Pivot

`Group` 的原点就是整组旋转和缩放的 pivot。

```js
const pivotGroup = new THREE.Group();
scene.add(pivotGroup);

panel.position.x = 1.2;
pivotGroup.add(panel);

pivotGroup.rotation.y = THREE.MathUtils.degToRad(openAngle);
```

| 想要的效果 | 做法 |
| --- | --- |
| 对象绕自身中心转 | 让 Mesh 原点在自身中心，直接转 Mesh |
| 对象绕边缘转 | 建 group 放在边缘，Mesh 偏移到 group 原点一侧 |
| 多个对象整体转 | 把对象都放进同一个 group，再转 group |
| 改 pivot 位置 | 移动 group 原点，重新设置子对象局部偏移 |

门、机械臂、仪表指针、太阳系轨道、角色手持物都常用这种“空 group 当 pivot”的方法。

## 常用判断

| 现象 | 先检查 |
| --- | --- |
| 子对象位置不符合预期 | `child.position` 是相对哪个父节点 |
| 整组旋转中心不对 | group 原点是不是放在想要的 pivot |
| `children.length` 比预期少 | 它只统计直接子级，不递归 |
| 对象被 add 后从旧位置消失 | 同一个对象被移动到了新的父节点 |
| 想批量隐藏一组对象 | 可以改 `group.visible` |
| 想批量设置材质或阴影 | 用 `group.traverse(...)` 过滤 `isMesh` |

## 记忆句

`Group` 是“局部坐标系 + 子对象列表”的语义化容器。

想让一组对象共享移动、旋转、缩放或 pivot，就先把它们放进同一个 `Group`。

## 参考示例

`group-container.html` 观察 group 如何组织多个对象：

```js
const vehicle = new THREE.Group();
vehicle.name = 'vehicle';

vehicle.add(body, cabin, wheels);
scene.add(vehicle);

vehicle.position.x = groupX;
vehicle.rotation.y = THREE.MathUtils.degToRad(rotationY);
vehicle.scale.setScalar(groupScale);
```

观察重点：

- 改“位置 X”会移动整辆车，车身的局部 X 读数仍为 `0`。
- 改“旋转 Y”会让车身、车厢、车轮一起绕 group 原点旋转。
- 改“缩放”会让子对象尺寸和彼此距离一起变化。
- `children` 只数直接子级；`traverse` 会数 group 自己和更深层的车轮。

`pivot-local-space.html` 观察 group 原点如何决定旋转中心：

```js
const pivotGroup = new THREE.Group();
scene.add(pivotGroup);

panel.position.x = panelOffset;
pivotGroup.add(panel, hinge, axes);

pivotGroup.rotation.y = THREE.MathUtils.degToRad(openAngle);
```

观察重点：

- `panel.position.x` 是相对 pivot group 的局部偏移。
- “打开角度”旋转的是 group，所以面板绕 group 原点转。
- “面板偏移”越大，面板离 pivot 越远，旋转半径越大。
- “pivot X”移动整个 pivot group，面板局部偏移不变，世界位置会变。

## 参考资料

- [Group docs](https://threejs.org/docs/#api/en/objects/Group)
- [Object3D docs](https://threejs.org/docs/#api/en/core/Object3D)
- [Scene docs](https://threejs.org/docs/#api/en/scenes/Scene)
- [three.js Manual: Scenegraph](https://threejs.org/manual/#en/scenegraph)
