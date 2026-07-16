# 优化记录模板

每次对模型做压缩、贴图转换、mesh 合并或动画重采样时填写。目标是让优化过程可复现、可回退、可解释。

## 模型

- 资产名称：
- 输入文件：
- 输出文件：
- 日期：
- 工具和版本：
- 操作人：

## 优化前

- 文件体积：
- 顶点数：
- 三角面数：
- draw call 估计：
- 材质数量：
- 贴图数量：
- 最大贴图尺寸：
- 动画片段：
- `extensionsUsed`：
- 项目查看器加载耗时：

## 命令

```bash
gltf-transform inspect input.glb
gltf-transform optimize input.glb output.glb --texture-compress webp
```

把真实命令替换到这里，包括质量参数、压缩格式、是否保留节点、是否简化几何、是否转换贴图。

## 优化后

- 文件体积：
- 顶点数：
- 三角面数：
- draw call 估计：
- 材质数量：
- 贴图数量：
- 最大贴图尺寸：
- 动画片段：
- `extensionsUsed`：
- 项目查看器加载耗时：

## 运行时依赖

- [ ] 不需要额外 loader。
- [ ] 需要 `DRACOLoader`。
- [ ] 需要 `MeshoptDecoder`。
- [ ] 需要 `KTX2Loader`。
- [ ] 需要浏览器支持 WebP / AVIF。
- [ ] 需要额外说明：

## 视觉对比

- 材质差异：
- 贴图差异：
- 动画差异：
- 交互节点差异：
- 可接受结论：

## 验证

- [ ] glTF Validator 无 error。
- [ ] Khronos glTF Sample Viewer 正常。
- [ ] 项目查看器正常。
- [ ] Network 面板路径正常。
- [ ] 旧文件可回退。

## 备注

记录任何因为体积、画质、交互或设备兼容性做出的取舍。
