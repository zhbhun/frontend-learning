# 地图

three.js 学习时先把问题归类，再决定查课程、Manual、Docs、Examples 还是社区讨论。这个地图课把常见能力点和当前学习路线对齐，方便以后从问题反查入口。

- `renderer / scene / camera`：three.js 画面输出的最小协作关系。
- `Object3D`：大多数可变换对象的共同基础，承载位置、旋转、缩放和父子层级。
- `Manual / Docs / Examples`：Manual 学流程，Docs 查 API，Examples 找可运行变体。
- `README.md`：维护学习顺序；课程目录名保持稳定，不带序号。

## 实践

| 问题 | 所属能力 | 路线入口 |
| --- | --- | --- |
| 怎么把东西放进场景？ | 对象组织 | 2.1.1 对象、2.2.1 几何 |
| 为什么画面变形或模糊？ | 画面输出 | 1.3 循环与尺寸、2.1.2 相机 |
| 为什么材质看起来不对？ | 表面效果 | 2.2.2 材质、2.2.3 光照、5.1.1 PBR |
| 怎么加载 GLB 模型？ | 外部资产 | 3.2 模型、3.3 查看器、3.4 资产 |
| 怎么点击 3D 物体？ | 用户交互 | 4.2.1 拾取、2.1.2 相机 |
| 怎么播放模型动画？ | 时间动画 | 4.1.1 时间、4.1.2 动画 |
| 为什么页面卡顿？ | 性能交付 | 4.2.3 调试、5.2.1 性能 |
| Shader、WebGPU、物理要不要现在学？ | 进阶生态 | 6.1.1 Shader、6.1.2 WebGPU、6.2.3 物理 |

| 资料 | 适合查什么 |
| --- | --- |
| three.js Manual | 安装、场景、材质、纹理、模型、响应式渲染等主题教程 |
| three.js Docs | 类、构造参数、属性、方法、模块导入路径 |
| three.js Examples | controls、loaders、materials、postprocessing、WebXR、WebGPU 的可运行示例 |
| three.js GitHub | 示例源码、addons、issue、wiki、迁移信息 |
| three.js forum | 真实项目问题、版本变化、性能和模型加载经验 |

```js
// 用对象名快速判断一个 three.js 术语属于哪类能力。
const map = {
  renderer: '把 scene 和 camera 绘制到 canvas',
  scene: '承载 3D 对象的容器',
  camera: '决定观察位置、方向和投影方式',
  object3D: '提供位置、旋转、缩放、层级和矩阵',
  geometry: '提供顶点、索引、法线和 UV 等形状数据',
  material: '决定表面如何响应颜色、光照、纹理和渲染状态',
  texture: '把图片或数据送进材质和 shader',
  loader: '把外部资产转成 three.js 可用对象',
  controls: '把鼠标、触摸或设备输入转成相机或对象变化',
  clock: '把帧时间转成稳定动画更新'
};
```

```text
不知道概念 -> 查 Manual 或当前课程
知道类名 -> 查 Docs
想看变体 -> 查 Examples
遇到报错 -> 查 Docs、GitHub issue、forum
怀疑版本差异 -> 查 Releases 和 Migration Guide
需要长期整理 -> 回到 RESOURCES.md 和 references/
```

## 参考资料

- [three.js official site](https://threejs.org/)
- [three.js Manual](https://threejs.org/manual/)
- [three.js Docs](https://threejs.org/docs/)
- [three.js Examples](https://threejs.org/examples/)
- [three.js GitHub repository](https://github.com/mrdoob/three.js/)
- [three.js forum](https://discourse.threejs.org/)
