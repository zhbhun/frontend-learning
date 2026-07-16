# 框架

`three.js` 与应用框架集成的核心是边界：框架负责声明式 UI、路由和状态，命令式 3D 运行时负责创建、更新、渲染和释放 renderer、scene、camera、loop、事件与 GPU 资源。

本课示例仍使用 Vite、原生 JavaScript、ES Modules 和 `three.js`。它不引入 React、Vue、React Three Fiber 或 TresJS 依赖，因为这里先练的是集成心智模型，不是具体框架项目。

## 概念定位

vanilla `three.js` 是命令式运行时。你显式创建对象，显式修改属性，显式启动循环，也要显式释放资源。

```text
create
  new WebGLRenderer / Scene / Camera / Geometry / Material / Mesh
        ↓
update
  object.position / material.color / camera.aspect / texture.needsUpdate
        ↓
render
  requestAnimationFrame 或 setAnimationLoop 中 renderer.render(scene, camera)
        ↓
dispose
  cancel loop / remove listener / disconnect observer / dispose GPU resources
```

React、Vue、Svelte 等 UI 框架是声明式组件系统。组件函数、模板或状态更新可能反复执行，但这不代表每次都应该重新创建 WebGL 上下文、几何、材质、纹理或 loader。

```text
props / state / route
        ↓
component render / effect / lifecycle
        ↓
adapter.update(props)
        ↓
mutate existing three.js objects
```

把两边接起来时，最重要的问题不是“在哪个框架里写 `new THREE.Mesh(...)`”，而是谁拥有这个对象、谁负责更新它、谁负责销毁它。

## 所有权边界

组件可以拥有一个命令式 adapter。adapter 的公开表面很小：`mount(root, props)` 创建运行时，`update(props)` 修改已有对象，`unmount()` 清理所有副作用。

| 对象 / 副作用 | 推荐所有者 | 判断 |
| --- | --- | --- |
| `canvas` / `WebGLRenderer` | adapter 或框架 3D renderer | 一个挂载点通常只创建一次，卸载时释放 |
| `Scene` / `Camera` | adapter 或声明式 3D 树根 | 跟 3D 子树生命周期一致 |
| `Geometry` / `Material` / `Texture` | 创建它的 adapter、组件或资源缓存 | 重复复用时由缓存拥有，临时创建时由组件释放 |
| `requestAnimationFrame` / `setAnimationLoop` | adapter、R3F/TresJS canvas 上下文 | 保存 id 或统一入口，暂停和恢复集中管理 |
| `ResizeObserver` / `IntersectionObserver` | adapter 或页面集成层 | 绑定容器，卸载时 `disconnect()` |
| DOM / pointer listener | 绑定它的边界层 | 绑定在 canvas 或容器上，卸载时移除 |
| loader / async request | 资源层或框架 suspense/loading 边界 | 处理加载中、错误、取消和缓存 |

`scene.remove(object)` 只解除场景树关系，不释放 GPU 资源。谁创建了 geometry、material、texture、render target、renderer，谁就必须能解释它什么时候 `dispose()`。

## 生命周期边界

框架里的 `mount` / `unmount` 对应 three.js 的资源生命周期。组件重新渲染不等于重新挂载；props 改变通常只走 `update`。

```text
组件 mount
  adapter.mount(root, props)
    创建 canvas / renderer / scene / camera
    创建资源，注册 observer/listener
    启动或接入 render loop

props 改变
  adapter.update(nextProps)
    修改已有 Object3D、Material、Camera 或控制器状态
    必要时请求一帧渲染

组件 unmount / route 离开
  adapter.unmount()
    取消 loop
    断开 observer
    移除 listener
    dispose 资源
    清空 DOM 和业务引用
```

在 React 里，这通常落在 `useEffect` / `useLayoutEffect` 的创建和 cleanup 中；在 Vue 里，对应 `onMounted` / `onBeforeUnmount`；在 Svelte 里，对应 `onMount` 返回的 cleanup。

## Re-render 边界

组件 render 可以很频繁，但 renderer、geometry、material 和 loader 不应该跟着频繁创建。

