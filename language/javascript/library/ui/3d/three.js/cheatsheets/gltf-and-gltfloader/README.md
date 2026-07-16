# 模型

`glTF/GLB` 是面向运行时传输的 3D 资产格式：它把场景树、网格、材质、贴图、相机和动画等信息交给 `GLTFLoader` 解析，再以 `Object3D` 层级进入 three.js 场景。

一句话记住：

> 加载模型不是只拿到一个 Mesh，而是拿到一棵可以遍历、取名、取尺寸、播放动画和释放资源的场景树。

## 格式定位

glTF 适合 Web 端展示，不是建模软件的工作文件。它的目标是把已经整理好的 3D 内容高效交给运行时读取。

| 形式 | 文件形态 | 适合场景 | 路径风险 |
| --- | --- | --- | --- |
| `.gltf` | JSON 主文件，通常引用 `.bin` 和贴图 | 调试、查看结构、手动检查路径 | 需要保持外部资源相对路径不丢 |
| `.glb` | 单个二进制文件 | 部署、分享、减少漏文件 | 文件不易直接查看内部结构 |

`.gltf` 和 `.glb` 都可以包含节点、mesh、材质、贴图、动画和相机。课程主线先只处理加载、节点和错误；动画播放放到后面的 `AnimationMixer` 课程。

## 加载链路

`GLTFLoader` 从 URL 读取 `.gltf` 或 `.glb`，返回的不是 three.js 自己新发明的模型类型，而是一个包含多个入口字段的加载结果。

```text
模型 URL
  指向 .glb 或 .gltf 主文件
        ↓
GLTFLoader
  解析 glTF JSON / binary / 外部 buffer / 贴图
        ↓
gltf
  scene / scenes / animations / cameras / asset / parser
        ↓
scene.add(gltf.scene)
  默认场景作为 Object3D 层级进入 three.js
        ↓
traverse / getObjectByName / Box3
  检查节点、筛选 Mesh、自动取尺寸和定位相机
```

最小加载代码：

```js
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
const gltf = await loader.loadAsync('/models/box/glTF-Binary/Box.glb');

scene.add(gltf.scene);
```

在 Vite 示例中，放进 `public/models/...` 的文件会以 URL 形式被开发服务器提供。`.gltf` 如果引用同目录的 `.bin` 或贴图，`GLTFLoader` 会按 `.gltf` 文件所在路径继续请求这些外部资源。

## 加载结果

- `gltf.scene`：默认场景，类型通常是 `Group`；最常用，直接 `scene.add(...)`。
- `gltf.scenes`：资产里全部场景；一个 glTF 可以定义多个 scene。
- `gltf.animations`：动画片段数组；只是数据，播放需要 `AnimationMixer`。
- `gltf.cameras`：资产自带相机；模型查看器通常仍会用自己的相机。
- `gltf.asset`：文件元数据，例如版本和生成器。
- `gltf.parser`：内部解析器；进阶时可读取依赖、扩展或缓存资源。

真实模型通常包含多层 `Object3D`，Mesh 往往藏在 group、空节点、骨骼或校正节点下面。加载后先把它当场景树处理，不要假设 `gltf.scene.children[0]` 一定就是要操作的网格。

## 路径与资源

路径错误是模型加载最常见的问题。先区分是哪一层失败：

- 主文件 URL 错：`.gltf` 或 `.glb` 自己请求失败，通常是 404、路径拼错或部署 base path 不对。
- 外部资源丢失：`.gltf` 请求成功，但里面的 `.bin`、贴图或压缩解码资源失败。
- 扩展解码器缺失：模型使用 Draco、Meshopt 或 KTX2 等压缩扩展，但没有给 `GLTFLoader` 配对应解码器。
- 跨域失败：模型放在其他域名时，服务器需要允许浏览器跨域读取资源。

课程示例把模型放进 `public/models/box/...`，是为了让 `.gltf -> Box0.bin` 的相对路径在开发和构建后都保持一致。后续真实项目可以继续用 `public`，也可以把模型托管到 CDN，但要同时检查主文件和它引用的所有子资源。

## 节点与尺寸

模型进场以后，常见的第一步是遍历节点、筛选 Mesh、读取名称和计算包围盒。

```js
gltf.scene.traverse((object) => {
  if (object.isMesh) {
    object.castShadow = true;
    object.receiveShadow = true;
  }
});

const target = gltf.scene.getObjectByName('body_mesh_node');
```

