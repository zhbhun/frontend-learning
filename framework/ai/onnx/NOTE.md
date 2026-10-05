# 学习笔记：ONNX Runtime Web

## 偏好
- 主题是 ONNX Runtime Web（onnxruntime-web，版本基线 1.30.x）：在浏览器里用 JavaScript 加载并运行 ONNX 模型。核心是浏览器推理；onnxruntime-node 与 React Native 只作为按需分支课程。
- 主题边界之外：模型训练与格式转换工具链（Python 端 onnx / onnxconverter-common）、ONNX 格式规范本身、服务端推理部署运维、onnxruntime-mobile 原生集成。课程只讲“拿到现成模型就能跑”，模型来源与签名解读放在上手阶段。
- 示例工程用 TypeScript + Vite，运行在浏览器；Node 相关示例只出现在对应分支课程。
- 推理结果用页面可视化呈现（Canvas 画分类结果、检测框等）；优先使用小尺寸公开模型或程序构造的张量，模型文件不进仓库，课程写明下载来源。
- 后端叙事口径：WebGPU 是主力 GPU 后端；WebGL 标注维护模式；WebNN 标注实验性并写明平台限制；wasm 是兼容性基线。

## 工作笔记
- onnxruntime-web npm 稳定版 1.30.0（2026-10 查证）；nightly 通过 `onnxruntime-web@dev` 安装。1.30.0 实测包入口为 `.`、`/all`、`/wasm`、`/webgl`、`/webgpu`、`/jspi`；旧教程中的 `experimental` 入口已不存在，WebGPU 推荐经 `onnxruntime-web/webgpu`，WebNN 能力包含在默认入口的 JSEP 工件中（写课时以安装包 exports 实测为准）。
- 各浏览器 EP 支持以 js/web README 的兼容矩阵为准（写课时再核对当时版本）：Node.js 仅支持单线程 wasm EP；WebGPU 在 Windows 需 Chromium 113+（Float16 需 121+）；WebNN 需浏览器启动标志且仅 Windows Chromium。
- 官方文档已有成体系的 Web 教程（构建应用、env 标志与 session 选项、WebGPU/WebNN、大模型、性能诊断、部署、排错），课程应引用对应页面作为一手依据，不复写。
