# 拾取

`Raycaster` 是把屏幕指针变成 3D 射线的对象：它从相机出发，沿指针方向检测哪些 `Object3D` 被射线碰到。

一句话记住：

> 拾取不是直接读鼠标下的像素，而是把 pointer 坐标转成 NDC，再用相机生成一条射线去问对象“有没有被穿过”。

## 交互链路

浏览器给的是 viewport 坐标，three.js 需要的是相机裁剪空间中的标准化设备坐标。`Raycaster` 接住这个二维坐标和相机，计算内部 `ray`，再调用对象自己的 `raycast(...)` 逻辑返回命中结果。

```text
PointerEvent.clientX / clientY
  浏览器视口里的指针位置
        ↓
canvas.getBoundingClientRect()
  换算成 canvas 内部百分比
        ↓
NDC Vector2
  x/y 都落在 -1 到 1
        ↓
raycaster.setFromCamera(pointer, camera)
  用相机生成世界空间射线
        ↓
raycaster.intersectObjects(objects, recursive)
  返回按 distance 从近到远排序的命中列表
```

## 坐标转换

`setFromCamera(...)` 的第一个参数不是像素坐标，而是 NDC。NDC 的中心是 `(0, 0)`，左下接近 `(-1, -1)`，右上接近 `(1, 1)`；浏览器的 `clientY` 向下增加，所以转成 NDC 时要翻转 Y。

```js
const rect = canvas.getBoundingClientRect();
const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
pointer.set(x, y);
```

- `clientX` / `clientY`：相对 viewport 左上角的指针坐标。
- `rect.left` / `rect.top`：canvas 相对 viewport 的位置。
- `rect.width` / `rect.height`：CSS 像素下的 canvas 显示尺寸；通常不要用 drawing buffer 尺寸来算 pointer。
- `pointer`：复用一个 `Vector2` 即可，pointer move 时只更新数值。

## Raycaster 对象关系

`Raycaster` 自己不决定对象怎么被命中。它保存一条射线，然后把检测工作交给目标对象的 `raycast(...)` 方法；所以 `Mesh`、`Line`、`Points`、`Sprite` 的命中细节会不同。

- `raycaster.ray`：当前射线，包含 origin 和 direction。
- `raycaster.setFromCamera(pointer, camera)`：常见屏幕拾取入口，会写入 `raycaster.camera`。
- `raycaster.set(origin, direction)`：手动指定世界空间射线，适合非屏幕指针来源。
- `intersectObject(object, recursive)`：检测单个对象；`recursive` 为 `true` 时检测子树。
- `intersectObjects(objects, recursive)`：检测对象数组，返回所有命中点。
- `near` / `far`：限制命中距离；排查误选远处对象时很有用。

## 命中结果

命中数组按 `distance` 从近到远排序。交互通常先取 `hits[0]`，因为它是射线遇到的第一个对象。

| 字段 | 含义 | 常见用途 |
| --- | --- | --- |
| `object` | 被命中的 `Object3D` | 找业务 id、节点名、材质或父级 |
| `point` | 世界空间命中点 | 放置标记、拖拽平面、读三维位置 |
| `distance` | 射线起点到命中点距离 | 判断最近对象、过滤太远结果 |
| `face` / `faceIndex` | 被命中的三角面信息 | Mesh 表面编辑或调试面朝向 |
| `uv` | 命中点的 UV | 贴图绘制、纹理坐标检查 |
| `normal` | 插值法线 | 放置贴合表面的箭头或法线标记 |
| `instanceId` | `InstancedMesh` 的实例编号 | 选中大量实例中的某一个 |

## Hover 和 Click

Hover 是临时状态，通常在 `pointermove` 中刷新；click / selected 是持久状态，通常在 `click` 或 `pointerup` 中写入业务状态。两者要分开保存，否则移出对象时容易把已选中状态也清掉。

- Hover：每次 pointer move 都重新 raycast；没有命中就恢复上一个 hover 对象。
- Click：只在点击时 raycast；点击空白可以取消选中，也可以保持上次选中，按产品需求决定。
- 高亮：尽量集中在一个函数里写回材质、缩放或 outline，避免 hover 和 selected 互相覆盖。
- 业务对象：把交互 id、默认颜色、是否可选等信息放进 `object.userData`，不要靠显示名称硬猜。

## 可拾取范围

拾取范围由“检测谁”和“怎么检测”共同决定。

- 对象列表：只把真正可交互的对象传给 `intersectObjects(...)`，比全场景递归更可控。
- `recursive`：目标是组或模型根节点时设为 `true`；目标已经是 mesh 列表时设为 `false`。
- `layers`：`raycaster.layers` 可以只检测指定层；相机是否能看到对象由 `camera.layers` 另行决定。
- `params.Line.threshold`：线对象拾取容差，单位是世界单位。
- `params.Points.threshold`：点对象拾取容差，单位是世界单位。
- `material.side`：Mesh 的背面默认不被射线命中；需要双面拾取时把材质设为 `DoubleSide`。

## 常见判断

| 现象 / 需求 | 先看哪里 | 判断 |
| --- | --- | --- |
| 鼠标位置明显偏移 | NDC 公式和 `getBoundingClientRect()` | 用 canvas 显示尺寸和 rect 位置换算，不用窗口尺寸硬算 |
| 页面滚动后拾取错位 | `clientX` / `clientY` 和 rect | 两者都相对 viewport，通常能一起抵消滚动 |
| 只能点到部分面 | `material.side` 和面朝向 | 背面默认不命中，平面或开口模型尤其明显 |
| 点到后面的对象 | `hits[0]`、`distance`、对象列表 | 命中数组已按距离排序，先确认是否取最近结果 |
| 模型根节点点不到 | `recursive` | glTF 常把 mesh 放在子节点里，需要递归检测 |
| 看得见但点不到 | `raycaster.layers`、对象列表 | 可见层和可拾取层是两套过滤 |
| 线或点很难选中 | `raycaster.params.Line/Points.threshold` | 阈值是世界单位，过小会要求指针非常贴近 |

## 记忆句

先算准 NDC，再生成射线，再只检测真正可交互的对象。

Hover 负责“当前指着谁”，click 负责“业务选中谁”；两种状态分开存，画面才稳定。

## 参考示例

- 基础链路
  - [Pointer to NDC](src/scenes/pointer-to-ndc-scene.js)
  - [Hover Highlight](src/scenes/hover-highlight-scene.js)
  - [Click Selection](src/scenes/click-selection-scene.js)

- 过滤与精度
  - [Layers Filter](src/scenes/layers-filter-scene.js)
  - [Line / Points Threshold](src/scenes/line-points-threshold-scene.js)

## 参考资料

- [Raycaster docs](https://threejs.org/docs/pages/Raycaster.html)
- [Vector2 docs](https://threejs.org/docs/pages/Vector2.html)
- [Object3D docs](https://threejs.org/docs/#api/en/core/Object3D)
- [Mesh docs](https://threejs.org/docs/#api/en/objects/Mesh)
- [Line docs](https://threejs.org/docs/#api/en/objects/Line)
- [Points docs](https://threejs.org/docs/#api/en/objects/Points)
- [MDN Pointer Events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events/Using_Pointer_Events)
- [MDN getBoundingClientRect](https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect)
