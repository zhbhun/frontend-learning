# ONNX Runtime Web

- [@官方@ONNX Runtime 官方文档](https://onnxruntime.ai/docs/)
  覆盖：入门、JS 各平台 Get started、Web 教程、执行后端与排错的文档总入口，JS 部分从 Get started with JavaScript 进入。适用于：全部阶段，第 1 阶段从它开始。
- [@官方@onnxruntime-web API 参考](https://onnxruntime.ai/docs/api/js/index.html)
  覆盖：InferenceSession、Tensor、ort.env 等全部 TypeScript 类型与签名。适用于：核心概念与工程阶段的逐项回查。
- [@官方@microsoft/onnxruntime 仓库 js 目录](https://github.com/microsoft/onnxruntime/tree/main/js)
  覆盖：onnxruntime-common/web/node/react-native 四个包的 README、EP 兼容矩阵、各后端算子支持列表与源码。适用于：确认版本能力边界，排查“某后端是否支持某算子”。
- [@官方@onnxruntime-inference-examples JS 示例集](https://github.com/microsoft/onnxruntime-inference-examples/tree/main/js)
  覆盖：官方 quick start、Tensor / InferenceSession / SessionOptions / env 用法示例，以及 Whisper、Segment-Anything、Stable Diffusion Turbo、Phi-3 聊天等端到端应用。适用于：上手对照实现与实战应用课程参考。
- [@官方@onnxruntime-web npm 发布页](https://www.npmjs.com/package/onnxruntime-web)
  覆盖：稳定版与 `@dev` nightly 的版本记录。适用于：确认版本基线与升级时机。

## 社区

- [onnxruntime GitHub Discussions](https://github.com/microsoft/onnxruntime/discussions)
  适用于：检索真实报错（wasm 加载失败、EP 回退、算子不支持）的他人案例；提 Bug 前先搜这里。

## 工具

- [Netron](https://netron.app)
  覆盖：可视化 onnx 模型的算子图与输入输出签名（名称、shape、dtype）。适用于：第一次推理前确认模型签名，以及预处理、后处理的对齐。

## 资源

- [ONNX Model Zoo](https://github.com/onnx/models)
  覆盖：官方维护的 ONNX 模型集合，含图像分类、检测等经典模型及输入输出说明。适用于：获取模型课程与实战应用的模型选型。
- [HuggingFace Models（ONNX 过滤）](https://huggingface.co/models?library=onnx&sort=trending)
  覆盖：规模最大的社区 onnx 格式模型来源。适用于：获取模型课程与各实战场景找模型。
