# 相机

相机是 three.js 场景的观察者：`renderer.render(scene, camera)` 用它的位置、朝向和投影矩阵，把三维对象投到二维 canvas。

一句话记住：

> `Object3D` 决定相机在哪里看，投影参数决定它怎样把三维空间压到屏幕上。

## 概念定位

| 对象 | 作用 | 适合场景 |
| --- | --- | --- |
| `Camera` | 相机基类，不直接使用 | 理解相机也是 `Object3D` |
| `PerspectiveCamera` | 透视投影，近大远小 | 默认 3D 场景、模型查看器、游戏视角 |
| `OrthographicCamera` | 正交投影，远近不改变尺寸 | 编辑器视图、2D/等距视图、尺寸对比 |
| `OrbitControls` | 把鼠标和触控输入转换成相机围绕目标点观察 | 模型查看器、调试场景、学习示例 |

相机可以放进 `scene`，但渲染时仍然要单独传给 renderer：

```js
renderer.render(scene, camera);
```

## 位置和朝向

相机继承 `Object3D`，所以位置、旋转、父子层级和 `lookAt(...)` 都是同一套空间规则。

```js
camera.position.set(4, 2, 6);
camera.lookAt(0, 0.7, 0);
```

| 属性 / 方法 | 含义 | 常见判断 |
| --- | --- | --- |
| `camera.position` | 相机在父节点局部空间中的位置 | 相机离目标越远，透视下物体越小 |
| `camera.lookAt(target)` | 让相机朝向世界坐标中的点 | 修改位置后常要重新调用 |
| `camera.up` | 相机认为哪个方向是“上” | 默认 `(0, 1, 0)` |
| `camera.projectionMatrix` | 投影矩阵 | 修改投影参数后由 `updateProjectionMatrix()` 更新 |

## 透视相机

```js
const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 40);
```

| 参数 | 含义 | 影响 |
| --- | --- | --- |
| `fov` | 垂直视野角，单位是度 | 越大越广角，画面边缘透视感越强 |
| `aspect` | 画布宽高比 | 通常是 `width / height`，尺寸变化后要更新 |
| `near` | 近裁剪面 | 小于等于 0 无效；太大时近处物体会被切掉 |
| `far` | 远裁剪面 | 必须大于 `near`；太小时远处物体会消失 |
| `zoom` | 投影缩放 | 越大越像拉近，但不改变相机位置 |

响应式尺寸变化时，透视相机至少更新 `aspect`：

```js
camera.aspect = width / height;
camera.updateProjectionMatrix();
```

## 正交相机

```js
const camera = new THREE.OrthographicCamera(left, right, top, bottom, near, far);
```

正交相机先定义一个观察盒，再把盒子里的内容压到屏幕上。物体远近不改变屏幕大小，只影响是否被 `near/far` 裁剪。

| 参数 | 含义 | 影响 |
| --- | --- | --- |
| `left` / `right` | 观察盒左右边界 | 决定可见宽度 |
| `top` / `bottom` | 观察盒上下边界 | 决定可见高度 |
| `near` / `far` | 可见深度范围 | 控制前后裁剪 |
| `zoom` | 缩放观察盒 | 越大看到的范围越小，物体越大 |

响应式页面通常先定观察盒高度，再用画布比例推导宽度：

```js
const aspect = width / height;
const halfHeight = viewHeight / 2;
const halfWidth = halfHeight * aspect;

camera.left = -halfWidth;
camera.right = halfWidth;
camera.top = halfHeight;
camera.bottom = -halfHeight;
camera.updateProjectionMatrix();
```

## 更新投影

修改这些属性后，要调用 `camera.updateProjectionMatrix()`：

| 相机 | 需要更新的属性 |
| --- | --- |
| `PerspectiveCamera` | `fov`、`aspect`、`near`、`far`、`zoom`、`filmGauge`、`filmOffset` |
| `OrthographicCamera` | `left`、`right`、`top`、`bottom`、`near`、`far`、`zoom` |

