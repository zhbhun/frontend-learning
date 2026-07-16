# 明暗与阴影

明暗来自受光材质、法线和 Light 的共同计算；阴影来自 shadow map：光源先用自己的相机记录深度，再在主渲染里判断片元是否被挡住。

一句话记住：

> 光照让表面有亮暗，阴影让物体之间产生遮挡关系；两者相关，但开关和调试链路不同。

## 概念定位

| 概念 | 负责什么 | 判断句 |
| --- | --- | --- |
| 受光材质 | 响应 Light 和法线 | `MeshStandardMaterial`、`MeshLambertMaterial`、`MeshPhongMaterial` 会受光 |
| 不受光材质 | 自己决定颜色 | `MeshBasicMaterial` 不会因灯光变亮变暗 |
| 环境类光 | 补全基础亮度 | `AmbientLight`、`HemisphereLight` 分开观察，避免均匀补光和上下色差互相干扰 |
| 方向类光 | 建立主光方向 | `DirectionalLight` 只观察平行光方向，阴影链路放到单独示例 |
| 局部光 | 有位置、距离和衰减 | `PointLight`、`SpotLight` 分开观察点光衰减和聚光锥 |
| shadow map | 从光源视角生成深度图 | 需要 renderer、light、caster、receiver 都满足条件 |

## 光源分类

| 分类 | 光源 | 独立示例 | 关键观察 |
| --- | --- | --- | --- |
| 环境类光 | `AmbientLight(color, intensity)` | `ambient-light.html` | 全场均匀补光，没有方向，不产生阴影 |
| 环境类光 | `HemisphereLight(skyColor, groundColor, intensity)` | `hemisphere-light.html` | 天空色和地面色混合出上下色差，不产生阴影 |
| 方向类光 | `DirectionalLight(color, intensity)` | `directional-light.html` | `position -> target` 决定平行光方向 |
| 局部光 | `PointLight(color, intensity, distance, decay)` | `point-light.html` | 从一点向四周发光，距离和衰减影响明显 |
| 局部光 | `SpotLight(color, intensity, distance, angle, penumbra, decay)` | `spot-light.html` | 用目标点、锥角和半影控制局部照明范围 |

## 阴影条件

阴影至少需要四个开关同时成立。

| 条件 | 写法 | 说明 |
| --- | --- | --- |
| 渲染器允许 shadow map | `renderer.shadowMap.enabled = true` | 全局阴影开关 |
| 光源投射阴影 | `light.castShadow = true` | 不是所有光都能投射阴影 |
| 物体投射阴影 | `mesh.castShadow = true` | 遮挡者需要打开 |
| 物体接收阴影 | `ground.receiveShadow = true` | 承接阴影的表面需要打开 |
| 受光材质可见阴影 | 使用受光材质 | `MeshBasicMaterial` 不适合观察光影 |

```js
renderer.shadowMap.enabled = true;

light.castShadow = true;
mesh.castShadow = true;
ground.receiveShadow = true;
```

## DirectionalLight 阴影相机

`DirectionalLight` 的阴影相机是一个正交相机。阴影只会在这个相机覆盖的区域里生成；范围太小会裁掉阴影，范围太大则 shadow map 像素被摊薄。

| 参数 | 含义 | 观察方式 |
| --- | --- | --- |
| `shadow.camera.left/right/top/bottom` | 阴影相机覆盖范围 | 用 `CameraHelper` 看是否包住投影物和接收面 |
| `shadow.camera.near/far` | 阴影深度范围 | 太窄会裁切，太宽会降低精度 |
| `shadow.mapSize` | 阴影贴图尺寸 | 越大越清晰，代价越高；通常用 2 的幂 |
| `shadow.bias` | 深度比较偏移 | 微调阴影痤疮和漂浮问题 |
| `shadow.normalBias` | 沿法线偏移采样位置 | 浅角度照明时常用 |
| `shadow.radius` | 阴影边缘模糊 | 对 `BasicShadowMap` 无效 |

