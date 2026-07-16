# 物理

`Rapier` 给 three.js 场景增加一个独立的物理世界：`World` 负责模拟，`RigidBody` 负责运动状态，`Collider` 负责碰撞形状，three.js 的 `Object3D` 只负责把模拟结果画出来。

一句话记住：

> 物理世界不认识 mesh；先让 Rapier step，再把 body 的位置和旋转同步回 `Object3D`。

## 对象关系

Rapier 和 three.js 是两套对象。你通常为同一个“物体”同时保存一个可见对象和一个物理对象。

```text
await RAPIER.init()
  加载 compat 包内嵌的 WASM
        ↓
new RAPIER.World(gravity)
  保存重力、刚体、碰撞体、求解器状态
        ↓
RigidBody + Collider
  body 管动态/固定/kinematic 运动，collider 管形状和接触
        ↓
world.step()
  推进一小段物理时间
        ↓
body.translation() / body.rotation()
  写回 mesh.position / mesh.quaternion
```

`Mesh` 的几何体不会自动变成碰撞体。`BoxGeometry`、`SphereGeometry`、模型 mesh 和 Rapier 的 `ColliderDesc.cuboid(...)`、`ball(...)`、`capsule(...)`、`trimesh(...)` 是两件事。

## 初始化

`@dimforge/rapier3d-compat` 把 WASM 内嵌在包里，但仍然必须异步初始化。页面要先显示加载状态，等 `await RAPIER.init()` 完成后再创建 `World`、`RigidBody` 或 `Collider`。

```js
import RAPIER from '@dimforge/rapier3d-compat';

await RAPIER.init();

const gravity = { x: 0, y: -9.81, z: 0 };
const world = new RAPIER.World(gravity);
```

常见规则：

- `RAPIER.init()`：只需要等一次；示例里用共享 promise 避免重复初始化。
- `new RAPIER.World(gravity)`：创建一套物理状态；重力单位跟场景单位一致时最省心。
- 加载失败：不要继续创建世界；把错误显示到页面或控制台。
- `World` 不渲染任何东西；画面仍由 three.js 的 `renderer.render(scene, camera)` 负责。

## Body 和 Collider

`RigidBody` 是运动身份，`Collider` 是碰撞形状。只有 body 没有 collider 时，它没有可接触的形状；只有 collider 没有关联动态 body 时，它通常作为固定环境参与碰撞。

| 类型 | 创建方式 | 适合 | 运动来源 |
| --- | --- | --- | --- |
| dynamic | `RigidBodyDesc.dynamic()` | 掉落箱子、球、可被推的物体 | 重力、速度、力、接触求解 |
| fixed | `RigidBodyDesc.fixed()` | 地面、墙、静态障碍 | 不被力移动 |
| kinematic position | `RigidBodyDesc.kinematicPositionBased()` | 平台、电梯、门、玩家代理 | 用户写入下一帧位置/旋转 |
| kinematic velocity | `RigidBodyDesc.kinematicVelocityBased()` | 按速度控制的移动平台 | 用户写入速度 |

常用碰撞体：

- `ColliderDesc.cuboid(x, y, z)`：参数是半尺寸，不是完整宽高深。
- `ColliderDesc.ball(radius)`：球形，适合球、圆滑拾取范围和简化碰撞。
- `ColliderDesc.capsule(halfHeight, radius)`：主轴沿 Y，常用于角色代理。
- `ColliderDesc.trimesh(vertices, indices)`：按三角网格做静态环境；不要轻易挂到 dynamic body 上。
- `setFriction(...)` / `setRestitution(...)`：摩擦和弹性会影响接触后的滑动、反弹。
- `setActiveEvents(...)`：需要 collision/contact 事件时，在相关 collider 上显式打开。

## Step 和时间

物理模拟喜欢固定时间步。渲染帧率会波动，如果把每帧真实 `delta` 直接塞进物理求解，碰撞、堆叠和弹性会更容易抖动或穿透。

```js
const fixedStep = 1 / 60;
let accumulator = 0;

function frame(delta) {
  accumulator += Math.min(delta, 0.1);

  while (accumulator >= fixedStep) {
    world.timestep = fixedStep;
    world.step();
    accumulator -= fixedStep;
  }

  syncMeshesFromBodies();
}
```

判断方式：

- 普通动画：`mesh.rotation.y += delta * speed` 可以直接用渲染 `delta`。
- 物理：优先用固定步长和 accumulator。
- 后台恢复或卡顿：先 clamp 大 `delta`，避免一次补太多步把页面卡死。
- 事件读取：接触事件通常在 `world.step(eventQueue)` 后 drain。

## Mesh 同步

Rapier 的 body 是真状态，three.js 的 mesh 是可视化状态。每次 step 后读取 body，再写给 mesh。

```js
const position = body.translation();
const rotation = body.rotation();

mesh.position.set(position.x, position.y, position.z);
mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
```

同步方向要分清：

- dynamic：Rapier 推动 body，mesh 跟随 body。
- fixed：通常创建后不动；mesh 和 collider 初始位置要一致。
- kinematic：你的控制代码先写 `setNextKinematicTranslation(...)` 或 `setNextKinematicRotation(...)`，Rapier 在下一次 step 中推导速度，再让 dynamic body 和它互动。
- 直接 `setTranslation(...)`：更像瞬移；对 dynamic body 可用于重置，不适合每帧控制平台。

