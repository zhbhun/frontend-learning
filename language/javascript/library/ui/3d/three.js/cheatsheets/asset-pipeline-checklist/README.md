# 资产

`资产管线` 是把模型从来源、授权、制作、导出、压缩、验证到部署路径串起来的约定：它决定模型能不能稳定进入 `GLTFLoader`，也决定后续查看器、交互和性能优化有没有可靠基础。

一句话记住：

> 资产不是“拿到一个 GLB 就结束”，而是每次交付都能说清来源、结构、尺寸、贴图、压缩、验证结果和运行时依赖。

## 管线链路

Web 端 three.js 项目通常把 `glTF/GLB` 当作运行时交付格式。建模软件、资源市场和压缩工具都在运行时之前工作；three.js 只负责加载已经整理好的结果。

```text
模型来源
  授权、格式、贴图、动画、面数和用途先过筛
        ↓
DCC 整理
  在 Blender 等工具里统一单位、原点、命名、材质和贴图路径
        ↓
glTF / GLB 导出
  生成运行时格式，决定单文件还是多文件、是否带动画和相机
        ↓
压缩与优化
  控制几何、贴图、draw call、文件体积和解码依赖
        ↓
验证与预览
  用 Validator、Sample Viewer 和项目查看器确认结构与效果
        ↓
部署路径
  放到 public 或 CDN，保证主文件、外部资源和解码器路径可请求
```

## 来源判断

先判断资产能不能进入当前项目，再判断好不好看。

- `授权`：确认商业使用、署名、再分发、修改和压缩后的发布权限；没有授权记录就不要进项目。
- `格式`：优先要 `glTF/GLB`；拿到 `FBX/OBJ/USDZ/STL` 时先规划转换损耗和材质丢失风险。
- `复杂度`：记录文件体积、顶点数、三角面数、材质数、贴图张数和最大贴图尺寸。
- `贴图`：确认 base color、normal、roughness、metalness、alpha、AO 是否齐全，颜色贴图和数据贴图不要混用颜色空间。
- `动画`：确认动作名称、时长、循环方式、骨骼数量和是否需要保留节点层级。
- `命名`：交互、拾取、换材质、显隐和动画绑定依赖稳定节点名；压缩前先确认哪些名字不能丢。
- `目标设备`：移动端优先限制贴图尺寸、draw call 和透明材质数量；桌面展示可以保留更多细节。

## Blender 导出

Blender 是整理资产的常用中转站。它适合做单位、原点、命名、材质、动画和贴图关系检查，不适合把 Web 运行时问题留到加载器里碰运气。

- `单位和比例`：确认模型真实尺寸；导出前用一个已知尺寸对象对照，避免进查看器后只能靠盲目 `scale` 修正。
- `变换`：必要时应用旋转和缩放，让模型根节点的 transform 简洁；需要保留动画或层级控制时不要乱合并。
- `原点`：产品展示通常把原点放在模型中心或底部中心；围绕错误原点旋转会让 OrbitControls 观感很差。
- `命名`：给需要交互的节点、材质和动画写稳定名称；不要依赖 `Cube.001` 这类临时名。
- `材质`：优先使用 glTF 支持的 PBR 结构；复杂节点、程序纹理或非标准 shader 可能导出后变成近似结果。
- `贴图`：导出前确认图片文件存在、路径可追踪、尺寸合理；颜色贴图和法线/粗糙度等数据贴图分开记录。
- `格式`：部署常用 `.glb`，因为主文件和资源在一个包里；调试结构或需要 CDN 分发贴图时可用 `.gltf + .bin + images`。
- `动画`：只导出需要的动作；确认动作名、帧率、循环段和骨骼绑定没有在优化时被破坏。

## 压缩与优化

优化前先保留原始导出物。每次压缩都要留下命令、工具版本和验证结果，否则后面很难解释某个节点、材质或动画为什么变了。

| 目标 | 常用手段 | three.js 运行时依赖 | 风险 |
| --- | --- | --- | --- |
| 减少几何体积 | Draco、Meshopt、quantization、simplify | Draco 需要 `DRACOLoader`；Meshopt 需要 `setMeshoptDecoder(...)` | 解码耗时、精度损失、节点结构变化 |
| 减少贴图下载 | WebP、AVIF、JPEG、KTX2 / Basis Universal | KTX2 需要 `KTX2Loader`；WebP / AVIF 依赖浏览器支持和 glTF 扩展 | 画质损失、透明通道、兼容性 |
| 减少 draw call | 合并 mesh、合并材质、实例化 | 通常不需要额外 loader | 交互粒度、节点名和单独换材质能力变差 |
| 减少无用数据 | prune、dedup、resample animation | 通常不需要额外 loader | 误删备用节点、动画采样变化 |

先用 `gltf-transform inspect input.glb` 或查看器统计读出瓶颈：几何重、贴图重、draw call 多，处理方式完全不同。不要把所有模型都套同一条压缩命令。

常见方向：

```bash
gltf-transform inspect input.glb
gltf-transform optimize input.glb output.glb --texture-compress webp
gltfpack -i input.glb -o output.glb
```

这些命令是起点，不是固定答案。真实项目要根据目标设备、节点保留、动画质量和贴图格式支持逐步收紧参数。