- 稳定引用：renderer、scene、camera、mesh、geometry、material 放在 adapter、ref、module cache 或框架 3D renderer 管理的对象树中。
- props 更新：颜色、位置、缩放、速度、可见性、材质参数等优先改已有对象属性。
- 构造参数变化：`BoxGeometry(1, 1, 1)` 这类构造参数变了，通常需要创建新对象，并释放旧对象。
- 资源缓存：同一模型、贴图或材质被多个组件使用时，不要由任意一个子组件随手 dispose；需要明确缓存边界和引用关系。
- 错误做法：组件函数每执行一次就 `new WebGLRenderer()`、`new BoxGeometry()`、`new TextureLoader().load(...)`。

判断一个值该放哪里，可以先问：它是“业务状态”，还是“3D 运行时状态”？

| 类型 | 例子 | 放置位置 |
| --- | --- | --- |
| 业务状态 | 选中 id、路由参数、表单值、开关 | 框架 state / store |
| 3D 稳定对象 | renderer、scene、camera、controls、mesh | adapter 私有引用 / `ref` / 3D renderer |
| 每帧临时值 | delta、elapsed、当前矩阵、鼠标 NDC | loop 内局部变量或可复用对象 |
| 可持久资源 | 纹理、模型、材质模板、环境贴图 | loader 缓存 / 资源模块 / 共享资产层 |

## Loop 与事件

`requestAnimationFrame` 是渲染运行时的节拍，不是 UI 框架每帧重渲染的理由。

- 3D 动画：每帧修改 `mesh.rotation`、`controls.update()`、`mixer.update(delta)`，然后 `renderer.render(...)`。
- UI 状态：只在用户交互、选中变化、加载进度、错误、低频性能读数等时更新。
- 高频读数：FPS、角度、相机位置如果只是观察值，可以节流后同步到 DOM 或框架 state。
- 指针事件：DOM 事件先落在 canvas 或 overlay，再转成 NDC、Raycaster 命中、业务事件。
- 按需渲染：静态模型、产品预览、配置器可以把 `requestRender()` 集中管理，只在状态变化时渲染一帧。

不要在每一帧调用 `setState` / 更新全局 store 来驱动同一个旋转动画。那会把 3D runtime 的高频循环扩散到整个 UI 树。

## R3F 定位

React Three Fiber 是 React 的 three.js renderer。它把 three.js 对象映射成 React reconciler 管理的声明式树，而不是简单把 vanilla 代码塞进 React 组件。

常见映射：

| three.js 心智模型 | R3F 心智模型 |
| --- | --- |
| `new THREE.Mesh(...)` | JSX 节点，例如 `<mesh>` |
| 构造参数 | `args={[...]}`；`args` 变化通常意味着对象重建 |
| 对象属性 | JSX props，由 reconciler 应用到 three.js 对象 |
| 命令式引用 | `ref`，用于少量必须直接改对象的场景 |
| render loop | `useFrame`，加入 `<Canvas>` 内的共享帧循环 |
| pointer / click | 声明在可 raycast 对象上的事件 |
| loader | `useLoader`、Suspense 或资源缓存边界 |

R3F 适合 React 应用里有较复杂 3D 组件树、资源加载边界、交互事件和 UI 状态联动的场景。它仍然不是“免生命周期”：构造参数、缓存、材质共享、后处理、loader 错误和 dispose 边界仍要理解 three.js 对象模型。

## TresJS 定位

TresJS 是 Vue 风格的 three.js 声明式组件层。`<TresCanvas />` 建立 canvas、renderer、scene 上下文，并把 Vue 的响应式 props、组件生命周期和 three.js 对象连接起来。

常见映射：

| three.js 心智模型 | TresJS 心智模型 |
| --- | --- |
| canvas + renderer 环境 | `<TresCanvas />` |
| 场景对象 | Vue 模板里的 Tres 组件 |
| 对象属性更新 | 响应式 props 推动 three.js 属性变化 |
| 每帧逻辑 | composable 或 canvas 上下文中的帧循环 |
| DOM / UI 控件 | Vue 组件状态，再传给 Tres 子树 |
| 卸载 | Vue 生命周期触发 3D 子树清理 |

TresJS 适合 Vue / Nuxt 应用、模板表达更自然的团队，以及希望把 3D 对象当 Vue 组件组织的场景。它和 R3F 一样，降低的是集成样板代码，不是 three.js 生命周期和性能判断本身。

## 应用边界

框架集成时，three.js 不只和组件生命周期有关，还会碰到应用级边界。

