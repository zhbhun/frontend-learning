# glTF 资产管线参考

这份笔记用于支撑模型资产来源、Blender 导出、压缩、验证和部署决策。课程里讲用法，这里保留可复用判断。

## 工具定位

| 工具 / 来源 | 主要用途 | 用在什么时候 |
| --- | --- | --- |
| Blender glTF I/O | 导入、整理和导出 glTF / GLB | 接收 `.blend`、`FBX`、`OBJ` 或需要统一原点、命名、材质时 |
| glTF Validator | 检查 glTF 2.0 规范错误和统计信息 | 每次导出或压缩后 |
| Khronos glTF Sample Viewer | 用标准 PBR 查看器预览材质、动画和扩展 | 判断问题来自资产还是项目查看器 |
| glTF Transform | 检查、打包、拆包、去重、裁剪、压缩贴图和几何 | 需要可复现的命令行管线时 |
| gltfpack | 自动做几何、动画、节点和贴图优化 | 需要快速得到较小运行时资产时 |
| Draco | 压缩几何数据 | 几何体积大、网络下载压力明显时 |
| KTX2 / Basis Universal | 让贴图以 GPU 压缩格式分发 | 贴图大、移动端内存或带宽压力明显时 |

## 格式选择

- `.glb`：部署优先。单文件不容易丢 `.bin` 或贴图，缓存和版本化也更简单。
- `.gltf + .bin + images`：调试优先。能直接检查 JSON 和资源路径，也方便让 CDN 单独缓存大贴图。
- 原始 `.blend`、`.fbx`、`.obj`：只作为制作或交换格式，不直接作为 three.js 主线运行时资产。

## 压缩判断

先找瓶颈，再选工具。

- 文件主要被几何撑大：考虑 quantization、Draco、Meshopt、simplify。
- 文件主要被贴图撑大：先限制贴图尺寸，再考虑 WebP、AVIF 或 KTX2。
- draw call 太多：考虑合并 mesh、合并材质、实例化；但先确认交互粒度能不能接受。
- 动画数据太大：考虑 resample 或去掉不需要的动作；压缩后必须检查动作质量。
- 需要保留节点：不要随便使用会合并或裁剪节点的默认优化；关键节点先写入交付清单。

## 运行时依赖

资产用了扩展，运行时就要接对应 loader。

- `KHR_draco_mesh_compression`：配置 `DRACOLoader`。
- `EXT_meshopt_compression` 或 meshopt 相关压缩：配置 `MeshoptDecoder`。
- `KHR_texture_basisu`：配置 `KTX2Loader`，并让它检测当前 renderer 支持。
- `EXT_texture_webp` / `EXT_texture_avif`：确认目标浏览器和 three.js 加载路径支持。

## 验证顺序

1. 原始导出文件先跑 Validator。
2. 在 Khronos Sample Viewer 或其他标准查看器里看材质、动画和尺寸。
3. 在项目查看器里看自动取景、灯光、控制器、拾取和加载状态。
4. 压缩后重复以上步骤，并记录体积、统计和视觉差异。
5. 部署后用 Network 面板检查主文件、外部资源和解码器路径。

## 取舍句

压缩不是越多越好。Web 3D 的资产管线总是在四件事之间取舍：下载体积、解码耗时、视觉质量和运行时可控性。

可交付的模型必须能回答三类问题：它从哪里来，它怎样被处理过，它在当前 three.js 项目里需要什么运行时条件。