只改 `position`、`rotation` 或 `lookAt(...)` 不需要 `updateProjectionMatrix()`，因为那是相机的空间变换，不是投影配置。

## OrbitControls

```js
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0.7, 0);
controls.enableDamping = true;

function render() {
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(render);
}
```

| 属性 / 方法 | 含义 | 影响 |
| --- | --- | --- |
| `target` | 环绕、缩放、平移时关注的中心点 | 改变后要 `controls.update()` |
| `enableDamping` | 是否启用惯性阻尼 | 开启后每帧都要 `controls.update()` |
| `autoRotate` | 是否自动绕目标旋转 | 开启后每帧都要 `controls.update()` |
| `minDistance` / `maxDistance` | 透视相机可缩放距离范围 | 限制滚轮或触控缩放 |
| `minZoom` / `maxZoom` | 正交相机 zoom 范围 | 限制正交缩放 |
| `enablePan` | 是否允许平移目标点 | 关闭后更像固定模型查看器 |
| `dispose()` | 移除事件监听 | 页面卸载或销毁示例时调用 |

## 常用判断

| 现象 | 先检查 |
| --- | --- |
| 画面被拉伸 | `camera.aspect` 是否等于 canvas 宽高比 |
| 改了 `fov` 没变化 | 是否调用 `updateProjectionMatrix()` |
| 近处物体被切掉 | `near` 是否太大 |
| 远处物体消失 | `far` 是否太小 |
| 正交相机远近大小不变 | 这是正交投影的预期行为 |
| OrbitControls 阻尼不生效 | 是否每帧调用 `controls.update()` |
| 控制器围绕奇怪的点转 | `controls.target` 是否是想看的中心 |

## 记忆句

透视相机像眼睛，正交相机像量尺。

相机移动管“从哪里看”，投影参数管“怎么看到屏幕上”。

## 参考示例

`perspective.html` 观察透视相机：

```js
const camera = new THREE.PerspectiveCamera(state.fov, 1, state.near, state.far);

camera.fov = state.fov;
camera.aspect = width / height;
camera.near = state.near;
camera.far = state.far;
camera.updateProjectionMatrix();
```

观察重点：

- `fov` 越大，能看到的范围更广，远近透视感更强。
- `distance` 变大时，物体在屏幕上变小。
- `near` 太大时，靠近相机的内容会被裁掉。
- `far` 太小时，远处物体会直接消失。

`orthographic.html` 观察正交相机：

```js
const camera = new THREE.OrthographicCamera(-3, 3, 3, -3, 0.1, 40);

camera.left = -halfWidth;
camera.right = halfWidth;
camera.top = halfHeight;
camera.bottom = -halfHeight;
camera.zoom = state.zoom;
camera.updateProjectionMatrix();
```

观察重点：

- 改 `distance` 时，物体屏幕大小基本不变。
- `viewHeight` 越大，观察盒越大，物体看起来越小。
- `zoom` 越大，可见范围越小，物体看起来越大。

`orbit-controls.html` 观察控制器：

```js
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.copy(target);
controls.enableDamping = true;
controls.minDistance = 3;
controls.maxDistance = 16;

controls.update();
```

观察重点：

- 拖拽会改变相机位置和朝向，但场景对象不动。
- `target` 改变后，相机围绕新的中心观察。
- 开启阻尼或自动旋转时，`controls.update()` 必须留在 render loop 里。
- `minDistance/maxDistance` 限制透视相机缩放距离。

## 参考资料

- [Camera docs](https://threejs.org/docs/#api/en/cameras/Camera)
- [PerspectiveCamera docs](https://threejs.org/docs/#api/en/cameras/PerspectiveCamera)
- [OrthographicCamera docs](https://threejs.org/docs/#api/en/cameras/OrthographicCamera)
- [OrbitControls docs](https://threejs.org/docs/#examples/en/controls/OrbitControls)
- [three.js Manual: Cameras](https://threejs.org/manual/#en/cameras)
