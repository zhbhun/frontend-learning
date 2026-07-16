# 动画

`AnimationMixer` 把 `AnimationClip` 里的关键帧数据播放到一个 `Object3D` 根对象上：`AnimationAction` 决定某个片段怎样播放，`mixer.update(delta)` 在每帧把时间推进到对象属性。

一句话记住：

> glTF 负责带来 clips，mixer 负责推进时间，action 负责播放状态。

## 播放链路

glTF 里的动画不是自动播放的。`GLTFLoader` 只把动画数据解析成 `AnimationClip[]`；你需要给模型根对象创建 `AnimationMixer`，再把某个 clip 变成 action 并在渲染循环里更新 mixer。

```text
GLTFLoader.loadAsync(url)
  得到 gltf.scene 和 gltf.animations
        ↓
new AnimationMixer(gltf.scene)
  绑定动画要写入的 Object3D 根对象
        ↓
mixer.clipAction(clip)
  为某个 AnimationClip 创建或复用 AnimationAction
        ↓
action.reset().play()
  把这个 action 调度进 mixer
        ↓
mixer.update(delta)
  每帧按秒推进，写回节点 position / quaternion / scale / morph weights
```

最小播放代码：

```js
const gltf = await loader.loadAsync('/models/animated-cube/AnimatedCube.gltf');
scene.add(gltf.scene);

const mixer = new THREE.AnimationMixer(gltf.scene);
const action = mixer.clipAction(gltf.animations[0]);
action.play();

renderer.setAnimationLoop((timestamp) => {
  timer.update(timestamp);
  mixer.update(Math.min(timer.getDelta(), 0.1));
  renderer.render(scene, camera);
});
```

`AnimationMixer.update(...)` 使用秒，和 `Timer.getDelta()` 的单位一致。不要把毫秒时间戳直接传给 mixer。

## Clip、Mixer、Action

- `AnimationClip`：可复用的关键帧集合，包含 `name`、`duration` 和 `tracks`。从 glTF 加载时通常由 loader 自动生成，不需要手写构造。
- `KeyframeTrack`：clip 里的单条属性轨道，例如某个节点的 `position`、`quaternion`、`scale` 或 morph target 权重。
- `AnimationMixer(root)`：一个 root 对应一个播放器；同一模型的多个动作通常共用一个 mixer。
- `mixer.clipAction(clip)`：把 clip 变成 action；同一个 clip 和 root 多次调用会返回同一个 action。
- `AnimationAction`：控制这个 clip 的播放、暂停、循环、速度、权重和淡入淡出。

查找指定片段时用 `AnimationClip.findByName(...)`，不要依赖 `gltf.animations[0]` 永远是某个固定动作。

```js
const clip = THREE.AnimationClip.findByName(gltf.animations, 'Run');
const action = mixer.clipAction(clip);
action.reset().play();
```

## Action 状态

`play()` 只是把 action 放进 mixer 调度队列；真正更新发生在后续的 `mixer.update(delta)`。`reset()` 会把本 action 的局部时间归零，常和 `play()` 一起用于重新播放。

| API / 属性 | 影响 | 常见判断 |
| --- | --- | --- |
| `play()` | 开始调度 action | 不调用 `mixer.update(delta)` 仍然不会动 |
| `reset()` | 把 action 时间回到开头 | 切换动作或重播前常用 |
| `stop()` | 停止 action 并重置 | 直接切换、销毁或释放前常用 |
| `paused` | 暂停单个 action | 只停这个动作，不一定停整个 mixer |
| `timeScale` / `setEffectiveTimeScale(...)` | 改变单个 action 的速度 | `0` 等于暂停，负数可倒放 |
| `mixer.timeScale` | 改变整个 mixer 的速度 | 适合暂停同一模型上的所有 actions |
| `setLoop(mode, repetitions)` | 设置循环方式和次数 | `LoopOnce` 会忽略 repetitions |
| `clampWhenFinished` | 自然播放结束后停在最后一帧 | 被打断或手动 stop 时不起作用 |
| `weight` / `setEffectiveWeight(...)` | 控制 action 影响强度 | 多个 action 混合时观察权重 |

循环模式：

- `LoopRepeat`：循环播放；`repetitions` 控制重复次数，默认可以无限循环。
- `LoopOnce`：只播放一次；自然结束后会触发 `finished` 事件。
- `LoopPingPong`：正放、反放交替循环；适合往返动作。

## 切换与混合

直接切换最简单：停掉旧 action，重置并播放新 action。它适合菜单选择、演示切换和不需要过渡的动作。

