# 调试

`three.js` 调试链路是把不可见状态分层看见：用 Helper 定位空间，用 `lil-gui` 改运行参数，用 `stats.js` 和 `renderer.info` 看渲染成本，用 `console` 固化证据，最后用最小复现隔离变量。

一句话记住：

> 调试不是多加工具，而是每次只改变一个状态，并立刻找到对应的画面、读数或日志证据。

## 调试链路

画面异常时先确认“对象在不在、相机看不看得到、材质和光照是否可见”，再看帧率和渲染读数。不要一开始就改一堆参数；每次只让一个工具回答一个问题。

```text
Helper
  看空间方向、尺寸、视锥、光源方向
        ↓
lil-gui
  在运行时改材质、光照、对象参数
        ↓
stats.js / renderer.info
  看 FPS、draw calls、triangles、textures、programs
        ↓
console.group / console.table
  记录对象树、包围盒、材质和关键状态
        ↓
Minimal Repro
  去掉无关代码，只保留一个可观察问题
```

## Helper 组织

Helper 是调试层，通常不要和业务对象逻辑混在一起。多数全局 Helper 可以放进一个 `debugGroup`，统一开关和移除；需要继承目标局部变换的 `AxesHelper` 可以挂在目标下面，但仍用统一引用管理显示状态。

- `debugGroup.visible`：适合开发期整体开关；对象仍在场景树中。
- `scene.remove(debugGroup)`：适合彻底移出调试层；长期不用时还要释放几何和材质。
- `BoxHelper.update()`：目标对象变换、缩放或子树变化后需要主动刷新。
- `CameraHelper.update()`：相机投影参数改变后，先 `camera.updateProjectionMatrix()`，再刷新 helper。
- `DirectionalLightHelper.update()`：光源位置、颜色或 `light.target` 变化后刷新；`light.target` 本身也要加入场景树。

Helper 的读数意义要清楚：`BoxHelper` 是世界轴对齐包围盒，不会斜着贴合旋转物体；`CameraHelper` 画的是被调试相机，不是当前渲染相机。

## 调参面板

`lil-gui` 适合临时把运行时状态暴露出来。面板里的值最好写回一个明确的调试状态对象，再同步到 three.js 对象；这样日志、UI 和画面能对上。

- 材质颜色：用 `material.color.set(value)`，颜色立刻影响下一帧。
- `roughness` / `metalness`：影响 `MeshStandardMaterial` 对光和环境的响应。
- `wireframe`：适合检查几何分段和面数。
- `flatShading`：会改变 shader 分支，修改后设置 `material.needsUpdate = true`。
- 光照强度：写回 `light.intensity`，受光材质才会明显变化。
- 对象变换：写回 `position`、`rotation`、`scale`；如果有包围盒 helper，别忘记更新 helper。

调参面板不应该成为业务状态来源。调试结束后，把真正需要保留的数值写回代码或配置，把临时面板移除。

## 帧率和 renderer.info

`stats.js` 看每秒帧数和单帧耗时，适合回答“动起来是否变慢”。`renderer.info` 看这一帧提交给 WebGL 的对象数量和资源数量，适合回答“慢在哪里开始变贵”。

- `renderer.info.render.calls`：draw calls 数量；大量独立 mesh、材质切换和透明排序都可能推高。
- `renderer.info.render.triangles`：这一帧提交的三角形数；几何分段和模型细节会影响它。
- `renderer.info.memory.geometries`：当前 WebGL 几何资源数量；切换对象后持续上涨通常说明没有释放。
- `renderer.info.memory.textures`：当前纹理资源数量；贴图切换、环境贴图和渲染目标都可能增加。
- `renderer.info.programs.length`：已编译 shader program 数；材质类型、贴图开关、灯光和渲染状态会生成不同变体。

`renderer.info` 是渲染后的读数。先 `renderer.render(scene, camera)`，再读取本帧的 `render.calls` 和 `render.triangles`，否则容易读到旧值或空值。

