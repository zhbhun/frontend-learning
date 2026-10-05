/**
 * 三档线程形态共用的推理核心：常量、固定输入图案，以及「创建会话 → 连续 run → 读输出」。
 * main / proxy 档（主线程上的全新 ort 模块）与自建 worker 档都调用 runSessionBurst，
 * 保证三档在输入、模型、后端与次数上逐项相同——差异只剩「计算发生在哪个线程」。
 */

/** ONNX Model Zoo 的 MNIST 模型（约 26KB），走 Git LFS 的 media 端点。 */
export const MODEL_URL =
  'https://media.githubusercontent.com/media/onnx/models/main/validated/vision/classification/mnist/model/mnist-8.onnx';

/** 与工作区安装的 onnxruntime-web@1.30.0 配套的 wasm 资源 CDN 前缀。 */
export const WASM_CDN = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0/dist/';

/** 一次尝试的完整结果：计时为真实测量，输出为模型真实输出。 */
export interface AttemptOutcome {
  ok: boolean;
  /** 捕获到的原始报错；成功时为 null。 */
  errorText: string | null;
  /** InferenceSession.create 耗时（含模型下载与 wasm 就绪；工件命中 HTTP 缓存后显著变快）。 */
  createMs: number;
  /** 每次 run 的墙钟耗时；proxy / 自建档包含消息往返与缓冲转移的开销。 */
  runMs: number[];
  /** 输出 logits 的 argmax 类别与 softmax 置信度（三档同输入应一致）。 */
  digit: number | null;
  confidence: number | null;
}

interface SessionBurst {
  createMs: number;
  runMs: number[];
  digit: number | null;
  confidence: number | null;
}

type OrtModule = typeof import('onnxruntime-web/wasm');
type OrtTensor = InstanceType<OrtModule['Tensor']>;

/** 固定种子的伪随机数，保证三档尝试拿到的输入逐位相同。 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 合成 28×28 输入图案：低幅噪声底 + 中心十字亮带。三档共用同一图案，
 * 输出类别才可比——三档一致是「算的确实是同一件事」的证据。
 */
export function buildInputPattern(): Float32Array {
  const data = new Float32Array(28 * 28);
  const rand = mulberry32(20261004);
  for (let i = 0; i < data.length; i += 1) {
    data[i] = rand() * 0.12;
  }
  for (let y = 0; y < 28; y += 1) {
    for (let x = 0; x < 28; x += 1) {
      const inCross = Math.abs(x - 13.5) < 4.5 || Math.abs(y - 13.5) < 4.5;
      if (inCross) {
        data[y * 28 + x] = Math.min(1, data[y * 28 + x] + 0.8);
      }
    }
  }
  return data;
}

function makeInputTensor(ort: OrtModule): OrtTensor {
  return new ort.Tensor('float32', buildInputPattern(), [1, 1, 28, 28]);
}

/**
 * 推理核心（三档共用）：创建会话 → 连续 runs 次 run → 读输出。
 * 注意每次 run 都新建输入 Tensor：proxy 档的输入缓冲会随消息转移（transfer），
 * run 之后主线程侧即分离——复用同一个 Tensor 会让下一次 run 失败。
 */
export async function runSessionBurst(ort: OrtModule, runs: number): Promise<SessionBurst> {
  const createStart = performance.now();
  const session = await ort.InferenceSession.create(MODEL_URL, {
    executionProviders: ['wasm'],
  });
  const createMs = performance.now() - createStart;

  const runMs: number[] = [];
  let digit: number | null = null;
  let confidence: number | null = null;
  for (let i = 0; i < runs; i += 1) {
    const start = performance.now();
    const results = await session.run({ Input3: makeInputTensor(ort) });
    runMs.push(performance.now() - start);
    if (digit === null) {
      // 输出 Plus214_Output_0 形状 [1,10]，是 logits——做 softmax 得到置信度。
      const logits = results['Plus214_Output_0'].data as Float32Array;
      let maxIndex = 0;
      for (let j = 1; j < logits.length; j += 1) {
        if (logits[j] > logits[maxIndex]) {
          maxIndex = j;
        }
      }
      let expSum = 0;
      for (let j = 0; j < logits.length; j += 1) {
        expSum += Math.exp(logits[j] - logits[maxIndex]);
      }
      digit = maxIndex;
      confidence = 1 / expSum;
    }
  }
  await session.release();
  return { createMs, runMs, digit, confidence };
}
