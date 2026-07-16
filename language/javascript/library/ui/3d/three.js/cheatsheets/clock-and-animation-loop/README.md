# 时间

`Timer` 把浏览器动画帧里的时间变成 three.js 可用的秒数：`delta` 推进本帧变化，`elapsed` 描述已经运行多久，业务状态由你的代码按这些时间量更新。

一句话记住：

> frame 只说明“该画下一帧了”，delta 才说明“这一帧应该推进多少”。

## 执行链路

浏览器负责安排下一次重绘，renderer 负责在回调里渲染场景，时间对象负责把毫秒时间戳转换成稳定的秒数。不要把“每帧加一点”当成速度；速度应该是“每秒多少”，再乘以本帧的 `delta`。

```text
浏览器 / renderer 动画回调
  提供当前帧时间戳或触发一次渲染
        ↓
Timer.update(timestamp)
  计算 delta 和 elapsed
        ↓
业务状态更新
  rotation / position / mixer / physics / tween
        ↓
renderer.render(scene, camera)
  把更新后的状态画出来
```

## 时间来源

`requestAnimationFrame(callback)` 是浏览器原生动画入口。它通常跟随屏幕刷新率回调，并且后台标签页里常会暂停；回调参数是毫秒级时间戳。原生循环里要在回调末尾再次调用 `requestAnimationFrame`，因为它只调度一次。

three.js 项目优先用 `renderer.setAnimationLoop(callback)`。它封装动画回调，并且和 WebXR 的渲染循环兼容；停止循环时传 `null`。

```js
renderer.setAnimationLoop((timestamp) => {
  timer.update(timestamp);
  update(timer.getDelta(), timer.getElapsed());
  renderer.render(scene, camera);
});

renderer.setAnimationLoop(null);
```

`performance.now()` 返回高精度单调毫秒时间，不受系统时钟回拨影响。`Timer.update()` 不传参数时会内部读取它；在动画回调里通常直接传入回调的 `timestamp`。

## Delta 和 Elapsed

`delta` 是相邻两次更新之间的秒数。它适合累加状态：旋转、位置、动画混合器、物理步进、计时器倒计时。

```js
mesh.rotation.y += delta * speedRadiansPerSecond;
position.x += velocityUnitsPerSecond * delta;
mixer.update(delta);
```

`elapsed` 是从开始运行到现在的总秒数。它适合周期函数和可重复公式：呼吸缩放、闪烁、波浪、围绕原点转动。

```js
mesh.scale.setScalar(1 + Math.sin(elapsed * 3) * 0.18);
mesh.position.y = Math.sin(elapsed * 2) * 0.45;
```

常见边界：

- `delta` 每帧都变，帧率越不稳定越需要用它。
- `elapsed` 会持续增长，适合根据绝对运行时间求一个状态。
- `timestamp` 和 `performance.now()` 是毫秒，three.js 的 `Timer`、`AnimationMixer.update(...)` 使用秒。
- 后台恢复可能出现很大的 `delta`；业务更新常要 `Math.min(delta, maxDelta)`。

## Timer

`Timer` 是当前 three.js 推荐的时间对象。它先 `update(...)` 一次，再在同一帧内读取 `getDelta()` 和 `getElapsed()`；多次读取不会改变本帧结果。

```js
const timer = new THREE.Timer();
timer.connect(document);

renderer.setAnimationLoop((timestamp) => {
  timer.update(timestamp);

  const delta = Math.min(timer.getDelta(), 0.1);
  const elapsed = timer.getElapsed();

  mesh.rotation.y += delta * 1.8;
  mesh.position.y = Math.sin(elapsed * 2) * 0.35;
  renderer.render(scene, camera);
});
```

核心方法：