```js
oldAction.stop();
newAction.reset().play();
```

平滑切换用 `crossFadeTo(...)`。它会在指定时长里降低旧 action 权重、提高新 action 权重；第三个参数 `warp` 为 `true` 时，会临时调整速度，让两个片段在过渡中更容易对齐。

```js
newAction.reset().setEffectiveWeight(1).play();
oldAction.crossFadeTo(newAction, 0.6, true);
```

混合不是只用于角色动画。只要多个 action 作用到同一个 root，它们就可以用权重共同影响结果；但如果多个 action 同时控制同一个属性，最终姿态会由权重合成，调试时要看 `getEffectiveWeight()`。

## glTF 动画数据

glTF 动画由 sampler 和 channel 连接起来。sampler 决定“某个时间点之间怎样插值”，channel 决定“插值结果写到哪个节点的哪个属性”。

常见目标：

- `translation`：写入节点位移，three.js 中对应 `position`。
- `rotation`：写入节点四元数，three.js 中对应 `quaternion`。
- `scale`：写入节点缩放。
- `weights`：写入 morph target 权重。

常见插值：

- `STEP`：跳变，不插值。
- `LINEAR`：线性插值；旋转用球面插值。
- `CUBICSPLINE`：带切线的平滑曲线，数据量更大。

本课示例里的 `AnimatedCube.gltf` 自带三个 clip：`Slide` 控制 `translation`，`Spin` 控制 `rotation`，`Pulse` 控制 `scale`。它们故意拆开，便于观察 action 对不同轨道的影响。

## 生命周期

替换模型或销毁页面时，先停止 mixer 里的 action，再释放 mixer 缓存和模型资源。

```js
mixer.stopAllAction();
mixer.uncacheRoot(gltf.scene);
disposeObjectTree(gltf.scene);
```

`uncacheAction(...)`、`uncacheClip(...)` 和 `uncacheRoot(...)` 都要求相关 action 已经停止。真实项目里还要释放模型树里的 geometry、material 和 texture；如果纹理图片由 `ImageBitmap` 承载，释放时也要注意关闭图片对象。

## 常见判断

| 现象 / 需求 | 先看哪里 | 判断 |
| --- | --- | --- |
| 模型加载了但不动 | `action.play()` 和 `mixer.update(delta)` | action 只调度，mixer 每帧更新才会写回属性 |
| 动画速度不对 | `delta` 单位 | mixer 要秒，不要传毫秒 timestamp |
| 切换动作后姿态跳变 | `stop()` / `reset()` / `crossFadeTo()` | 直接 stop 是硬切；平滑过渡用 cross fade |
| 播一次后没有停在最后 | `LoopOnce` 和 `clampWhenFinished` | clamp 只在自然播完时生效 |
| 暂停一个动作还是全部动作 | `action.paused` / `mixer.timeScale` | 单动作暂停改 action，整组暂停改 mixer |
| 多个动作同时影响结果 | `getEffectiveWeight()` | 权重不为 0 的 action 都可能写入属性 |
| 重新加载模型后内存升高 | `stopAllAction()` 和 `uncacheRoot()` | 释放模型前先停 action，再清 mixer 缓存和对象资源 |
| 找不到指定动作 | `gltf.animations.map(clip => clip.name)` | 动作名来自资产，不要猜数组下标 |

## 记忆句

`AnimationClip` 是数据，`AnimationAction` 是播放按钮和混音推子，`AnimationMixer` 是真正随时间推进的播放器。

看到 glTF 动画先问三件事：clip 叫什么、mixer 绑在哪个 root、每帧有没有传秒级 delta。

## 参考示例

- 播放链路
  - [AnimationClip](src/scenes/clip-playback-scene.js)

- 状态控制
  - [AnimationAction](src/scenes/action-controls-scene.js)

- 切换混合
  - [Cross Fade](src/scenes/cross-fade-scene.js)

## 参考资料

- [AnimationMixer docs](https://threejs.org/docs/pages/AnimationMixer.html)
- [AnimationAction docs](https://threejs.org/docs/pages/AnimationAction.html)
- [AnimationClip docs](https://threejs.org/docs/pages/AnimationClip.html)
- [GLTFLoader docs](https://threejs.org/docs/pages/GLTFLoader.html)
- [Timer docs](https://threejs.org/docs/pages/Timer.html)
- [Khronos glTF Tutorial: Animations](https://github.khronos.org/glTF-Tutorials/gltfTutorial/gltfTutorial_007_Animations.html)
