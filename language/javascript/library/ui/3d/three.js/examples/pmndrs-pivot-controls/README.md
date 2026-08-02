# Drei PivotControls 交互示例

这个示例使用 React Three Fiber 和 Drei 的 `PivotControls`，可以直接在浏览器里体验对象的平移、旋转、缩放和 pivot 锚点。

## 启动

```sh
cd examples/pmndrs-pivot-controls
npm install
npm run dev
```

打开终端输出的本地地址，然后：

- 拖动红、绿、蓝轴进行平移。
- 拖动圆环旋转模型。
- 拖动角上的小球缩放模型。
- 切换 `Anchor`，观察旋转中心变化。
- 切换 `Fixed size`，比较 gizmo 是否保持屏幕尺寸。
- 切换 `Viewport aware`，让控制器按当前视角调整朝向并进行深度遮挡。
- 关闭某个 `Active axis`，观察对应轴的操作入口消失。

## 核心用法

```jsx
<PivotControls
  anchor={[0, 0, 0]}
  annotations
  activeAxes={[true, true, true]}
  fixed={false}
  lineWidth={4}
  scale={1.5}
>
  <MyObject />
</PivotControls>
```

默认情况下 `PivotControls` 的 `autoTransform` 为 `true`，拖拽 gizmo 后会自动更新被包裹对象的局部变换。本示例还把 `onDragStart`、`onDrag`、`onDragEnd` 接到面板状态上，方便观察事件生命周期。

`Viewport aware` 开启时，控制器仍会朝向当前相机，但会根据相机位于对象前侧还是后侧切换正面/背面布局。相机越过对象背面后，水平箭头、缩放入口和旋转入口会镜像换边，对应 Shapr3D 两张参考图的差异。gizmo 的深度测试保持关闭，因此控制器不会被立方体遮挡。

## 参考

- [Drei PivotControls](https://drei.docs.pmnd.rs/gizmos/pivot-controls)
- [React Three Fiber](https://r3f.docs.pmnd.rs/getting-started/introduction)
