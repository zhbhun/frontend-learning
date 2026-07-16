# 材质

`Material` 是可渲染对象的表面规则：它决定颜色、光照响应、透明、线框、可见面和深度缓冲行为。

一句话记住：

> `Geometry` 给出形状，`Material` 给出表面，`Mesh` 把两者合在一起交给 renderer。

## 概念定位

| 概念 | 负责什么 | 常见判断 |
| --- | --- | --- |
| `Material` | 材质基类，提供通用渲染状态 | 不能直接实例化来画表面 |
| Mesh 材质 | 给 `Mesh` 使用的表面材质 | 本课先看常用内置材质 |
| 光照响应 | 材质是否读取场景里的 Light | `MeshBasicMaterial` 不受灯光影响 |
| 渲染状态 | 透明、深度、单双面、线框等开关 | 很多状态来自 `Material` 基类 |
| `needsUpdate` | 通知 three.js 重新编译材质程序 | 改变 shader 分支类选项后使用 |
| `dispose()` | 释放材质占用的 GPU 资源 | 替换或销毁材质时调用 |

## 常用材质

| 材质 | 光照 | 核心参数 | 适合场景 |
| --- | --- | --- | --- |
| `MeshBasicMaterial` | 不受光照影响 | `color`、`map`、`wireframe` | 调试色块、贴图面片、UI 式物体 |
| `MeshNormalMaterial` | 不受光照影响 | `flatShading`、`wireframe` | 法线方向、面朝向和几何调试 |
| `MeshLambertMaterial` | 受光 | `color`、`emissive` | 粗糙、无高光表面 |
| `MeshPhongMaterial` | 受光 | `color`、`specular`、`shininess` | 传统高光、简单亮面物体 |
| `MeshStandardMaterial` | 受光 | `color`、`metalness`、`roughness` | PBR 主力材质，模型和真实感表面基础 |

## 通用状态

| 属性 | 含义 | 观察方式 |
| --- | --- | --- |
| `color` | 基础颜色 | 多数材质会用它调制最终颜色 |
| `wireframe` | 只画三角形边线 | 查看几何分段和面结构 |
| `side` | 渲染正面、背面或双面 | 平面和开口模型最容易观察 |
| `transparent` | 进入透明渲染流程 | 开启后 `opacity` 才适合作为半透明控制 |
| `opacity` | 不透明度，`1` 为不透明 | 需要配合 `transparent: true` |
| `depthTest` | 是否用深度缓冲判断遮挡 | 关闭后物体更像覆盖层 |
| `depthWrite` | 是否把自己写入深度缓冲 | 透明物体常设为 `false` 减少遮挡异常 |
| `visible` | 是否参与渲染 | 比删对象更适合临时隐藏 |

## 光照关系

不受光材质自己决定颜色；受光材质还要结合 Light、法线和材质模型。

```js
const basic = new THREE.MeshBasicMaterial({ color: '#2f83d8' });
const lambert = new THREE.MeshLambertMaterial({ color: '#36a269' });
const phong = new THREE.MeshPhongMaterial({
  color: '#d6832b',
  specular: '#ffffff',
  shininess: 55
});
const standard = new THREE.MeshStandardMaterial({
  color: '#2f83d8',
  metalness: 0.18,
  roughness: 0.42
});
```

## 透明和深度

透明不是只改 `opacity`。`transparent` 决定材质是否按透明物体处理，`depthWrite` 决定它是否挡住后面物体的深度。

```js
const material = new THREE.MeshStandardMaterial({
  color: '#2f83d8',
  transparent: true,
  opacity: 0.55,
  side: THREE.DoubleSide,
  depthTest: true,
  depthWrite: false
});
```

## 更新时机

| 改动 | 是否通常要 `needsUpdate` | 原因 |
| --- | --- | --- |
| `color.set(...)` | 不需要 | uniform 值变化 |
| `opacity` 数值 | 不需要 | uniform 值变化 |
| `metalness` / `roughness` | 不需要 | uniform 值变化 |
| `wireframe` | 建议标记 | 影响渲染分支 |
| `side` | 建议标记 | 改变面剔除相关状态 |
| `transparent` | 建议标记 | 改变透明/不透明渲染路径 |
| `flatShading` | 需要 | 影响 shader 编译分支 |

## 记忆句

先选材质类型，再调材质状态：类型决定表面如何响应光，状态决定它如何参与渲染顺序、透明混合和深度缓冲。

## 参考示例

材质家族对比使用同一个几何体换不同材质：

```js
const materials = [
  new THREE.MeshBasicMaterial({ color: '#2f83d8' }),
  new THREE.MeshNormalMaterial({ flatShading: false }),
  new THREE.MeshLambertMaterial({ color: '#36a269' }),
  new THREE.MeshPhongMaterial({ color: '#d6832b', specular: '#ffffff', shininess: 55 }),
  new THREE.MeshStandardMaterial({ color: '#7c5cc7', metalness: 0.15, roughness: 0.42 })
];
```

`MeshStandardMaterial` 的基础 PBR 参数：

```js
material.metalness = 0.18;
material.roughness = 0.42;
material.color.set('#2f83d8');
```

透明和深度状态：

```js
material.transparent = true;
material.opacity = 0.55;
material.depthTest = true;
material.depthWrite = false;
material.needsUpdate = true;
```

观察重点：

- `material-family.html`：调低光照强度时，`Basic` 和 `Normal` 仍然可见，`Lambert`、`Phong`、`Standard` 明显变暗。
- `material-family.html`：调高 `shininess` 时，只有 `Phong` 的高光变尖锐。
- `pbr-standard.html`：`metalness` 越高，表面越偏金属响应；`roughness` 越高，高光越散。
- `transparency-depth.html`：只改 `opacity` 不等于透明渲染；透明物体常需要观察 `depthWrite`。
- `transparency-depth.html`：`side` 对平面很明显，`FrontSide` 和 `BackSide` 只画一个朝向。

## 参考资料

- [Material docs](https://threejs.org/docs/pages/Material.html)
- [MeshBasicMaterial docs](https://threejs.org/docs/pages/MeshBasicMaterial.html)
- [MeshNormalMaterial docs](https://threejs.org/docs/pages/MeshNormalMaterial.html)
- [MeshLambertMaterial docs](https://threejs.org/docs/pages/MeshLambertMaterial.html)
- [MeshPhongMaterial docs](https://threejs.org/docs/pages/MeshPhongMaterial.html)
- [MeshStandardMaterial docs](https://threejs.org/docs/pages/MeshStandardMaterial.html)
- [three.js Manual: Materials](https://threejs.org/manual/#en/materials)
