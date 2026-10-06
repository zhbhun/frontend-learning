# Transformers.js

- 1. 上手
  - [1.1 安装](cheatsheets/installation/README.mdx)
    npm 与 CDN 两种接入方式，浏览器、Node、Bun、Deno 的运行环境要求。
  - [1.2 第一个 pipeline](cheatsheets/first-pipeline/README.mdx)
    用情感分类跑通加载—推理—输出的最小闭环，认识模型下载与缓存行为。
  - [1.3 任务全景](cheatsheets/task-overview/README.mdx)
    按 NLP、视觉、音频、多模态过一遍 pipeline 任务清单与各自的输出形态。
- 2. 核心 API
  - 2.1 组件化推理
    - [2.1.1 tokenizer](cheatsheets/tokenizer/README.mdx)
      文本与张量之间的转换：编码、解码、padding 与截断。
    - [2.1.2 model 前向推理](cheatsheets/model-inference/README.mdx)
      绕过 pipeline 直接用 AutoModel 生成 logits 并手工解读输出。
    - [2.1.3 processor 与多模态输入](cheatsheets/processor/README.mdx)
      图像与音频的预处理，RawImage、RawAudio 与 processor 的配合。
  - 2.2 文本生成
    - [2.2.1 生成参数](cheatsheets/generation-options/README.mdx)
      max_new_tokens、temperature、top_k/top_p 与重复惩罚对生成结果的影响。
    - [2.2.2 流式输出](cheatsheets/streaming/README.mdx)
      TextStreamer 与 pipeline 流式读取，边生成边渲染。
    - [2.2.3 结构化输出与工具调用](cheatsheets/structured-output/README.mdx)
      JSON schema 约束生成与 TextGenerationPipeline 的工具调用。
  - 2.3 运行配置
    - [2.3.1 device 与 dtype](cheatsheets/device-dtype/README.mdx)
      WASM/WebGPU/CPU 设备选择与 fp32、fp16、q8、q4 量化档位的取舍。
    - [2.3.2 env 配置](cheatsheets/env-config/README.mdx)
      缓存路径、本地模型、自定义 fetch、日志级别与 WASM 缓存。
    - [2.3.3 ModelRegistry](cheatsheets/model-registry/README.mdx)
      加载前检查模型文件、体积、缓存状态与 dtype 的生产工作流。
- 3. 任务实战
  - 3.1 文本任务
    - [3.1.1 文本分类与零样本](cheatsheets/text-classification/README.mdx)
      情感分类管线与零样本分类的标签设计。
    - [3.1.2 token 分类](cheatsheets/token-classification/README.mdx)
      NER 的 token 对齐与聚合输出。
    - [3.1.3 问答与摘要](cheatsheets/qa-summarization/README.mdx)
      抽取式问答、生成式摘要与翻译的输入构造。
    - [3.1.4 embedding](cheatsheets/embeddings/README.mdx)
      特征提取、pooling 策略与向量相似度检索。
  - 3.2 视觉任务
    - [3.2.1 图像分类与目标检测](cheatsheets/image-classification-detection/README.mdx)
      单标签分类输出与带边界框检测输出的差异。
    - [3.2.2 分割与深度估计](cheatsheets/segmentation-depth/README.mdx)
      SAM 提示分割与单目深度图生成。
    - [3.2.3 背景移除](cheatsheets/background-removal/README.mdx)
      RMBG 类模型的抠图输出与图层合成。
  - 3.3 音频任务
    - [3.3.1 语音识别](cheatsheets/speech-recognition/README.mdx)
      Whisper 的音频输入、语言与任务选项。
    - [3.3.2 语音合成](cheatsheets/text-to-speech/README.mdx)
      TTS 管线与音频输出处理。
  - 3.4 多模态
    - [3.4.1 CLIP 图文匹配](cheatsheets/clip-image-matching/README.mdx)
      图文相似度打分与零样本图像分类。
    - [3.4.2 图生文与文档问答](cheatsheets/vlm-captioning/README.mdx)
      VLM 图像描述、提问式理解与文档问答。
- 4. 工程化
  - [4.1 Web Worker 加载](cheatsheets/web-worker/README.mdx)
    把模型推理搬出主线程，接好下载进度回调。
  - [4.2 缓存与离线](cheatsheets/cache-offline/README.mdx)
    浏览器缓存、WASM 缓存与本地模型的离线策略。
  - [4.3 性能调优](cheatsheets/performance/README.mdx)
    WebGPU 运行时、量化与 KV 缓存的基准方法和取舍。
- 5. 进阶
  - [5.1 服务端运行](cheatsheets/server-side/README.mdx)
    Node、Bun、Deno 中的加载路径与服务端 WebGPU。
  - [5.2 自定义模型转换](cheatsheets/model-conversion/README.mdx)
    用 Optimum 导出 ONNX 并验证自己的模型。
  - [5.3 框架集成](cheatsheets/framework-integration/README.mdx)
    Next.js、SvelteKit 模板与前端框架中的组件化用法。
