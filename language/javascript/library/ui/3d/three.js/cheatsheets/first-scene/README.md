# 第一幅画面

一幅 three.js 画面由 `scene`、`camera`、`mesh` 和 `renderer.render(...)` 组成。`scene` 收纳对象，`camera` 决定观察方式，`mesh = geometry + material` 决定看见什么，render loop 让画面持续更新。

- `renderer.render(scene, camera)`：把 scene 通过 camera 绘制到 canvas。
- `scene`：3D 对象容器，mesh 和 helper 必须 `scene.add(...)` 后才会被渲染。
- `PerspectiveCamera(55, width / height, 0.1, 100)`：`55` 是垂直视野角，`aspect` 来自画布宽高比，`near/far` 是可见深度范围。
- `camera.position.set(x, y, z)`：把相机放到世界坐标里，`lookAt(...)` 决定它看向哪里。
- `BoxGeometry(2, 1, 1)`：宽、高、深分别是 2、1、1；改尺寸会直接改变立方体比例。
- `MeshNormalMaterial({ flatShading: true })`：用法线方向生成颜色，`flatShading` 让面与面之间更容易看清。
- `requestAnimationFrame`：让渲染循环跟随浏览器刷新节奏持续更新。

## 实践

```js
// renderer、scene、camera 是第一幅画面的最小骨架。
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
const scene = new THREE.Scene();

// fov 是垂直视野角，aspect 必须等于画布宽高比，near/far 限制可见深度。
const width = canvas.clientWidth;
const height = canvas.clientHeight;
const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 100);

// 相机位置在世界坐标里；lookAt 让它看向场景原点。
camera.position.set(0, 20, 20);
camera.lookAt(0, 0, 0);

// BoxGeometry 的三个数字是宽、高、深；material 决定这个形状如何着色。
const geometry = new THREE.BoxGeometry(2, 1, 1);
const material = new THREE.MeshNormalMaterial({ flatShading: true });
const cube = new THREE.Mesh(geometry, material);

scene.add(cube);
scene.add(new THREE.AxesHelper(2.4));

// 用 delta 让旋转速度和帧率解耦。
function render(time = 0) {
  const delta = state.lastTime ? (time - state.lastTime) / 1000 : 0;
  state.lastTime = time;

  if (state.running) {
    cube.rotation.x += delta * state.speed * 0.45;
    cube.rotation.y += delta * state.speed * 0.9;
  }

  renderer.render(scene, camera);
  state.animationId = window.requestAnimationFrame(render);
}

render();
```

```js
// 控制面板只改关键参数，核心对象仍在 src/scene.js 里。
function setWireframe(enabled) {
  material.wireframe = enabled;
}

function setCameraDistance(distance) {
  camera.position.z = distance;
  camera.lookAt(0, 0, 0);
}

// 停止循环并释放 GPU 资源，避免页面长期占用显存。
function dispose() {
  window.cancelAnimationFrame(state.animationId);
  geometry.dispose();
  material.dispose();
  renderer.dispose();
}
```

## 参考资料

- [three.js Manual: Creating a Scene](https://threejs.org/manual/#en/creating-a-scene)
- [Discover three.js](https://discoverthreejs.com/book/)
- [three.js Docs](https://threejs.org/docs/)