## 控制台检查

控制台适合把“我以为”变成“我看到”。不要只 `console.log(object)`；展开对象时浏览器可能显示的是后来的状态。更稳的方式是把关键值拍平成普通对象。

```js
console.groupCollapsed('mesh 状态');
console.table([
  { key: 'visible', value: mesh.visible },
  { key: 'material', value: mesh.material.type },
  { key: 'position', value: mesh.position.toArray().join(', ') }
]);
console.groupEnd();
```

- `console.groupCollapsed(...)`：把一次检查收起来，避免日志散乱。
- `console.table(...)`：对比对象数量、材质参数、包围盒尺寸时更清楚。
- `scene.traverse(...)`：统计场景树节点、mesh、light、helper 和材质。
- `Box3.setFromObject(...)`：确认对象真实世界尺寸和中心点。

## 最小复现

最小复现是把问题压成一个可观察单元。它不是重新做项目，而是只保留能证明问题的对象、材质、相机、灯光和一两个读数。

- 先保留正常参照：一个可见 mesh、一个相机、一盏光。
- 每次只删或改一个维度：对象、材质、光照、尺寸、相机、资源路径。
- 把状态打印出来：对象数量、材质类型、包围盒尺寸、相机 near/far。
- 复现稳定后再回到原项目查差异：不要在大项目里继续盲改。

## 常见判断

| 现象 / 需求 | 先看哪里 | 判断 |
| --- | --- | --- |
| 画面空白 | `scene.children`、相机位置、`Box3` | 先确认对象在场景里、尺寸正常、相机看得到 |
| 对象发黑 | 材质类型、灯光、`scene.environment` | `MeshStandardMaterial` 需要光照；`MeshBasicMaterial` 不受光 |
| Helper 没跟着变 | helper 的 `update()` | 变换、投影或光源目标变化后通常要主动刷新 |
| GUI 改了没效果 | 回调是否写回 API | 面板值只是调试状态，必须同步到 material、light 或 object |
| 开启某个选项后卡顿 | `stats.js` 和 `renderer.info.render.calls` | FPS 下降时同时看 draw calls、triangles 和资源数量 |
| 对象数量越切越多 | dispose 流程 | 旧 geometry、material、texture 没释放会让 memory 读数上涨 |
| program 数量变多 | 材质和渲染状态变体 | 贴图、灯光、wireframe、flatShading 等会触发 shader 变体 |
| 日志看起来前后矛盾 | 是否拍平数据 | 展开 live object 可能看到后来的状态，用普通对象或数组记录快照 |

## 记忆句

Helper 问“在哪里”，GUI 问“改哪个状态”，stats 和 `renderer.info` 问“成本是多少”，console 问“证据是什么”，最小复现问“只剩一个变量时还会不会错”。

## 参考示例

- 调参面板
  - [lil-gui 调材质、光照和对象参数](src/scenes/debug-panel-scene.js)

- 渲染读数
  - [renderer.info 和 stats.js](src/scenes/renderer-info-scene.js)

- Helper 组织
  - [Helper 开关与 update 时机](src/scenes/helper-toggle-scene.js)

- 最小复现
  - [空场景、材质错误和尺寸错误](src/scenes/minimal-repro-scene.js)

## 参考资料

- [WebGLRenderer docs](https://threejs.org/docs/pages/WebGLRenderer.html)
- [Material docs](https://threejs.org/docs/#api/en/materials/Material)
- [Object3D docs](https://threejs.org/docs/#api/en/core/Object3D)
- [BoxHelper docs](https://threejs.org/docs/#api/en/helpers/BoxHelper)
- [CameraHelper docs](https://threejs.org/docs/#api/en/helpers/CameraHelper)
- [DirectionalLightHelper docs](https://threejs.org/docs/#api/en/helpers/DirectionalLightHelper)
- [lil-gui Guide](https://lil-gui.georgealways.com/)
- [stats.js](https://github.com/mrdoob/stats.js/)