## 单位和尺寸

把 three.js 单位当作米来用最省心：人物 1-2 单位高，箱子 0.5-2 单位，地面几十单位。不要把米级重力和几百上千单位的大模型直接混在一起。

- `gravity.y = -9.81`：适合“1 单位约等于 1 米”的场景。
- collider 参数：通常跟 mesh 尺寸成同一比例；`cuboid(0.5, 0.5, 0.5)` 对应 1x1x1 的盒子。
- 过小物体：容易受数值误差影响，接触抖动更明显。
- 过大模型：相机能看见不代表物理尺度合理；先统一模型缩放，再创建 collider。

## 接触和查询

接触事件和场景查询是物理的入门边界：事件回答“step 后发生了什么”，查询回答“如果从这里探出去会碰到什么”。

- collision event：给 collider 设置 `ActiveEvents.COLLISION_EVENTS`，再用 `EventQueue` drain 开始/结束接触。
- contact force event：适合做撞击力度、落地重击、破碎阈值；只在需要力大小时打开。
- sensor collider：只检测相交，不产生实体阻挡，适合触发区。
- `world.castRay(...)`：物理世界里的 raycast，不等于 three.js `Raycaster`；它命中 collider。
- `world.castShape(...)`：把一个形状扫出去，常用于角色移动前的障碍检测。

## 生命周期

物理和渲染都要清理。离开页面、重置示例或删除物体时，同时处理 Rapier 对象、three.js 资源和循环副作用。

```text
停止 requestAnimationFrame
        ↓
world.removeRigidBody(body) / world.removeCollider(collider, true)
        ↓
scene.remove(mesh)
        ↓
geometry.dispose() / material.dispose()
        ↓
renderer.dispose()
```

常见规则：

- 删除一个带 collider 的 body，优先让 `World` 移除 body，关联的 collider 会跟着离开物理世界。
- 只从 scene 移除 mesh 不会删除 body；body 还会继续参与模拟。
- 只从 world 移除 body 不会释放 three.js geometry/material。
- 页面隐藏或组件卸载时停止 loop；不要让物理世界在不可见页面里继续 step。

## 常见判断

| 现象 / 需求 | 先看哪里 | 判断 |
| --- | --- | --- |
| 页面一打开报 WASM 或 raw 指针错误 | `await RAPIER.init()` | compat 包必须先初始化，再使用 `World` |
| mesh 穿过地面 | collider 尺寸和位置 | mesh 形状不等于 collider；检查半尺寸、半高和 body translation |
| 盒子看着很大但物理像很小 | 单位和 scale | 先统一 mesh 尺寸和 collider 参数，不要只缩放可见 mesh |
| 堆叠一卡顿就爆开 | fixed timestep | 不要直接用大 `delta` 做一次 step |
| kinematic 平台推不动物体 | `setNextKinematicTranslation(...)` | 每个物理 step 前写下一位置，让 Rapier 推导速度 |
| 碰撞没有事件 | `setActiveEvents(...)` 和 `world.step(eventQueue)` | 事件要在 collider 开启，并在 step 后 drain |
| 重置后对象还在碰撞 | Rapier 生命周期 | 只 dispose mesh 不够，body/collider 还在 world 里 |
| 构建产物很大 | Rapier compat WASM | compat 包内嵌 WASM，chunk warning 属于预期成本 |

## 记忆句

Rapier 管“会不会撞、怎么动”，three.js 管“看起来是什么”。

每个动态物体都要成对思考：`RigidBody + Collider` 是物理本体，`Mesh` 是跟随它的可视外壳。

## 参考示例

- 初始化、World 和 mesh/body 同步
  - [动态刚体掉落到固定地面](src/scenes/falling-bodies-scene.js)

- Collider 形状
  - [mesh 形状与 collider 形状对照](src/scenes/collider-shapes-scene.js)

- Step 时间
  - [variable delta 与 fixed timestep 对比](src/scenes/fixed-step-scene.js)

- Kinematic 控制
  - [位置型 kinematic 平台](src/scenes/kinematic-control-scene.js)

- 接触事件
  - [EventQueue 与 collision event 计数](src/scenes/contact-events-scene.js)

## 参考资料

- [Rapier JavaScript getting started](https://rapier.rs/docs/user_guides/javascript/getting_started_js/)
- [Rapier JavaScript rigid-bodies](https://rapier.rs/docs/user_guides/javascript/rigid_bodies/)
- [Rapier JavaScript colliders](https://rapier.rs/docs/user_guides/javascript/colliders/)
- [Rapier JavaScript scene queries](https://rapier.rs/docs/user_guides/javascript/scene_queries/)
- [Rapier JavaScript advanced collision-detection](https://rapier.rs/docs/user_guides/javascript/advanced_collision_detection/)
- [three.js RapierPhysics docs](https://threejs.org/docs/#examples/en/physics/RapierPhysics)
- [Object3D docs](https://threejs.org/docs/#api/en/core/Object3D)
- [WebGLRenderer docs](https://threejs.org/docs/pages/WebGLRenderer.html)
