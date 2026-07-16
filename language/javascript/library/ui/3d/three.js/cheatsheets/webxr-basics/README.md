# WebXR

WebXR 是浏览器把 VR/AR 设备、空间追踪、输入控制器和沉浸式帧循环交给页面的接口；在 three.js 里，入口集中在 `renderer.xr`、`VRButton`、`setAnimationLoop` 和 controller 对象上。

本课只做 VR 入门。示例会检测 `immersive-vr`，但不要求真实头显；没有 WebXR 支持时，页面继续渲染普通 WebGL 对照场景，并把 fallback 状态显示出来。

## 接入链路

three.js 已经把底层 `XRSession`、`XRFrame`、左右眼相机和 WebGL framebuffer 封装进 `WebXRManager`。应用代码通常保留同一个 `scene` 和业务相机，把 renderer 切到 XR-ready 状态，然后让 `VRButton` 处理进入/退出 session 的用户手势。

```text
浏览器能力和安全条件
  secure context / navigator.xr / immersive-vr
        ↓
renderer.xr.enabled = true
  WebGLRenderer 准备让 WebXRManager 接管 XR 渲染
        ↓
VRButton.createButton(renderer)
  在用户点击时请求 immersive-vr session
        ↓
renderer.setAnimationLoop(callback)
  普通 canvas 下由窗口帧驱动；XR 中由 XR runtime 帧驱动
        ↓
renderer.xr.getController(index)
  target ray 空间，适合指向、拾取、UI 射线
        ↓
renderer.xr.getControllerGrip(index)
  grip 空间，适合挂真实手柄模型
```

## 能力检测

WebXR 不是“导入 three.js 就能用”。进入 VR 前至少要过三道门槛：

- `window.isSecureContext`：多数 WebXR 能力只在 HTTPS 或 localhost 等安全上下文可用。
- `navigator.xr`：浏览器暴露 WebXR Device API 时才存在。
- `navigator.xr.isSessionSupported('immersive-vr')`：当前浏览器、设备、权限和平台组合是否支持 VR session。

`isSessionSupported(...)` 返回 Promise。它可能 resolve 为 `false`，也可能因为权限策略、设备不可用或浏览器限制 reject，所以示例里把“不支持”和“检测失败”分开显示。

## renderer.xr 和 VRButton

`renderer.xr` 是 `WebGLRenderer` 上的 `WebXRManager`。启用 VR 前先写：

```js
renderer.xr.enabled = true;
renderer.xr.setReferenceSpaceType('local-floor');
```

- `enabled`：告诉 renderer 准备 XR 渲染；默认是 `false`。
- `setReferenceSpaceType('local-floor')`：让空间原点更接近站立 VR 的地面参考；要在 session 开始前设置。
- `VRButton.createButton(renderer)`：创建一个 DOM 按钮。支持时按钮请求 `immersive-vr`；不支持时按钮显示不可进入或提示状态。

`VRButton` 只是 session 入口，不是 3D 内容本身。它应该放在页面 UI 边界里；canvas fallback、能力提示和普通 DOM 控件仍然由应用自己负责。

## XR 渲染循环

XR 下不要只用自己手写的 `requestAnimationFrame` 循环。three.js 官方建议用：

```js
renderer.setAnimationLoop((time, xrFrame) => {
  update(time, xrFrame);
  renderer.render(scene, camera);
});
```

同一个 callback 会覆盖两种情况：

| 状态 | 帧来源 | 相机和输出 |
| --- | --- | --- |
| 普通 canvas | 浏览器窗口帧 | 你传入的 camera 和 canvas drawing buffer |
| XR session | XR runtime 帧 | runtime 提供左右眼视图，three.js 用内部 XR camera 渲染到 XR framebuffer |

暂停或释放时调用 `renderer.setAnimationLoop(null)`。如果页面只是静态预览，可以在非 XR fallback 里做按需渲染；一旦进入 XR，通常要让 XR runtime 持续驱动画面和追踪。

## 相机和尺寸

非 XR 页面里，尺寸同步仍然来自容器：

- `renderer.setSize(width, height, false)` 同步 drawing buffer。
- `camera.aspect = width / height` 后调用 `camera.updateProjectionMatrix()`。
- `renderer.setPixelRatio(...)` 控制清晰度和 GPU 成本。

进入 XR session 后，显示尺寸、左右眼投影、视口和 framebuffer 由 XR runtime 接管。此时不要在每帧强行按 DOM 容器改 XR 输出尺寸；普通相机仍可作为“进入 XR 前的场景视角”和 three.js 更新 XR camera 的参考。

## Controller 和 Grip

WebXR 输入源常有两套空间。three.js 把它们拆成两个 `Group`：

| three.js 对象 | 对应空间 | 适合挂什么 |
| --- | --- | --- |
| `renderer.xr.getController(index)` | target ray | 射线、准星、激光指针、UI 命中反馈 |
| `renderer.xr.getControllerGrip(index)` | grip | 手柄模型、手部持有物、工具模型 |

`XRControllerModelFactory` 应挂在 grip 上：

```js
const factory = new XRControllerModelFactory();
const grip = renderer.xr.getControllerGrip(0);
grip.add(factory.createControllerModel(grip));
scene.add(grip);
```

target ray 和 grip 不是同一个姿态。把手柄模型挂到 `getController(...)` 上，模型方向经常会不自然；把射线挂到 `getControllerGrip(...)` 上，指向任务又可能偏离设备的目标射线。

