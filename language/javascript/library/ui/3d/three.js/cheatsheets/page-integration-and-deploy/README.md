# 页面

`three.js` 页面集成是让 canvas 服从真实网页：CSS 决定它占多少版面，renderer 同步实际渲染像素，交互只在有效边界内拾取，组件卸载时释放资源，构建产物按部署路径加载资源。

一句话记住：

> 页面先管布局和生命周期，three.js 再把当前容器尺寸、可见状态和资源路径翻译成渲染器能用的状态。

## 页面链路

three.js 不需要占满整个窗口。它通常只是页面里的一个组件，和标题、表单、按钮、路由切换、滚动容器、构建产物一起工作。

```text
DOM 容器和 CSS
  决定 canvas 在页面里的显示尺寸和叠层关系
        ↓
ResizeObserver / devicePixelRatio
  把 CSS 像素同步成 renderer drawing buffer
        ↓
camera.aspect / updateProjectionMatrix()
  让相机投影匹配当前容器比例
        ↓
DOM overlay / PointerEvent / Raycaster
  控制 UI 是否挡住 canvas，以及指针坐标是否落在画布内
        ↓
mount / unmount / visibility
  创建、暂停、恢复和释放 renderer、对象、贴图、监听器
        ↓
Vite build / base / asset URL
  让构建后的 HTML、JS 和静态资源在部署路径下仍能互相找到
```

## 容器尺寸

CSS 尺寸和渲染尺寸要分开看。CSS 的 `width`、`height`、`aspect-ratio` 决定 canvas 看起来多大；`renderer.setSize(width, height, false)` 决定 WebGL drawing buffer 有多少 CSS 像素；`renderer.setPixelRatio(...)` 再把 CSS 像素乘到设备像素。

- `ResizeObserver`：观察 canvas 的父容器，比监听 `window.resize` 更适合普通页面布局。
- `getBoundingClientRect()`：读取当前容器在 CSS 像素下的实际宽高；容器隐藏或还没布局时要把宽高夹到至少 `1`。
- `renderer.setSize(width, height, false)`：同步 drawing buffer，不让 three.js 改写 CSS 布局尺寸。
- `renderer.setPixelRatio(Math.min(devicePixelRatio, limit))`：高清屏更清晰，也更耗 GPU；真实项目常把上限压在 `1.5` 到 `2`。
- `camera.aspect = width / height`：透视相机的宽高比必须跟容器一致，改完调用 `camera.updateProjectionMatrix()`。

不要用 `window.innerWidth / innerHeight` 硬算嵌入式 canvas。页面有侧栏、卡片、滚动条、响应式列宽时，窗口尺寸通常不是 canvas 尺寸。

## DOM 叠层和指针

DOM overlay 可以放标签、按钮、表单和读数，但它会参与浏览器命中测试。一个盖在 canvas 上的 DOM 元素如果 `pointer-events: auto`，指针事件会先落到它身上；canvas 上的 `pointermove`、`click` 和 Raycaster 可能根本收不到这次事件。

- 纯展示 HUD：设 `pointer-events: none`，让事件穿透到 canvas。
- 可操作控件：保留 `pointer-events: auto`，并接受它遮住的区域不再参与 canvas 拾取。
- canvas 拾取：用 `canvas.getBoundingClientRect()` 把 `clientX/clientY` 换成 canvas 内坐标，再转 NDC。
- 绑定边界：优先把拾取事件绑定在 canvas 上，而不是 `document`；如果绑定在外层容器，要检查事件目标是否来自 canvas 区域。
- overlay 点击：不要把按钮点击同时当成 3D click；UI 状态和 3D 选中状态分开处理。

## 挂载生命周期

在路由或组件里，three.js 场景应该跟组件生命周期走。`mount` 负责创建 canvas、renderer、scene、camera、geometry、material、texture、observer 和 listener；`unmount` 负责反向清理。

```text
mount(root)
  创建 canvas 和 renderer
  创建 scene / camera / mesh / texture
  注册 ResizeObserver、pointer listener、requestAnimationFrame
        ↓
页面切换或组件销毁
        ↓
unmount()
  cancelAnimationFrame()
  disconnect observer
  removeEventListener()
  scene.remove(object)
  geometry.dispose()
  material.dispose()
  texture.dispose()
  renderer.dispose()
  清空 DOM 和业务引用
```

`scene.remove(object)` 只解除场景树关系，不会释放 GPU 资源。几何、材质、纹理、渲染目标和 renderer 都要按拥有关系释放；同时也要清掉数组、Map、闭包和 DOM 引用，否则 JavaScript 仍会把旧对象留住。

## 可见性和离屏

