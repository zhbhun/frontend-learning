/**
 * 应用装配层：模型与标签表的加载缓存 + 「预处理 → 推理 → 解码」一次编排。
 * 前置状态：三个来源都在运行时拉取（不进仓库），浏览器需能访问——
 *   1. 模型 squeezenet1.1-7.onnx：4,956,208 字节，ONNX Model Zoo 的 Git LFS media 端点
 *      （raw.githubusercontent.com 只回 LFS 指针文本，见「获取模型」课）；
 *   2. 标签表 synset.txt：31,675 字节，与模型同一仓库，行号即类别索引；
 *   3. ort wasm 资源：与安装的 onnxruntime-web@1.30.0 配套的 CDN。
 * 输入：已缩放裁剪到 224×224 的 RGBA 像素（几何由应用外壳的 drawImage 完成）。
 * 操作：loadClassifier() 并行下载模型与标签表、创建会话并缓存为模块级单例；
 *       classify(image, options) 跑完整管线，返回 Top-K 与核对读数。
 * 预期结果：imagenet 归一化下示例照片 Top-1 与主体一致；输出实测为原始 logits
 * （值和远大于 1），概率由解码模块的 softmax 计算；任何一步失败都以异常抛出，
 * 由外壳转成可见的错误状态。
 * 阅读主线：loadClassifier（env → 并行下载 → create）→ classify（预处理 → run → 解码）。
 */
import { env, InferenceSession } from 'onnxruntime-web';
import type { Tensor } from 'onnxruntime-web';

import { rgbaToTensor, valueRange } from './preprocess';
import type { NormalizeMode, RgbaImage } from './preprocess';
import { parseSynset, softmax, topK } from './decoder';
import type { ClassScore } from './decoder';

/** SqueezeNet 1.1：5MB 级体积、AlexNet 级精度，签名与预处理约定在 Model Zoo 页面可查。 */
export const MODEL_URL =
  'https://media.githubusercontent.com/media/onnx/models/main/validated/vision/classification/squeezenet/model/squeezenet1.1-7.onnx';

/** ImageNet 1000 类标签表：与模型同一仓库；每行「wnid 类别名」，行号即输出索引。 */
export const LABELS_URL =
  'https://raw.githubusercontent.com/onnx/models/main/validated/vision/classification/synset.txt';

/** 与工作区安装的 onnxruntime-web@1.30.0 配套的 wasm 资源 CDN。 */
export const WASM_CDN = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0/dist/';

export interface ClassifyOptions {
  /** 取概率前 K 的类别数。 */
  topK: number;
  /** 归一化模式；后两档是「错而不报」的对照档。 */
  normalize: NormalizeMode;
}

/** 一次分类的全部核对读数：签名、输入 / 输出范围、耗时、Top-K 与整份概率。 */
export interface ClassifyResult {
  inputName: string;
  inputDims: ReadonlyArray<number | string>;
  inputRange: { min: number; max: number };
  outputName: string;
  outputDims: readonly number[];
  logitRange: { min: number; max: number };
  /** softmax 后的全部 1000 个概率；切 K 只需对它重排，不必重跑推理。 */
  probs: number[];
  top: ClassScore[];
  runMs: number;
  decodeMs: number;
}

/** 装配完成的应用：持有一个会话与一份标签表，classify 是唯一入口。 */
export interface ClassifierHandle {
  labels: string[];
  modelBytes: number;
  session: InferenceSession;
  classify(image: RgbaImage, options: ClassifyOptions): Promise<ClassifyResult>;
}

let handlePromise: Promise<ClassifierHandle> | undefined;

/** 创建并缓存装配。env 配置必须在第一个会话创建前设置；失败清缓存，允许重试。 */
export function loadClassifier(): Promise<ClassifierHandle> {
  if (!handlePromise) {
    handlePromise = create().catch((error: unknown) => {
      handlePromise = undefined;
      throw error;
    });
  }
  return handlePromise;
}

async function create(): Promise<ClassifierHandle> {
  env.wasm.wasmPaths = WASM_CDN;
  // 工作区没有 COOP/COEP 响应头（跨域隔离），保持单线程基线。
  env.wasm.numThreads = 1;

  // 模型与标签表互不依赖，并行下载；先下模型到内存再 create，
  // 这样 buffer.byteLength 就是模型体积的实测读数。
  const [model, labelsText] = await Promise.all([
    fetch(MODEL_URL).then((response) => {
      if (!response.ok) {
        throw new Error(`模型下载失败：HTTP ${response.status}`);
      }
      return response.arrayBuffer();
    }),
    fetch(LABELS_URL).then((response) => {
      if (!response.ok) {
        throw new Error(`标签表下载失败：HTTP ${response.status}`);
      }
      return response.text();
    }),
  ]);
  const labels = parseSynset(labelsText);

  const session = await InferenceSession.create(model, { executionProviders: ['wasm'] });
  // 装配层按「单输入单输出」假设写；换模型时这里会先把它拦下来。
  if (session.inputNames.length !== 1 || session.outputNames.length !== 1) {
    throw new Error(
      `本应用按单输入单输出装配，实际输入 ${session.inputNames.length} 个、输出 ${session.outputNames.length} 个。`,
    );
  }

  async function classify(image: RgbaImage, options: ClassifyOptions): Promise<ClassifyResult> {
    // 1. 预处理：像素改写 + 范围读数（错域在这里就已经发生，但不会报错）
    const inputTensor = rgbaToTensor(image, options.normalize);
    const inputRange = valueRange(inputTensor.data as Float32Array);

    // 2. 推理：feeds 的键用会话元数据的输入名，不硬编码
    const startedAt = performance.now();
    const outputs = await session.run({ [session.inputNames[0]]: inputTensor });
    const runMs = performance.now() - startedAt;

    const output = outputs[session.outputNames[0]] as Tensor;
    if (!output) {
      throw new Error(`输出 ${session.outputNames[0]} 不存在。`);
    }
    const logits = output.data as Float32Array;

    // 3. 解码：squeezenet 输出实测是原始 logits（值和 ≈ 9988），softmax 在这一步补上
    const decodeStartedAt = performance.now();
    const probs = softmax(logits);
    const top = topK(probs, labels, options.topK);
    const decodeMs = performance.now() - decodeStartedAt;

    const inputMetadata = session.inputMetadata[0];
    return {
      inputName: session.inputNames[0],
      inputDims: inputMetadata && inputMetadata.isTensor ? [...inputMetadata.shape] : [],
      inputRange,
      outputName: session.outputNames[0],
      outputDims: [...output.dims],
      logitRange: valueRange(logits),
      probs,
      top,
      runMs,
      decodeMs,
    };
  }

  return { labels, modelBytes: model.byteLength, session, classify };
}