## Controller 射线和 Raycaster

XR controller 的拾取仍然可以沿用 Raycaster 心智模型，只是射线来源从“屏幕 NDC + camera”变成“controller 世界矩阵 + -Z 方向”。

```text
controller matrixWorld
  读取 target ray 的世界位置和方向
        ↓
raycaster.ray.origin
  来自 controller 世界位置
        ↓
raycaster.ray.direction
  取 controller 本地 -Z，乘世界旋转矩阵
        ↓
raycaster.intersectObjects(targets, false)
  命中最近的可交互对象
```

常见输入事件：

- `connected` / `disconnected`：控制器接入或移除，可读取 handedness、profiles、targetRayMode。
- `selectstart` / `selectend`：主选择动作，常用于点击、抓取开始和确认。
- `squeezestart` / `squeezeend`：握压动作，常用于抓握、工具模式或备用交互。

没有 XR 设备时，可以用一个普通 `Group` 模拟 controller：给它挂一条 Line 当射线，再用同一套 Raycaster 和事件处理函数观察状态变化。

## 生命周期和 fallback

WebXR 页面要把真实 session 和普通页面生命周期放在一起管理：

```text
mount
  创建 renderer / scene / camera / controller / DOM button
  renderer.xr.enabled = true
  renderer.setAnimationLoop(render)
        ↓
enter session
  VRButton 通过用户手势请求 immersive-vr
  XR runtime 接管帧、相机、视口和输入源
        ↓
exit session
  session end 事件触发，画面回到普通 canvas fallback
        ↓
pause / unmount
  setAnimationLoop(null)
  移除事件监听
  dispose geometry / material / texture / renderer
```

fallback 不是错误页。WebXR 不可用时，仍然可以显示普通 3D 场景、能力检测结果、模拟控制器输入和部署提示；这能让开发机、桌面浏览器和 CI 构建都保持可用。

## 部署判断

- 开发：`localhost` 通常算 secure context；局域网 IP 给 Quest 或手机访问时常需要 HTTPS。
- 移动端和 Quest：浏览器、系统版本、用户授权、设备模式都会影响 `immersive-vr`。
- 权限策略：嵌入 iframe 时要检查 `xr-spatial-tracking` 等权限策略。
- 资源路径：控制器模型、贴图和 glTF 仍受部署路径影响；Vite 多页面构建建议使用相对 `base: './'`。
- 性能：XR 比普通 canvas 更敏感；减少 draw calls、纹理尺寸、后处理成本，并在退出时释放资源。

## 常见判断

| 现象 / 需求 | 先看哪里 | 判断 |
| --- | --- | --- |
| 页面没有 VR 入口 | `window.isSecureContext`、`navigator.xr` | 可能不是 HTTPS/localhost，或浏览器没有 WebXR |
| `isSessionSupported` reject | 权限策略、设备权限、浏览器限制 | 捕获错误并显示 fallback，不要让页面白屏 |
| VRButton 可见但进不去 | `immersive-vr` 支持和设备状态 | 可能没有头显、浏览器不支持，或用户授权失败 |
| 普通页面能动，头显里不更新 | `renderer.setAnimationLoop` | XR 中必须让 renderer 接入 XR runtime 帧循环 |
| 进入 XR 后画布尺寸读数怪 | XR runtime 接管 | 不要用 DOM canvas 尺寸推断头显左右眼 framebuffer |
| 控制器模型方向不对 | `getControllerGrip` | 手柄模型挂 grip，射线挂 controller |
| 控制器射线打不中 | 射线方向和目标列表 | 从 controller 本地 -Z 生成世界射线，只检测可交互对象 |
| 退出页面后显存上涨 | `setAnimationLoop(null)` 和 `dispose()` | 停循环、移监听、释放 geometry/material/texture/renderer |

## 记忆句

先检测能力，再启用 `renderer.xr`，用 `VRButton` 进入 session，用 `setAnimationLoop` 交给 XR runtime。

controller 负责射线，grip 负责手柄模型；WebXR 不可用时，fallback 也应该是可观察的普通 3D 页面。

## 参考示例

- 能力检测
  - [secure context / navigator.xr / immersive-vr](src/scenes/session-check-scene.js)

- XR 入口和循环
  - [VRButton / renderer.xr.enabled / setAnimationLoop](src/scenes/vr-button-loop-scene.js)

- 控制器输入
  - [controller / grip / model / select / squeeze](src/scenes/controller-input-scene.js)

- 生命周期
  - [session start/end / pause / dispose](src/scenes/xr-lifecycle-scene.js)

## 参考资料

- [WebXRManager docs](https://threejs.org/docs/pages/WebXRManager.html)
- [WebGLRenderer docs](https://threejs.org/docs/pages/WebGLRenderer.html)
- [VRButton docs](https://threejs.org/docs/pages/VRButton.html)
- [XRControllerModelFactory docs](https://threejs.org/docs/pages/XRControllerModelFactory.html)
- [MDN WebXR Device API](https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API)
- [MDN XRSystem.isSessionSupported](https://developer.mozilla.org/en-US/docs/Web/API/XRSystem/isSessionSupported)
- [MDN Starting up and shutting down a WebXR session](https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API/Startup_and_shutdown)
- [MDN Rendering and the WebXR frame animation callback](https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API/Rendering)
- [MDN Inputs and input sources](https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API/Inputs)
