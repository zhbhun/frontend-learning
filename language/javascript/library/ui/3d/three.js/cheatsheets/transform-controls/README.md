# TransformControls

`TransformControls` 是 three.js 的对象变换控制器：它把指针对 gizmo 的拖拽转换为目标 `Object3D` 的 `position`、`rotation` 和 `scale`。

一句话记住：

> `OrbitControls` 改相机，`TransformControls` 改对象；controls 处理输入，`getHelper()` 返回的 gizmo 才加入 Scene。

## 对象关系

`TransformControls` 需要相机判断 gizmo 的朝向和屏幕尺寸，需要 DOM 元素接收 pointer 事件，还需要一个已经位于场景树中的目标对象。它内部修改目标变换，不负责决定“当前选中谁”。

```text
camera + renderer.domElement
  提供观察视角和 pointer 输入
              ↓
TransformControls ── attach(object) ──→ 目标 Object3D
  把拖拽写回 position / rotation / scale
              ↓ getHelper()
gizmo helper
  加入 Scene 后才会被渲染
```

- `TransformControls`：输入控制器和变换状态，不直接作为普通 `Object3D` 加进 Scene。
- `object`：当前 attach 的目标；目标及其父级必须已经位于场景树中。
- `helper`：`getHelper()` 返回的可视 gizmo，需要加入 Scene。
- `OrbitControls`：独立控制相机；和 TransformControls 监听同一个 canvas 时需要协调拖拽状态。
- `Raycaster`：可选的业务选择层，负责从多个对象中决定下一次 `attach(...)` 的目标。

## 创建与挂载

`TransformControls` 是 addon，需要显式导入。先把目标加入场景，再 attach；当前版本通过 `getHelper()` 取得可视对象。

```js
import { TransformControls } from 'three/addons/controls/TransformControls.js';

scene.add(mesh);

const transformControls = new TransformControls(camera, renderer.domElement);
transformControls.attach(mesh);

const helper = transformControls.getHelper();
scene.add(helper);
```

| 操作 | 结果 | 使用时机 |
| --- | --- | --- |
| `attach(object)` | 绑定目标并显示 gizmo | 初始目标、选中对象或切换对象 |
| `detach()` | 清除目标并隐藏 gizmo | 点击空白、删除目标或退出编辑状态 |
| `getHelper()` | 返回可加入 Scene 的 gizmo | 控制器创建后通常只调用一次 |
| `reset()` | 在拖拽仍进行时恢复到本次拖拽起点 | Escape 取消当前手势；不是历史撤销栈 |

不要在每次选择时重新创建 TransformControls。通常只创建一个实例，通过 `attach(...)` 和 `detach()` 切换目标。

## 模式与坐标空间

`setMode(...)` 决定当前修改哪一组 Object3D 变换；`setSpace(...)` 决定平移和旋转 gizmo 按世界方向还是目标局部方向解释。

| 模式 | 写回对象 | 观察方式 |
| --- | --- | --- |
| `translate` | `position` | 拖轴只改一个方向，拖平面同时改两个方向 |
| `rotate` | `quaternion`，并由 `rotation` 反映欧拉角 | 拖彩色圆环绕轴旋转，外圈按视角旋转 |
| `scale` | `scale` | 固定使用 `local` 轴；拖单轴做非均匀缩放，拖中心做整体缩放 |

```js
transformControls.setMode('translate'); // 'rotate' | 'scale'
transformControls.setSpace('world');    // 'local'
```

- `world`：轴保持世界坐标方向；对象已旋转时，轴不会跟着对象转。
- `local`：轴跟随对象局部方向；适合沿模型自身的前后、左右、上下调整。
- `scale` 模式固定按 `local` 轴计算；即使 `space` 属性保存为 `world`，实际 gizmo 和缩放计算仍使用局部方向。
- `size` / `setSize(value)`：改变 gizmo 的屏幕显示尺寸，不改变目标对象尺寸。
- `showX`、`showY`、`showZ`：控制各轴是否可见和可操作。
- `enabled`：关闭后不再响应输入；与 `detach()` 不同，目标引用仍然保留。

## 吸附

三个 snap 值为 `null` 时连续变化，设为数字时按固定步长变化。界面常用一个总开关决定写入步长还是恢复为 `null`。

| 属性 / 方法 | 单位 | 示例 |
| --- | --- | --- |
| `translationSnap` / `setTranslationSnap(...)` | 世界单位 | `0.5` 表示每次落到 0.5 的步长 |
| `rotationSnap` / `setRotationSnap(...)` | 弧度 | `MathUtils.degToRad(15)` 表示 15° |
| `scaleSnap` / `setScaleSnap(...)` | scale 数值 | `0.25` 表示按 0.25 跳动 |

```js
transformControls.setTranslationSnap(0.5);
transformControls.setRotationSnap(THREE.MathUtils.degToRad(15));
transformControls.setScaleSnap(0.25);

// 关闭吸附
transformControls.setTranslationSnap(null);
transformControls.setRotationSnap(null);
transformControls.setScaleSnap(null);
```

吸附只约束本次交互的步长，不会自动替你校正旧数据。旋转吸附必须传弧度，直接传 `15` 会被解释成 15 弧度。

## 事件与渲染

TransformControls 直接修改目标对象。连续 render loop 会自然显示变化；按需渲染则需要在 `change` 事件中重新 render。

