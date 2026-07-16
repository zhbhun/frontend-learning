# 查看器

`Model Viewer` 是把模型加载、自动取景、相机控制、光照环境、加载状态和尺寸响应组合起来的最小 3D 查看流程。

一句话记住：

> 查看器不是只把 `gltf.scene` 加进场景，而是加载后立刻让模型“可见、可转、可恢复、可释放”。

## 对象链路

查看器的主线从模型 URL 开始，到用户能稳定观察模型结束。每一环都接住上一环留下的状态。

```text
模型 URL
  指向 .glb 或 .gltf 主文件
        ↓
LoadingManager + GLTFLoader
  记录开始、进度、完成和失败
        ↓
gltf.scene
  作为 Object3D 根节点进入 viewer scene
        ↓
Box3.setFromObject(...)
  读取世界尺寸和中心点
        ↓
camera.position + controls.target
  把相机放到合适距离，并围绕模型中心观察
        ↓
灯光 / scene.environment / renderer
  让 PBR 材质有明暗、反射和正确颜色输出
        ↓
render loop + resize
  每帧更新 controls，尺寸变化时更新 renderer 和相机投影
```

## 最小组成

- `WebGLRenderer`：创建 canvas 渲染器，设置像素比、`outputColorSpace`、tone mapping 和背景清理色。
- `Scene`：承载模型、灯光、辅助网格和可选环境贴图；查看器通常给它一个稳定背景色。
- `PerspectiveCamera`：默认适合模型查看；画布尺寸变化时更新 `aspect` 并调用 `updateProjectionMatrix()`。
- `OrbitControls`：把鼠标和触控输入转换成围绕 `target` 的观察；开启阻尼后每帧调用 `controls.update()`。
- `GLTFLoader`：把模型 URL 解析成 `gltf.scene`；复杂模型还可能带来贴图、动画、相机和扩展解码依赖。
- `LoadingManager`：统一收集资源开始、进度、完成和错误；适合驱动页面上的加载状态。
- `Box3`：按世界变换计算模型包围盒；查看器用它自动设置相机距离和控制器目标点。

## 自动取景

自动取景先用 `Box3` 得到模型中心和最大尺寸，再根据相机 `fov` 推出一个能看完整体的距离。模型加载、替换、缩放或选择子节点以后，都可以重新取景。

```js
object.updateWorldMatrix(true, true);

const box = new THREE.Box3().setFromObject(object, true);
const center = box.getCenter(new THREE.Vector3());
const size = box.getSize(new THREE.Vector3());
const maxSize = Math.max(size.x, size.y, size.z);

const fov = THREE.MathUtils.degToRad(camera.fov);
const distance = (maxSize * fitRatio) / (2 * Math.tan(fov / 2));

camera.position.copy(center).addScaledVector(viewDirection, distance);
controls.target.copy(center);
camera.updateProjectionMatrix();
controls.update();
```

- `updateWorldMatrix(true, true)`：确保父子层级的世界矩阵已经刷新，避免包围盒读到旧位置。
- `fitRatio`：给模型留边距；数值越大，模型在画面里越小。
- `viewDirection`：相机从哪个方向看模型；常用斜上方方向让三维体积更明显。
- `near/far`：取景后按距离更新，避免近裁剪切掉模型或远裁剪让模型消失。
- `controls.target`：必须放到模型中心附近，否则 OrbitControls 会围绕错误的点旋转。

## 加载状态

查看器需要把“空白画布”变成可解释状态。最少区分这几种状态：

| 状态 | 触发位置 | 页面应该显示 |
| --- | --- | --- |
| 等待 | 还没有请求模型 | 当前模型来源或占位物 |
| 加载中 | 调用 `loader.loadAsync(url)` 后 | 模型名、进度、按钮禁用 |
| 进度 | `LoadingManager.onProgress` | 当前 URL 和 loaded/total |
| 完成 | `loadAsync` resolved | 模型统计、尺寸、相机状态 |
| 失败 | `loadAsync` rejected 或 `manager.onError` | 失败 URL、错误信息、重试入口 |

切换模型时加一个递增的 `loadToken`。旧请求晚回来时，如果 token 已经过期，就释放旧结果而不是把它重新加回 scene。

## 光照与环境

glTF 常用 PBR 材质，只靠环境光或只靠一盏强光都容易看起来单薄。查看器常用一个稳定组合：

