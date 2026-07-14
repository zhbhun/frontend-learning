# pmndrs PivotControls 交互示例设计

## 背景与目标

`examples/pmndrs-pivot-controls` 当前只是原生 Three.js 的 renderer 检查页。目标是把它改造成一个可以直接操作的 React Three Fiber 示例，用一个清晰的场景帮助学习和体验 Drei 的 `PivotControls`：平移、旋转、缩放、锚点偏移以及 gizmo 显示参数。

参考：[Drei PivotControls 文档](https://drei.docs.pmnd.rs/gizmos/pivot-controls)。

## 方案

采用 React + `@react-three/fiber` + `@react-three/drei` + Vite。页面由一个控制面板和一个 3D 视口组成，不引入模型资源或额外 UI 库。

场景使用基础几何体组成一个彩色的组合模型，模型外层包裹 `PivotControls`，旁边放置地面网格、坐标轴辅助线、环境光和方向光。模型包含偏离中心的细节，使修改 pivot 后的旋转轨迹容易观察。`OrbitControls` 用于环绕观察场景。

控制面板提供以下可调整项：

- `annotations`：显示拖拽过程中的数值标注。
- `fixed`：切换 gizmo 是否保持屏幕尺寸。
- `anchor`：选择中心、左下角、右上角等锚点，观察旋转中心改变。
- `activeAxes`：单独启用或禁用 X/Y/Z 轴。
- `scale`：调整 gizmo 大小。
- `lineWidth`：调整 gizmo 线宽。

面板同时展示当前拖拽状态；通过 `onDragStart`、`onDrag`、`onDragEnd` 更新状态，而不是把每一帧的矩阵转成昂贵的 React UI 重渲染。`PivotControls` 保持默认 `autoTransform`，让基础示例优先突出直接使用方式。

## 组件与数据流

### 页面层

- `index.html`：提供页面语义结构、控制面板挂载点和 React 入口。
- `src/main.jsx`：创建 React 根节点并渲染应用。
- `src/styles.css`：负责响应式双栏布局、面板控件和全屏 canvas。

### React 应用层

- `App`：管理示例参数和拖拽状态，渲染面板与 `Canvas`。
- `ControlPanel`：渲染控件，通过受控 props 修改参数。
- `PivotScene`：配置相机、灯光、网格、`OrbitControls` 与 `PivotControls`。
- `PivotObject`：组合几何体模型，保持展示对象与控制器职责分离。

数据流为：面板控件 → `App` state → `PivotControls` props → R3F 场景；拖拽回调 → `App` state → 面板状态反馈。场景参数只使用可序列化的数字、布尔值和元组，避免把 Three.js 可变对象放进 React state。

## 交互与错误处理

- 页面加载后立即显示可操作的 gizmo 和模型；不需要用户先点击初始化。
- 视口随窗口尺寸变化，canvas 使用 `resize` 由 R3F 处理。
- 移动端改为上下布局，控件和视口保持可用；canvas 保留触控事件。
- 若 WebGL 初始化失败，保留页面面板并显示友好的错误提示，避免静默白屏。
- `OrbitControls` 仅负责观察相机；`PivotControls` 负责对象变换，两者不共享业务状态。

## 依赖与脚本

更新示例自己的 `package.json` 和 lockfile，加入 React、React DOM、`@react-three/fiber`、`@react-three/drei`，继续使用现有 Three.js 和 Vite 版本。保留 `dev`、`build`、`preview` 三个脚本。

## 验收标准

1. `npm run build` 在 `examples/pmndrs-pivot-controls` 中成功完成。
2. 页面实际渲染 React Three Fiber canvas，而非原来的 renderer 检查页。
3. 可以在视口中拖动 gizmo 对模型进行平移、旋转和缩放。
4. 面板中的 `annotations`、`fixed`、`anchor`、`activeAxes`、`scale`、`lineWidth` 都能立即影响 gizmo。
5. 拖拽开始、进行中、结束状态会在面板中反馈。
6. 窄屏布局不会溢出，页面仍能操作。
7. README 说明启动命令和 `PivotControls` 的主要用法。

## 不在本次范围内

- `autoTransform={false}` 的受控矩阵编辑示例。
- GLTF、HDR 或其他外部资源加载。
- 引入 Leva 等额外调试面板库。
- 修改仓库中其他 lesson 或示例。