- `update(timestamp)`：每个 simulation step 调一次；必须先调它，再读 `delta` 或 `elapsed`。
- `getDelta()`：返回本次 `update` 和上次 `update` 的秒差。
- `getElapsed()`：返回经过 timescale 影响后的累计秒数。
- `setTimescale(value)`：缩放时间流速；`0` 可作为业务暂停，`0.5` 是半速，`2` 是二倍速。
- `connect(document)`：接入 Page Visibility API，页面隐藏后恢复时减少异常大 `delta`。
- `disconnect()` / `dispose()`：页面销毁或示例结束时清理监听和内部资源。

## 旧代码里的 Clock

`Clock` 常见于旧教程和旧项目，但从 three.js r183 起已经标记弃用；新代码不要再使用它，直接用 `Timer`。

读旧代码时只需要识别两个点：

- `clock.getDelta()` 大致对应 `timer.update(timestamp)` 之后的 `timer.getDelta()`。
- `clock.getElapsedTime()` 大致对应 `timer.update(timestamp)` 之后的 `timer.getElapsed()`。
- 迁移旧代码时，把每帧开头的 `clock.getDelta()` 改成 `timer.update(timestamp)`，再把本帧需要的 `delta` 和 `elapsed` 分别读出来。

## 业务状态

渲染帧不是业务步长。旋转预览可以每帧按 `delta` 更新；物理、棋盘状态、碰撞、倒计时结算这类业务逻辑更适合固定步长。

固定步长的做法是把 `delta` 放进累积器，再按固定 `step` 消耗它。这样业务更新次数和渲染帧率解耦，恢复标签页或低帧率时也更可控。

```js
const fixedStep = 1 / 60;
let accumulator = 0;

function frame(delta) {
  accumulator += Math.min(delta, 0.1);

  while (accumulator >= fixedStep) {
    updateSimulation(fixedStep);
    accumulator -= fixedStep;
  }

  renderScene();
}
```

判断方式：

- 只影响视觉平滑度：通常直接用 `delta`。
- 影响碰撞、计分、状态机或网络同步：优先固定步长。
- 暂停业务但保留画面交互：把 timescale 设为 `0`，或跳过业务更新但继续 render。
- 完全不需要重绘：停止 `setAnimationLoop`，交互发生时再恢复或按需渲染。

## 常见判断

| 现象 / 需求 | 先看哪里 | 判断 |
| --- | --- | --- |
| 高刷新率屏幕上动画变快 | 每帧固定增量 | 用 `delta * 每秒速度` 替代固定帧增量 |
| 同一帧里多个系统都需要时间 | `Timer.update()` 位置 | 每帧开头只 `update` 一次，之后多处读取 `getDelta()` / `getElapsed()` |
| 切回标签页后物体瞬移 | `delta` 上限和 `Timer.connect(document)` | 给业务 delta 加上最大值，例如 `0.1` 秒 |
| WebXR 或未来 XR 接入 | 循环入口 | 用 `renderer.setAnimationLoop(...)` |
| 需要慢动作、暂停、快进 | `Timer.setTimescale(...)` | 调整业务时间，不一定停止渲染循环 |
| 物理或规则状态不稳定 | 固定步长累积器 | 用 `while (accumulator >= step)` 消耗固定步长 |

## 记忆句

循环负责“何时画”，时间负责“推进多少”，业务状态负责“变成什么”。新代码用 `Timer`，`Clock` 只作为旧项目迁移时需要识别的名字。

## 参考示例

- 时间来源
  - [Timer Delta](src/scenes/timer-delta-scene.js)
  - [Timer Step](src/scenes/timer-step-scene.js)

- 业务状态
  - [Fixed Step](src/scenes/fixed-step-scene.js)

## 参考资料

- [Timer docs](https://threejs.org/docs/pages/Timer.html)
- [Clock docs](https://threejs.org/docs/pages/Clock.html)
- [WebGLRenderer docs](https://threejs.org/docs/pages/WebGLRenderer.html)
- [Window: requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)
- [Performance: now](https://developer.mozilla.org/en-US/docs/Web/API/Performance/now)