```js
light.shadow.mapSize.set(1024, 1024);
light.shadow.camera.left = -5;
light.shadow.camera.right = 5;
light.shadow.camera.top = 5;
light.shadow.camera.bottom = -5;
light.shadow.bias = -0.001;
light.shadow.normalBias = 0.018;
light.shadow.camera.updateProjectionMatrix();
```

## 常见判断

| 现象 | 优先检查 |
| --- | --- |
| 完全没有阴影 | `renderer.shadowMap.enabled`、`light.castShadow`、`mesh.castShadow`、`receiveShadow` |
| 物体有明暗但没影子 | 光照链路正常，阴影链路至少一个开关没开 |
| 阴影被切掉 | 阴影相机范围没有包住 caster 或 receiver |
| 阴影锯齿明显 | 提高 `mapSize`、缩小阴影相机范围或调整 shadow type |
| 表面出现脏斑 | 小幅调整 `bias` / `normalBias` |
| 阴影看起来漂浮 | `bias` 或 `normalBias` 可能过大 |

## 记忆句

明暗先看材质是否受光，再看光源类型和强度；阴影先看四个开关，再看 shadow camera 是否覆盖正确。

## 参考示例

环境类光示例只看补光：

```js
const ambient = new THREE.AmbientLight('#ffffff', 0.85);
const hemisphere = new THREE.HemisphereLight('#8ec8ff', '#c28a4e', 1.15);
```

方向类光示例只看 `position -> target`：

```js
const light = new THREE.DirectionalLight('#ffffff', 2.2);
const target = new THREE.Object3D();

light.position.set(-2.8, 4.2, 3.4);
target.position.set(0, -0.1, 0);
light.target = target;
```

局部光示例只看范围和形状：

```js
const point = new THREE.PointLight('#ffcc88', 24, 5, 2);
const spot = new THREE.SpotLight('#fff1b8', 42, 8, Math.PI / 8, 0.35, 2);
```

阴影示例只用 `DirectionalLight` 演示 shadow map 链路：

```js
renderer.shadowMap.enabled = true;
light.castShadow = true;
main.castShadow = true;
ground.receiveShadow = true;

const helper = new THREE.CameraHelper(light.shadow.camera);
scene.add(helper);
```

观察重点：

- `ambient-light.html`：调低强度时受光材质整体变暗，但不会出现方向性亮面；`MeshBasicMaterial` 对照物不随灯光变化。
- `hemisphere-light.html`：改天空色和地面色，物体上侧和下侧会出现不同色彩倾向。
- `directional-light.html`：移动光源 X/Z 或目标 X，亮面方向会改变；它不是靠距离衰减变暗。
- `point-light.html`：缩短 `distance` 或增大 `decay`，离点光更远的表面会更快变暗。
- `spot-light.html`：缩小 `angle` 会收窄光锥，增大 `penumbra` 会让边缘更柔和。
- `shadow-map.html`：关闭任意一个阴影链路开关，阴影都会消失。
- `shadow-map.html`：调小阴影相机范围会裁掉阴影，调得过大阴影会变粗糙。
- `shadow-map.html`：`bias` 和 `normalBias` 是微调项，数值过大会让阴影和物体分离。

## 参考资料

- [Light docs](https://threejs.org/docs/pages/Light.html)
- [AmbientLight docs](https://threejs.org/docs/pages/AmbientLight.html)
- [HemisphereLight docs](https://threejs.org/docs/pages/HemisphereLight.html)
- [DirectionalLight docs](https://threejs.org/docs/pages/DirectionalLight.html)
- [PointLight docs](https://threejs.org/docs/pages/PointLight.html)
- [SpotLight docs](https://threejs.org/docs/pages/SpotLight.html)
- [LightShadow docs](https://threejs.org/docs/pages/LightShadow.html)
- [DirectionalLightShadow docs](https://threejs.org/docs/pages/DirectionalLightShadow.html)
- [WebGLRenderer docs](https://threejs.org/docs/pages/WebGLRenderer.html)
- [MeshStandardMaterial docs](https://threejs.org/docs/pages/MeshStandardMaterial.html)