- `HemisphereLight` 给整体漫反射基础亮度。
- `DirectionalLight` 给模型一个明确主光方向，让形体有层次。
- `scene.environment` 给 PBR 材质反射和环境光来源；示例用 `RoomEnvironment` 生成轻量环境贴图。
- `renderer.outputColorSpace = THREE.SRGBColorSpace` 让颜色输出匹配浏览器显示。
- `renderer.toneMapping` 和 `toneMappingExposure` 控制高亮压缩和整体曝光。

环境贴图不是背景图。`scene.background` 决定画布后面显示什么，`scene.environment` 决定 PBR 材质从周围环境采样什么。

## 尺寸响应

canvas 的 CSS 尺寸和 drawing buffer 尺寸是两件事。查看器每帧或在 resize 事件里读取容器尺寸，然后同步：

- `renderer.setSize(width, height, false)`：更新 drawing buffer，不让 renderer 覆盖 CSS 尺寸。
- `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))`：限制高分屏成本。
- `camera.aspect = width / height`：透视相机按当前画布比例投影。
- `camera.updateProjectionMatrix()`：投影参数变更后必须调用。

## 替换和释放

模型切换时，旧模型要先从 scene 移除，再释放树里的 GPU 资源。

- `geometry.dispose()` 释放几何 buffer。
- `material.dispose()` 释放材质相关 GPU 状态。
- `texture.dispose()` 释放纹理；如果图片是 `ImageBitmap` 且提供 `close()`，一起关闭。
- `controls.dispose()` 移除 DOM 事件监听。
- 环境贴图、helper 和临时材质也要在页面销毁时释放。

## 常见判断

| 现象 / 需求 | 先看哪里 | 判断 |
| --- | --- | --- |
| 模型加载成功但看不到 | `Box3` 尺寸、相机位置、`controls.target` | 通常是相机没取景、模型太大/太小或目标点不在模型中心 |
| 拖拽围绕奇怪位置旋转 | `controls.target` | 加载或重新取景后没有把 target 设为包围盒中心 |
| 窗口变宽后画面拉伸 | `camera.aspect` 和 `updateProjectionMatrix()` | renderer 尺寸变了，相机投影没有同步 |
| 画面发黑 | 灯光、`scene.environment`、材质类型 | PBR 材质需要光照和环境，`MeshBasicMaterial` 不受灯光影响 |
| `.gltf` 比 `.glb` 更容易失败 | Network 面板里的 `.bin` / 贴图请求 | `.gltf` 依赖外部资源，相对路径必须一起部署 |
| 快速切换模型后旧模型又出现 | `loadToken` 或取消逻辑 | 旧异步请求晚返回，覆盖了新状态 |
| 切换模型后内存持续上涨 | dispose 流程 | 旧模型树的 geometry、material 或 texture 没释放 |

## 记忆句

Viewer 的顺序是：加载模型，取尺寸，摆相机，设控制器目标，给光和环境，持续 resize，失败可恢复，替换要释放。

空白画布不是状态；查看器至少要告诉自己和用户：正在加载什么、失败在哪里、当前相机在看哪里。

## 参考示例

- 查看器组合
  - [Viewer Shell](src/scenes/viewer-shell-scene.js)

- 取景与尺寸
  - [Auto Frame](src/scenes/auto-frame-scene.js)

- 状态与恢复
  - [Loading State](src/scenes/loading-state-scene.js)

- 光照与环境
  - [Lighting Environment](src/scenes/lighting-environment-scene.js)

## 参考资料

- [GLTFLoader docs](https://threejs.org/docs/pages/GLTFLoader.html)
- [LoadingManager docs](https://threejs.org/docs/pages/LoadingManager.html)
- [OrbitControls docs](https://threejs.org/docs/#examples/en/controls/OrbitControls)
- [PerspectiveCamera docs](https://threejs.org/docs/#api/en/cameras/PerspectiveCamera)
- [Box3 docs](https://threejs.org/docs/#api/en/math/Box3)
- [WebGLRenderer docs](https://threejs.org/docs/#api/en/renderers/WebGLRenderer)
- [PMREMGenerator docs](https://threejs.org/docs/#api/en/extras/PMREMGenerator)
- [three.js Manual: Loading a .GLTF File](https://threejs.org/manual/en/load-gltf.html)
