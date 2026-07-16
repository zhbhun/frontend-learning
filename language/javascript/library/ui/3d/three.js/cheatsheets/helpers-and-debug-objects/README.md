# Helper

`Helper` 是放进场景树里的调试对象：它用线框、网格、视锥、方向线或包围盒，把不可见的空间关系画出来。

一句话记住：

> Helper 负责“看见调试信息”，不负责改变真实几何、相机、光源或业务对象。

## 概念定位

| Helper | 显示什么 | 常见用途 |
| --- | --- | --- |
| `AxesHelper(size)` | 局部 X/Y/Z 轴，X 红、Y 绿、Z 蓝 | 看对象局部方向 |
| `GridHelper(size, divisions)` | 二维网格线 | 看地面尺度、世界单位、对象位置 |
| `BoxHelper(object, color)` | 对象及其子树的世界轴对齐包围盒 | 看尺寸、碰撞范围、拾取范围 |
| `CameraHelper(camera)` | 相机视锥体 | 看 `fov`、`near`、`far`、相机朝向 |
| `DirectionalLightHelper(light, size)` | 方向光位置和目标方向 | 看光源方向、阴影调试前置 |

很多 Helper 本身也是 `Object3D` 或 `LineSegments`，所以可以 `scene.add(...)`、设置 `visible`、参与 `traverse(...)`，也需要在不用时释放 GPU 资源。

## 空间辅助

```js
const grid = new THREE.GridHelper(8, 8);
scene.add(grid);

const target = new THREE.Group();
target.add(mesh);
target.add(new THREE.AxesHelper(1.7));
scene.add(target);

const boxHelper = new THREE.BoxHelper(target, '#d45b3f');
scene.add(boxHelper);
```

| API | 参数 | 影响 |
| --- | --- | --- |
| `AxesHelper(size)` | 坐标轴线段长度 | 挂到对象下面时，显示对象的局部轴 |
| `GridHelper(size, divisions)` | 总尺寸和分段数 | 每格大小是 `size / divisions` |
| `BoxHelper(object, color)` | 目标对象和线框颜色 | 显示世界轴对齐包围盒 |
| `boxHelper.update()` | 无参数 | 目标变换或子树变化后重新计算包围盒 |

`BoxHelper` 显示的是世界轴对齐包围盒。对象旋转后，盒子不会跟着斜，它会按世界 X/Y/Z 重新包住目标。

## 相机和光源辅助

```js
const debugCamera = new THREE.PerspectiveCamera(40, 1, 0.5, 8);
const cameraHelper = new THREE.CameraHelper(debugCamera);
scene.add(cameraHelper);

const light = new THREE.DirectionalLight('#ffffff', 2.2);
light.target.position.set(0, 0.45, 0);
scene.add(light, light.target);

const lightHelper = new THREE.DirectionalLightHelper(light, 0.8);
scene.add(lightHelper);
```

| Helper | 需要更新的情况 | 更新方式 |
| --- | --- | --- |
| `CameraHelper` | 相机位置、朝向、`fov`、`near`、`far`、投影矩阵变化 | `camera.updateProjectionMatrix()` 后 `cameraHelper.update()` |
| `DirectionalLightHelper` | 光源位置、颜色、目标位置变化 | `lightHelper.update()` |

`DirectionalLight` 的方向由 `light.position` 指向 `light.target.position`。如果只移动光源但没有把 `light.target` 加进场景树，方向调试很容易看错。

## 显示和生命周期

| 操作 | 用法 | 说明 |
| --- | --- | --- |
| 临时隐藏 | `helper.visible = false` | Helper 还在场景树里，只是不画 |
| 移出场景 | `scene.remove(helper)` | 不再参与渲染或遍历 |
| 释放资源 | `helper.dispose()` 或释放其几何/材质 | 页面卸载、示例销毁、长期不用时做 |
| 批量开关 | `debugGroup.visible = enabled` | 可以把多个 Helper 放进同一个 Group |

开发期可以多放 Helper，交付前通常要移除、隐藏或放到调试开关后面。

## 常用判断

| 现象 | 先检查 |
| --- | --- |
| 坐标轴方向和预期不同 | `AxesHelper` 是挂在 scene 上还是对象上 |
| 网格尺度不清楚 | `GridHelper(size, divisions)` 的每格大小 |
| 包围盒没有跟着变 | 是否调用 `boxHelper.update()` |
| 包围盒比对象大 | 旋转后的世界轴对齐包围盒会重新包住对象 |
| 相机视锥没变化 | 修改投影参数后是否 `updateProjectionMatrix()` 和 `cameraHelper.update()` |
| 方向光 helper 指向不对 | `light.target` 是否加到场景，目标位置是否更新 |
| 页面切换后资源堆积 | Helper 是否被移除并释放 |

## 记忆句

Helper 是调试层，不是业务层。

看空间方向用 `AxesHelper`，看尺度用 `GridHelper`，看尺寸范围用 `BoxHelper`，看不可见相机和光源状态用对应 Helper。

## 参考示例

- 空间辅助
  - [AxesHelper](src/scenes/axes-helper-scene.js)
  - [GridHelper](src/scenes/grid-helper-scene.js)
  - [BoxHelper](src/scenes/box-helper-scene.js)

- 相机和光源辅助
  - [CameraHelper](src/scenes/camera-helper-scene.js)
  - [DirectionalLightHelper](src/scenes/directional-light-helper-scene.js)

## 参考资料

- [AxesHelper docs](https://threejs.org/docs/#api/en/helpers/AxesHelper)
- [GridHelper docs](https://threejs.org/docs/#api/en/helpers/GridHelper)
- [BoxHelper docs](https://threejs.org/docs/#api/en/helpers/BoxHelper)
- [CameraHelper docs](https://threejs.org/docs/#api/en/helpers/CameraHelper)
- [DirectionalLightHelper docs](https://threejs.org/docs/#api/en/helpers/DirectionalLightHelper)
- [Object3D docs](https://threejs.org/docs/#api/en/core/Object3D)
- [Box3 docs](https://threejs.org/docs/#api/en/math/Box3)