- 全局状态：只存业务意图，例如当前模型 id、选中节点、材质配置；不要把 `Mesh`、`Material`、`WebGLRenderer` 放进可序列化 store。
- 路由：路由进入时挂载或懒加载 3D chunk，离开时暂停 loop、取消加载、释放本路由拥有的资源。
- SSR：WebGL、`window`、`document` 只能在客户端运行；SSR 页面先渲染占位容器，客户端 mount 后创建 renderer。
- 懒加载：模型、贴图、后处理和框架 3D 层都可以按路由或可见性动态加载；加载失败要有可见错误状态。
- 错误边界：loader error、WebGL context lost、资源 404、设备不支持需要被 UI 捕获和展示。
- 可见性：页面隐藏、组件离屏、折叠面板收起时，暂停或切到按需渲染。

## 选型判断

| 选择 | 适合 | 小心 |
| --- | --- | --- |
| vanilla adapter | 小范围嵌入、已有 three.js 场景、跨 React/Vue/Svelte 复用 | 生命周期和事件桥接要自己写完整 |
| React Three Fiber | React 应用、3D 子树复杂、需要组件化和 React 资源边界 | 要理解 `args` 重建、`ref`、`useFrame` 和资源缓存 |
| TresJS | Vue / Nuxt 应用、模板式组织 3D、响应式 props 驱动场景 | 要分清 Vue reactivity 与 three.js 高频状态 |
| 直接把 vanilla 写进组件 render | 几乎不推荐 | 容易重复创建 renderer、资源和监听器 |

一个实用规则：如果 3D 区块像“一个外部小部件”，先用 vanilla adapter；如果 3D 场景本身就是应用的组件树，React 项目优先看 R3F，Vue 项目优先看 TresJS。

## 常见判断

| 现象 / 需求 | 先看哪里 | 判断 |
| --- | --- | --- |
| 路由切换后 GPU memory 上涨 | `unmount()` 和 `dispose()` | DOM 移除不等于资源释放 |
| UI state 每帧增长，页面其他部分也频繁 render | loop 与 state 边界 | 3D 高频状态应该留在 loop/ref，UI 低频读快照 |
| props 改一次就闪白或 WebGL context 重建 | renderer 所有权 | renderer 可能放在了组件 render 路径里 |
| 改颜色导致 geometry 数量上涨 | re-render 边界 | 应该改 `material.color`，不是重建 geometry |
| R3F 中 `args` 改了对象被重建 | 构造参数边界 | 构造参数变化本来就需要新对象，旧资源要能清理 |
| overlay 按钮点击也触发 3D 选中 | DOM 事件边界 | UI 控件和 canvas pointer / Raycaster 边界没有分开 |
| SSR 构建时报 `window is not defined` | 客户端生命周期 | WebGL 初始化必须延后到客户端 mount |
| 多个组件共用贴图时某个组件卸载后贴图失效 | 资源所有权 | 共享缓存不能由单个消费者随意 dispose |

## 记忆句

框架管声明，adapter 管命令。

组件 render 可以重复，three.js 资源不该跟着重复。

高频动画留在 3D loop，低频结果再同步到 UI。

## 参考示例

- 命令式边界
  - [mount / update / unmount adapter](src/scenes/imperative-adapter-scene.js)

- Re-render 边界
  - [稳定引用与重复创建资源](src/scenes/rerender-boundary-scene.js)

- Loop 与 state 边界
  - [requestAnimationFrame 所有权与低频 UI 快照](src/scenes/loop-ownership-scene.js)

- 框架映射
  - [vanilla / R3F / TresJS 概念映射](src/scenes/framework-map-scene.js)

## 参考资料

- [WebGLRenderer docs](https://threejs.org/docs/pages/WebGLRenderer.html)
- [Object3D docs](https://threejs.org/docs/#api/en/core/Object3D)
- [three.js Manual: Scenegraph](https://threejs.org/manual/#en/scenegraph)
- [React Three Fiber docs](https://r3f.docs.pmnd.rs/)
- [React Three Fiber Objects docs](https://r3f.docs.pmnd.rs/api/objects)
- [React Three Fiber Hooks docs](https://r3f.docs.pmnd.rs/api/hooks)
- [React Three Fiber Events docs](https://r3f.docs.pmnd.rs/api/events)
- [TresJS docs](https://tresjs.org/)
- [TresCanvas docs](https://docs.tresjs.org/api/components/tres-canvas)
- [MDN requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)
- [MDN Resize Observer API](https://developer.mozilla.org/en-US/docs/Web/API/Resize_Observer_API)
- [MDN Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)
