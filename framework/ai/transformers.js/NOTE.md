# 学习笔记：Transformers.js

## 偏好

- 主题边界：`@huggingface/transformers`（v4.x）库本身的用法与工程化，含用 Optimum 把自定义模型导出为 ONNX 供本库加载的衔接内容。不含 ONNX Runtime 内部机制、Python `transformers` 库的系统学习、模型训练，也不含 text-to-image 等本库不支持的领域。
- 版本基线：v4.x（写作时 4.3.0），以官方文档为准；不覆盖 v2（`@xenova/transformers`）及更早的 API 写法。
- 运行环境：以浏览器（WASM / WebGPU）为主要示例环境，兼顾 Node.js / Bun / Deno 的差异点；v4 起服务端 WebGPU 属于正式能力。
- 范例媒介：课程内嵌 Storybook Canvas 运行浏览器示例；示例优先选用小体积模型（量化后几十 MB 级），避免课程页面依赖 GB 级下载。Node 专属能力用代码片段讲解，不进浏览器 Canvas。
- 工作区用 npm 管理依赖，Storybook framework 为模板默认的 `@storybook/html-vite`。

## 工作笔记

- 浏览器课程范例统一用官方 CDN 动态导入（jsdelivr，`@huggingface/transformers@4.3.0`），不给 package.json 添加该依赖：Storybook Canvas 是免构建环境，npm 包携带的 onnxruntime-node 原生依赖不适合浏览器打包。此模式由 1.2 课确立，所有带实例课程沿用。
- v4 的 `pipeline()` 不支持 `(task, options)` 两参形式（v4 源码核实），涉及进度回调时需显式传模型 ID。
- 模型查找入口：Hub 上用 `library=transformers.js` 标签过滤兼容模型。
- 官方示例集合在独立仓库 transformers.js-examples（60+ demo），课程需要完整应用形态参考时去那里找。
- v4 相对 v3 的关键变化：C++ 重写的 WebGPU Runtime（含自定义算子 GQA/MatMulNBits/QMoE）、服务端 WebGPU、`ModelRegistry`、`env.useWasmCache` 与自定义 `env.fetch`、`env.logLevel`、可种子随机数、结构化输出独立包 `@huggingface/transformers-structured-output`、TextGenerationPipeline 工具调用、新增 q1/q1f16/q2/q2f16 量化档位。
- 文档站侧边栏由前端渲染，抓取时拿不到完整导航树；写课程参考资料时直接按已知 URL 模式（`/docs/transformers.js/en/api/...`、`/docs/transformers.js/en/guides/...`）核对。
- WebGPU 在官方文档中长期标注 experimental，涉及 WebGPU 的结论要标注浏览器兼容现状。