| 事件 | 触发含义 | 常见用途 |
| --- | --- | --- |
| `change` | controls 属性、轴状态或对象发生变化 | 按需渲染、刷新通用 UI |
| `objectChange` | attach 的对象变换发生变化 | 更新 position/rotation/scale 读数、记录业务状态 |
| `dragging-changed` | `dragging` 在开始和结束时变化 | 暂停和恢复 OrbitControls |
| `mouseDown` / `mouseUp` | gizmo 手势开始或结束 | 开启事务、保存撤销快照或提交编辑 |

不要在每一帧 `objectChange` 时保存大型模型或重建场景。需要历史记录时，常在 `mouseDown` 保存起点，在 `mouseUp` 提交一次最终状态。

## 与 OrbitControls 协调

两个控制器都监听同一个 canvas。若不协调，拖对象时相机也可能旋转或平移。官方示例使用 `dragging-changed` 临时切换 OrbitControls：

```js
transformControls.addEventListener('dragging-changed', (event) => {
  orbitControls.enabled = !event.value;
});
```

这里的 `event.value` 就是新的 `dragging` 状态。不要永久关闭 OrbitControls，也不要在每个 pointer move 中反复创建控制器。

## 选择并切换对象

TransformControls 一次 attach 一个 `Object3D`。多对象页面通常先用 Raycaster 从明确的 `selectableObjects` 中取最近命中，再把命中对象交给 controls。

```js
function handlePointerDown(event) {
  if (transformControls.axis !== null) return;

  getPointerNdc(event, canvas, pointer);
  raycaster.setFromCamera(pointer, camera);

  const hit = raycaster.intersectObjects(selectableObjects, false)[0] ?? null;

  if (hit) {
    transformControls.attach(hit.object);
  } else {
    transformControls.detach();
  }
}
```

- 选择列表只放业务对象，不把 helper 或整个 Scene 无差别递归检测。
- `axis !== null` 表示 pointer 当前命中 gizmo；这时不重新做业务选择，避免拖手柄时误选后面的 Mesh。
- 点击空白时 `detach()`，并恢复上一个对象的高亮状态。
- glTF 的可选目标如果是模型根节点，需要把 mesh 命中结果映射回业务根节点，再 attach 根节点。
- 多选不是把数组传给 `attach(...)`；需要先建立临时 Group 或编辑 pivot，并处理父子层级与世界变换换算。

## 生命周期

控制器、DOM 监听和场景对象的释放要分开处理：

```js
canvas.removeEventListener('pointerdown', handlePointerDown);
transformControls.detach();
scene.remove(helper);
transformControls.dispose();
orbitControls.dispose();
```

- `dispose()`：移除 TransformControls 自己注册的输入监听并释放 gizmo 资源。
- 自己注册的 Raycaster pointer 监听仍需自己移除。
- helper 要从 Scene 移除，目标几何和材质按普通 Object3D 资源规则释放。
- 替换相机时要同步更新 `transformControls.camera` 和 OrbitControls 使用的相机。

## 常见判断

| 现象 / 需求 | 先看哪里 | 判断 |
| --- | --- | --- |
| gizmo 不显示 | `getHelper()` 和 `scene.add(helper)` | attach 目标之外，还要把 helper 加入 Scene |
| attach 后报父级矩阵错误 | 目标是否已在场景树中 | 先 `scene.add(object)`，再 `attach(object)` |
| 拖对象时相机也在动 | `dragging-changed` | 拖拽期间关闭 OrbitControls，结束后恢复 |
| local 与 world 看不出差别 | 目标是否已有旋转 | 未旋转对象的局部轴与世界轴可能重合 |
| scale 时空间选择器固定为 local | 当前 `mode` | 这是 TransformControls 的实现规则，scale 不使用 world 轴 |
| 旋转吸附角度异常 | `rotationSnap` 单位 | 使用弧度，角度值先 `degToRad(...)` |
| 拖 gizmo 时切到了别的对象 | 选择 handler 的 `axis` 判断 | gizmo 手势期间不要执行场景 Raycaster 选择 |
| 点击空白 gizmo 仍在 | 是否调用 `detach()` | 业务选中状态和 controls 目标要一起清除 |
| `reset()` 没有撤回上一次编辑 | 调用时是否仍在 dragging | 它只重置当前手势，不提供跨手势 undo |

## 记忆句

先选对象，再 attach；pointer 操作 gizmo，controls 写回 Object3D，helper 只负责显示。

同一 canvas 上对象和相机各有一个 controls，`dragging-changed` 是它们避免抢输入的交接点。

## 参考示例

- [TransformControls](src/scenes/transform-controls-scene.js)
- [Select and Transform](src/scenes/select-and-transform-scene.js)

## 参考资料

- [TransformControls docs](https://threejs.org/docs/pages/TransformControls.html)
- [TransformControls official example](https://threejs.org/examples/misc_controls_transform.html)
- [TransformControls source](https://github.com/mrdoob/three.js/blob/dev/examples/jsm/controls/TransformControls.js)
- [OrbitControls docs](https://threejs.org/docs/#examples/en/controls/OrbitControls)
- [Raycaster docs](https://threejs.org/docs/pages/Raycaster.html)
- [Object3D docs](https://threejs.org/docs/#api/en/core/Object3D)