用 `Box3.setFromObject(...)` 可以按世界变换计算模型尺寸，适合自动居中、自动调整相机和显示选中框。计算前如果不确定父节点矩阵是否最新，先调用 `object.updateWorldMatrix(true, true)`。

```js
const box = new THREE.Box3().setFromObject(gltf.scene, true);
const center = box.getCenter(new THREE.Vector3());
const size = box.getSize(new THREE.Vector3());
```

尺寸读数是世界轴对齐包围盒，不是模型作者在 DCC 软件里看到的局部尺寸。模型有旋转、缩放或多层父节点时，优先按世界尺寸判断画面里应该怎么摆放。

## 加载状态与错误

`LoadingManager` 适合统一观察一组资源的开始、进度、完成和错误。`loader.loadAsync(...)` 适合用 `try/catch` 写清楚成功和失败路径。

```js
const manager = new THREE.LoadingManager();
manager.onProgress = (url, loaded, total) => {
  console.log(`loaded ${loaded}/${total}: ${url}`);
};

const loader = new GLTFLoader(manager);

try {
  const gltf = await loader.loadAsync(modelUrl);
  scene.add(gltf.scene);
} catch (error) {
  console.error('模型加载失败', error);
}
```

出错时不要让画面停在空白状态。至少给 UI 写入失败 URL、错误信息和可重试动作；查看器类页面可以显示一个占位模型或错误状态，让用户知道渲染器仍然正常。

## 渲染与释放

glTF 材质常用 PBR，需要光照、颜色管理和合适的相机距离。模型加载成功但看起来发黑时，先检查灯光和材质类型；模型太小或太大时，先用 `Box3` 取尺寸再调整相机，不要盲目改 `scale`。

替换模型或销毁页面时，需要释放模型树里的 geometry、material 和 texture。`GLTFLoader` 文档还提醒：通过 ImageBitmap 加载的图片不会自动被垃圾回收；如果纹理图片对象提供 `close()`，释放时也应关闭。

## 常见判断

| 现象 / 需求 | 先看哪里 | 判断 |
| --- | --- | --- |
| 加载 `.gltf` 失败但 URL 正确 | 浏览器 Network 面板 | 常见是 `.bin`、贴图或解码器路径丢失 |
| `.glb` 能加载，`.gltf` 不行 | `.gltf` 内部 `buffers/images.uri` | `.gltf` 依赖多个相对资源，部署时要一起放 |
| 模型加载了但看不到 | `Box3` 尺寸、相机位置、灯光 | 可能太大、太小、在相机后面或材质需要光 |
| 操作某个零件找不到 | `traverse()` 输出的节点树 | 模型节点名来自导出文件，不要猜 children 下标 |
| 颜色或明暗不对 | 材质、灯光、环境、renderer 颜色空间 | PBR 模型通常需要合理光照和 `SRGBColorSpace` 输出 |
| 替换模型后内存升高 | dispose 流程 | 旧 geometry/material/texture 没释放 |
| 需要播放内置动画 | `gltf.animations` | 加载课只读动画数组，播放交给 `AnimationMixer` |

## 记忆句

`.glb` 更像部署包，`.gltf` 更像可检查的清单；模型加载失败时，先判断主文件失败还是清单里的资源失败。

拿到 `gltf.scene` 后，把它当一棵 `Object3D` 场景树：先遍历，再取尺寸，再决定相机、交互和资源释放。

## 参考示例

- 加载与格式
  - [GLTFLoader](src/scenes/gltf-loader-scene.js)

- 节点与尺寸
  - [Scene Nodes](src/scenes/scene-nodes-scene.js)

- 错误处理
  - [Loading Errors](src/scenes/loading-errors-scene.js)

## 参考资料

- [GLTFLoader docs](https://threejs.org/docs/pages/GLTFLoader.html)
- [LoadingManager docs](https://threejs.org/docs/pages/LoadingManager.html)
- [Object3D docs](https://threejs.org/docs/pages/Object3D.html)
- [Box3 docs](https://threejs.org/docs/pages/Box3.html)
- [three.js Manual: Loading a .GLTF File](https://threejs.org/manual/en/load-gltf.html)
- [Khronos glTF Tutorial](https://github.khronos.org/glTF-Tutorials/gltfTutorial/)
- [Khronos glTF Sample Assets: Box](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/Box)
- [模型格式对照](../../references/model.md)
