# 坐标与单位

three.js 里要分清两种大小：几何在场景里的世界尺寸，和它经过相机投影后在 canvas 上占多少像素。`BoxGeometry(1, 1, 1)` 的意思是这个盒子在世界里宽高深都是 `1 unit`；至于屏幕上看起来多大，要看相机位置、视野角和画布尺寸。

- `Vector3(x, y, z)`：表达三维向量，常用于 `position`、方向、尺寸计算和世界坐标读数。
- 坐标轴：three.js 默认是右手坐标系，Y 轴向上；`AxesHelper` 中 X 是红色、Y 是绿色、Z 是蓝色。
- 世界单位：three.js 没有 `setUnit(...)` 这类全局配置；`BoxGeometry(1, 1, 1)`、`position.set(1, 0, 0)` 里的数字本身就是世界单位。
- `1 unit` 的约定：项目自己决定 `1` 代表什么，常见做法是约定 `1 unit = 1 米`，再让模型尺寸、相机距离、光照距离和物理参数都按这个比例写。
- 参考尺：用 `GridHelper(8, 8)` 这类已知尺寸对象判断大小；总宽 `8 units`、分成 `8` 格时，每格就是 `1 unit`，所以 `BoxGeometry(1, 1, 1)` 的边长正好是一格。
- 屏幕大小：透视相机下，同一个 `1 unit` 立方体离相机越近看起来越大，离相机越远看起来越小；几何尺寸没有变，变的是投影结果。
- 角度：`Object3D.rotation` 使用 `Euler`，数值单位是弧度；界面常用角度显示，再用 `THREE.MathUtils.degToRad(...)` 转成弧度。
- 局部/世界空间：子对象的 `position` 是相对父对象原点的局部坐标；对象最终出现在世界里的位置可以用 `getWorldPosition(...)` 读取。

## 实践

### 坐标轴与单位

```js
// three.js 不配置单位；这个常量只是项目约定，表示代码里 1 个数值按 1 米理解。
const METER = 1;

// grid 是场景里的量尺：总宽 8 units，分成 8 格，所以每格是 1 unit。
const grid = new THREE.GridHelper(8 * METER, 8);
const axes = new THREE.AxesHelper(3); // X 红、Y 绿、Z 蓝，用来确认世界原点和方向。
scene.add(grid, axes);

const cube = new THREE.Mesh(
  new THREE.BoxGeometry(1 * METER, 1 * METER, 1 * METER), // 世界尺寸：宽高深都是 1 unit。
  new THREE.MeshStandardMaterial({ color: '#3b82f6' })
);

// position 表示几何中心；中心 Y = 0.5 unit 时，1 unit 高的立方体底部刚好贴着地面。
cube.position.set(1 * METER, 0.5 * METER, -1 * METER);
cube.scale.setScalar(1.4); // 原始边长 1，整体缩放后边长就是 1.4 units。
scene.add(cube);

const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
camera.position.set(5.2, 3.4, 6.4);
camera.lookAt(0, 0.55, 0); // 相机决定这个 1 unit 立方体最终在屏幕上占多少像素。
```

打开 `axes-and-units.html` 调整 `Vector3` 的 X/Y/Z 和边长，先用网格判断“世界里多大”：边长 `1.0` 时立方体宽一格，边长 `2.0` 时宽两格。它在屏幕上占多少像素不是固定答案，后面的相机课程会专门拆透视相机、距离和视野角。

### 角度与局部/世界空间

```js
const parent = new THREE.Group();
scene.add(parent);

const child = new THREE.Mesh(childGeometry, childMaterial);
parent.add(child);

parent.position.x = parentX;
parent.rotation.y = THREE.MathUtils.degToRad(parentAngle); // rotation 的单位是弧度。
child.position.x = childLocalX; // child 的位置是相对 parent 原点的局部坐标。

const childWorldPosition = child.getWorldPosition(new THREE.Vector3());
```

打开 `local-world-space.html` 调整父对象旋转和子对象局部 X，观察 `child.position.x` 不变时，世界坐标里的 X/Z 为什么会一起变化。

## 参考资料

- [Vector3 docs](https://threejs.org/docs/#api/en/math/Vector3)
- [Euler docs](https://threejs.org/docs/#api/en/math/Euler)
- [MathUtils docs](https://threejs.org/docs/#api/en/math/MathUtils)
- [Object3D docs](https://threejs.org/docs/#api/en/core/Object3D)
- [AxesHelper docs](https://threejs.org/docs/#api/en/helpers/AxesHelper)
- [PerspectiveCamera docs](https://threejs.org/docs/#api/en/cameras/PerspectiveCamera)
- [three.js Manual: Scenegraph](https://threejs.org/manual/#en/scenegraph)