普通页面里不是每个 3D 区块都需要一直跑 60 FPS。标签页隐藏、组件离开视口、路由卸载、折叠面板收起时，都可以暂停渲染循环。

- `document.visibilityState`：页面变成 `hidden` 时暂停；回到 `visible` 后恢复，并重置上一帧时间，避免大 `delta` 让动画跳变。
- `IntersectionObserver`：canvas 容器离开视口时暂停；进入视口后恢复或请求一帧。
- `requestAnimationFrame`：每次只保存一个 frame id，暂停时 `cancelAnimationFrame(id)`。
- 恢复时机：尺寸可能已经变了，先同步 renderer 和 camera，再渲染下一帧。
- 按需渲染：静态预览页可以只在尺寸、相机、材质、数据或 UI 状态变化时请求一帧。

## 构建和资源路径

Vite 会把 HTML、入口 JS、CSS 和被模块引用的资源放进 `dist/`。部署到子路径、GitHub Pages 或静态目录时，路径规则比开发服务器更重要。

- `base`：构建产物的公共基础路径；本课用 `base: './'`，让多页面示例可以从任意静态目录用相对路径打开。
- 多页面入口：在 `build.rollupOptions.input` 里列出每个 `.html`，否则只有首页会作为入口构建。
- 模块内资源：用 `new URL('../assets/name.svg', import.meta.url).href`，Vite 会复制、hash 并重写路径。
- `public/` 资源：构建后原样复制到 `dist` 根；代码里用 `${import.meta.env.BASE_URL}name.ext` 拼出跟 `base` 一致的 URL。
- HTML 链接：多页面示例里优先用 `./page.html`、`./src/main.js` 这类相对路径，减少部署路径假设。

## 常见判断

| 现象 / 需求 | 先看哪里 | 判断 |
| --- | --- | --- |
| canvas 被 CSS 拉伸后画面糊 | `setSize(..., false)` 和 `setPixelRatio(...)` | CSS 尺寸和 drawing buffer 没同步，或 DPR 上限太低 |
| 页面里 canvas 变形 | `camera.aspect` | 容器比例变了但相机投影矩阵没更新 |
| 侧栏展开后 3D 尺寸没变 | `ResizeObserver` 观察对象 | 观察窗口不够，应该观察 canvas 的布局容器 |
| 点击 overlay 时选中了 3D 对象 | 事件绑定位置和 `pointer-events` | UI 点击和 canvas 拾取边界没有分清 |
| 路由切换后 GPU 资源上涨 | `unmount()` 和 `dispose()` | 移除 DOM 不等于释放 geometry/material/texture/renderer |
| 切回标签页后动画跳一下 | `visibilitychange` 后的时间基准 | 恢复时重置上一帧时间，不要吃隐藏期间的大 delta |
| 构建后资源 404 | `base`、`new URL(...)`、`public/` 路径 | 开发服务器能访问不代表部署路径正确 |
| 只有首页进了 `dist` | `rollupOptions.input` | 多页面项目需要显式列出每个 HTML 入口 |

## 记忆句

页面集成先问四件事：canvas 现在多大、指针到底落在哪、这个组件还活着吗、构建后资源从哪里来。

尺寸归 CSS，像素归 renderer，生命周期归页面，资产路径归 Vite。

## 参考示例

- 容器与尺寸
  - [ResizeObserver 容器同步](src/scenes/responsive-container-scene.js)

- DOM 与指针
  - [DOM overlay 与 Raycaster 边界](src/scenes/dom-overlay-scene.js)

- 生命周期
  - [mount / unmount 和 dispose](src/scenes/lifecycle-mount-scene.js)

- 页面调度
  - [Page Visibility / IntersectionObserver 暂停](src/scenes/visibility-pause-scene.js)

- 构建与部署
  - [Vite base / new URL / public 路径](src/scenes/asset-paths-deploy-scene.js)

## 参考资料

- [WebGLRenderer docs](https://threejs.org/docs/pages/WebGLRenderer.html)
- [PerspectiveCamera docs](https://threejs.org/docs/#api/en/cameras/PerspectiveCamera)
- [Raycaster docs](https://threejs.org/docs/pages/Raycaster.html)
- [Texture docs](https://threejs.org/docs/pages/Texture.html)
- [Vite Guide](https://vite.dev/guide/)
- [MDN Resize Observer API](https://developer.mozilla.org/en-US/docs/Web/API/Resize_Observer_API)
- [MDN devicePixelRatio](https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio)
- [MDN getBoundingClientRect](https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect)
- [MDN Pointer Events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events/Using_Pointer_Events)
- [MDN Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)
- [MDN Intersection Observer API](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)