## 部署路径

`.glb` 只有一个主文件，路径判断相对简单。`.gltf` 是清单文件，里面可能引用 `.bin`、贴图和压缩资源；部署时必须保持相对路径。

- 放在 Vite `public/models/...` 下的文件，会按站点根路径直接请求，例如 `/models/chair/chair.glb`。
- 使用子路径部署时，模型 URL 要跟随应用的 base path；不要把开发环境里的绝对路径写死到生产代码。
- 使用 CDN 时，主文件、外部 `.bin`、图片、KTX2 和解码器资源都要允许跨域读取。
- Draco、Meshopt、KTX2 的解码器路径也属于资产管线；模型用了压缩扩展，运行时就必须配置对应 loader。
- 给稳定模型设置长缓存时，文件名要带版本或哈希；否则用户可能看到旧模型和新代码混在一起。

## 验证顺序

每个资产至少过四次验证：格式合法、标准查看器能看、项目查看器能加载、部署路径能请求。

- `glTF Validator`：查规范错误、警告和统计信息；先修 error，再判断 warning 是否能接受。
- `Khronos glTF Sample Viewer`：用标准 PBR 查看器确认材质、光照响应、动画和扩展支持。
- `项目查看器`：确认自动取景、控制器目标、加载状态、材质表现、拾取和替换释放都符合当前项目。
- `Network 面板`：检查主文件、外部资源和解码器是否 200，文件体积和缓存头是否符合预期。
- `优化前后对比`：记录视觉差异、文件体积、顶点数、贴图尺寸、draw call 和加载耗时变化。

## Loader 对接

`GLTFLoader` 会解析 glTF 主体，但压缩扩展需要额外依赖。资产交付单里要明确写出运行时配置，避免“本地查看器能开，项目里空白”的情况。

```js
const loader = new GLTFLoader(manager);

loader.setDRACOLoader(dracoLoader);
loader.setMeshoptDecoder(MeshoptDecoder);
loader.setKTX2Loader(ktx2Loader);
```

- 没用 Draco 的模型，不要强行配置 `DRACOLoader`；它只会增加依赖和排错噪音。
- Meshopt 压缩模型需要 `MeshoptDecoder`，否则加载器无法解码对应 buffer。
- KTX2 / Basis Universal 贴图需要 `KTX2Loader`，并且要调用 `detectSupport(renderer)` 选择设备可用格式。
- 解码器文件也要跟随应用部署；404、CORS 或版本不匹配都会表现为模型加载失败。

## 常见判断

| 现象 / 需求 | 先看哪里 | 判断 |
| --- | --- | --- |
| Blender 里正常，three.js 里材质不对 | Blender glTF 导出限制、材质节点 | 复杂节点不一定能转换成 glTF PBR |
| `.gltf` 在本地能开，部署后失败 | Network 面板的 `.bin` / 图片路径 | 多文件资源没有跟着主文件部署 |
| 压缩后不能拾取某个零件 | 优化命令和节点树 | mesh 合并或 prune 改变了可交互节点 |
| 压缩后文件小了但加载更慢 | 解码器和设备性能 | 下载减少不等于总耗时减少，移动端尤其要测 |
| 颜色偏灰或法线怪 | 贴图类型和颜色空间 | 颜色贴图按 sRGB，normal/roughness/metalness 按数据 |
| 模型围绕奇怪位置旋转 | Blender 原点、导出根节点、`Box3` 中心 | 原点和自动取景中心不是同一件事 |
| 查看器报未知扩展 | `extensionsUsed` 和 loader 配置 | 模型使用了项目没有接入的 glTF 扩展 |
| 用户总看到旧模型 | 文件名、缓存头、CDN 刷新 | 稳定缓存需要版本化文件名 |

## 记忆句

先定资产能不能用，再定怎么优化；先保留结构和验证记录，再追求更小体积。

资产管线的交付物不是一个孤立文件，而是一组可以复现的事实：来源、导出、压缩、验证、路径和 loader 依赖。

## 参考示例

- 交付检查
  - [模型交付检查表](model-handoff-checklist.md)
  - [Blender 导出检查表](blender-export-checklist.md)

- 优化与部署
  - [优化记录模板](optimization-report-template.md)
  - [部署清单模板](deployment-manifest-template.json)

- 可复用参考
  - [资产管线参考](../../references/asset-pipeline.md)

## 参考资料

- [GLTFLoader docs](https://threejs.org/docs/pages/GLTFLoader.html)
- [Blender glTF 2.0 Importer and Exporter](https://github.com/KhronosGroup/glTF-Blender-IO)
- [Blender Manual: glTF 2.0](https://docs.blender.org/manual/en/latest/addons/import_export/scene_gltf2.html)
- [glTF Transform](https://gltf-transform.dev/)
- [glTF Validator](https://github.khronos.org/glTF-Validator/)
- [Khronos glTF Sample Viewer](https://github.khronos.org/glTF-Sample-Viewer-Release/)
- [gltfpack](https://meshoptimizer.org/gltf/)
- [Draco](https://github.com/google/draco)
- [KTX: GPU Texture Container Format](https://www.khronos.org/ktx/)
