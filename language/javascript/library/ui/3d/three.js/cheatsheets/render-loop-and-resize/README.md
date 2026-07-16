# 循环与尺寸

three.js canvas 有两种尺寸：CSS 尺寸决定页面上看起来多大，drawing buffer 决定 WebGL 实际渲染多少像素。resize 时要同步 renderer 和 camera，动画时要用 `delta` 把速度从帧率里解耦出来。

- `CSS 尺寸`：决定 canvas 在页面上看起来多大。
- `drawing buffer`：决定 WebGL 实际渲染多少像素。
- `renderer.setSize(width, height, false)`：同步绘制尺寸，但不改 CSS 布局。
- `camera.aspect`：相机宽高比，改完后必须调用 `camera.updateProjectionMatrix()`。
- `renderer.setPixelRatio(...)`：控制 drawing buffer 相对 CSS 尺寸放大多少，越高越清晰也越耗性能。
- `delta`：相邻两帧的时间差，用它更新动画可以避免速度绑定帧率。
- `正确同步 / 只拉伸 CSS / 忘记相机比例`：分别对比完整 resize、只改页面尺寸、漏更新相机投影时的画面差异。

## 实践

```js
// 读取父容器的 CSS 尺寸，作为本轮渲染尺寸来源。
function resize() {
  const parent = canvas.parentElement;
  const width = Math.max(1, Math.floor(parent.clientWidth));
  const height = Math.max(1, Math.floor(parent.clientHeight));

  // 第三个参数 false 表示只改 drawing buffer，不让 three.js 覆盖 CSS 尺寸。
  renderer.setSize(width, height, false);

  // aspect 要跟当前画布比例一致；改投影参数后必须刷新投影矩阵。
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

// 像素比越高越清晰，也越吃 GPU；2 是常见上限，避免高 DPR 屏幕渲染过重。
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// 容器变了就重新同步 renderer 和 camera。
const observer = new ResizeObserver(resize);
observer.observe(canvas.parentElement);
```

```js
// requestAnimationFrame 的时间戳用于计算 delta，delta 单位是秒。
function render(time = 0) {
  const delta = state.lastTime ? (time - state.lastTime) / 1000 : 0;
  state.lastTime = time;

  // speed 表示每秒旋转的倍率，不会因为帧率不同而变快或变慢。
  cube.rotation.y += delta * state.speed;

  renderer.render(scene, camera);
  state.animationId = window.requestAnimationFrame(render);
}

// 故意漏掉 camera.aspect 和 updateProjectionMatrix，用来观察画面变形。
function applyWrongCameraResize(width, height) {
  renderer.setSize(width, height, false);
}
```

页面控件里切换“正确同步”“只拉伸 CSS”“忘记相机比例”，观察 CSS 尺寸、绘制缓冲区、相机比例和画面变形。

## 参考资料

- [three.js Manual](https://threejs.org/manual/)
- [MDN WebGL API](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API)
- [Window: devicePixelRatio](https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio)
- [Window: requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)
