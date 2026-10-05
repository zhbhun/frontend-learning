# ONNX Runtime Web

- 1. 上手
  - [1.1 认识 ONNX Runtime Web](cheatsheets/introduction/README.mdx)
    ONNX 是什么、为什么在浏览器里推理，以及 onnxruntime-common/web/node/react-native 四个包的分工。
  - [1.2 安装与导入](cheatsheets/installation/README.mdx)
    npm、CDN 与 script 标签三种接入方式，WebGPU 等特殊入口的条件导入。
  - [1.3 第一次推理](cheatsheets/first-inference/README.mdx)
    创建 InferenceSession、构造输入张量、执行 run 并读取输出，跑通最小闭环。
  - [1.4 获取模型](cheatsheets/getting-models/README.mdx)
    从 HuggingFace 与 ONNX Model Zoo 找现成 onnx 文件，用 Netron 读懂输入输出签名。

- 2. 核心概念
  - 2.1 张量与数据
    - [2.1.1 Tensor 与数据类型](cheatsheets/tensor/README.mdx)
      Tensor 的 dims/type/data 三要素，float32、float16 与 int64 BigInt 的处理方式。
    - [2.1.2 图像与 Tensor 互转](cheatsheets/tensor-image/README.mdx)
      从 canvas 或 Image 元素取像素，完成缩放、归一化与布局转换得到模型输入。
  - 2.2 会话与配置
    - [2.2.1 InferenceSession](cheatsheets/inference-session/README.mdx)
      创建选项、输入输出名查询、run 的 feeds 与 fetches、runOptions 与并发语义。
    - [2.2.2 ort.env 全局配置](cheatsheets/ort-env/README.mdx)
      wasm 路径、线程数、SIMD、日志级别等全局标志的设置时机与生效范围。
  - 2.3 执行后端
    - [2.3.1 WebAssembly 后端](cheatsheets/backend-wasm/README.mdx)
      CPU 基线后端的单线程、多线程与 SIMD 形态及各自适用场景。
    - [2.3.2 WebGPU 后端](cheatsheets/backend-webgpu/README.mdx)
      GPU 加速主力后端的启用方式、float16 数据、算子覆盖与浏览器版本要求。
    - [2.3.3 后端选择与回退](cheatsheets/backend-selection/README.mdx)
      executionProviders 数组顺序、运行时能力检测，WebGL 维护模式与 WebNN 实验状态。

- 3. 工程与性能
  - 3.1 浏览器运行时
    - [3.1.1 WASM 资源伺服](cheatsheets/wasm-serving/README.mdx)
      ort-wasm 系列资源的内容、wasmPaths 配置与 Vite 打包处理。
    - [3.1.2 多线程与跨域隔离](cheatsheets/cross-origin-isolation/README.mdx)
      SharedArrayBuffer 依赖的 COOP/COEP 响应头与多线程开启条件。
    - [3.1.3 proxy 工作线程](cheatsheets/proxy-worker/README.mdx)
      用 proxy 把推理移出主线程，避免长推理阻塞界面交互。
  - 3.2 性能优化
    - [3.2.1 性能测量](cheatsheets/profiling/README.mdx)
      单次 run 耗时统计、warmup 影响与官方性能诊断方法定位瓶颈。
    - [3.2.2 量化与体积](cheatsheets/quantization/README.mdx)
      int8 量化模型对加载体积和推理速度的影响与取舍。
    - [3.2.3 内存管理](cheatsheets/memory-management/README.mdx)
      session 释放、张量生命周期与大模型的分阶段加载策略。
  - 3.3 上线
    - [3.3.1 部署](cheatsheets/deployment/README.mdx)
      生产构建、静态托管、跨域响应头与模型文件的缓存策略。
    - [3.3.2 常见报错排查](cheatsheets/troubleshooting/README.mdx)
      wasm 加载失败、EP 静默回退、算子不支持与输入类型不匹配的定位方法。

- 4. 实战应用
  - [4.1 图像分类应用](cheatsheets/image-classification/README.mdx)
    从选模型到页面展示的完整网页应用，覆盖预处理、推理与输出解读。
  - [4.2 目标检测](cheatsheets/object-detection/README.mdx)
    YOLO 类模型的输出解码，把张量还原成检测框画到画布上。
  - [4.3 浏览器跑大模型](cheatsheets/llm-in-browser/README.mdx)
    WebGPU 上运行生成式模型的 token 循环、KV 缓存传递与显存约束。

- 5. 按需分支
  - [5.1 onnxruntime-node](cheatsheets/onnxruntime-node/README.mdx)
    Node.js 原生绑定的安装、文件系统模型加载与和 web 包的差异。
  - [5.2 transformers.js](cheatsheets/transformers-js/README.mdx)
    基于 ort-web 的上层库解决什么问题，什么时候绕过它直接用 ort。
  - [5.3 React Native](cheatsheets/react-native/README.mdx)
    onnxruntime-react-native 的包结构与移动端平台限制概览。
