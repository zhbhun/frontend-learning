/**
 * 范例：同一输入对拍——fp32 与 int8 两个会话喂同一份输入，逐项比较输出。
 * 前置状态：浏览器需能访问模型 CDN：mnist-12（26,143 字节）与 mnist-12-int8
 * （10,969 字节），运行时从 ONNX Model Zoo 的 media 端点拉取，不进仓库。
 * 操作：用参数切换对拍输入（合成数字 0 / 随机噪声）；每次切换后把同一份输入
 * 依次喂给两个会话，比较 top1、softmax 置信度与 logit 最大绝对差。
 * 预期结果：合成数字 0 上 fp32 判对（top1=0，置信度≈1.0），int8 输出恒为全零
 * （最大绝对值 0.0000，置信度 0.1）——「恒零」与输入无关。写课时用同版本
 * 原生 CPU（python onnxruntime 1.30）复核现象相同：这对官方量化变体在当前
 * 运行时上已失效，加载成功 ≠ 算得对。结论读数按实际输出实时计算，不预设。
 * 阅读主线：makeDigit / makeNoise（确定性输入）→ runPair（同一输入双会话对拍）
 * → describe（top1 与置信度）→ 画布：输入预览 + 两张 logit 条形图。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';
import { env, InferenceSession, Tensor } from 'onnxruntime-web';

/** 与工作区安装的 onnxruntime-web@1.30.0 配套的 wasm 资源 CDN。 */
const WASM_CDN = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0/dist/';

const ZOO =
  'https://media.githubusercontent.com/media/onnx/models/main/validated/vision/classification';

/** 同一张计算图的两份权重：fp32 原版与 int8 量化版，输入输出签名相同。 */
export const FP32_URL = `${ZOO}/mnist/model/mnist-12.onnx`;
export const INT8_URL = `${ZOO}/mnist/model/mnist-12-int8.onnx`;

const DIMS = [1, 1, 28, 28];

/** 合成数字「0」：黑底白字圆环，值域 [0,1]——MNIST 系模型的同分布输入。 */
export function makeDigit(): Float32Array {
  const data = new Float32Array(28 * 28);
  for (let y = 0; y < 28; y += 1) {
    for (let x = 0; x < 28; x += 1) {
      const distance = Math.hypot(x - 13.5, y - 13.5);
      if (Math.abs(distance - 9) < 2.6) {
        data[y * 28 + x] = 1.0;
      }
    }
  }
  return data;
}

/** 确定性伪随机噪声：同一 seed 两会话拿到字节级相同的输入。 */
export function makeNoise(seed: number): Float32Array {
  const data = new Float32Array(28 * 28);
  let state = seed >>> 0;
  for (let index = 0; index < data.length; index += 1) {
    state = (state * 1103515245 + 12345) % 2147483648;
    data[index] = state / 2147483648;
  }
  return data;
}

/** 按会话缓存：切换输入只重跑推理，不重新下载。 */
const sessionPromises = new Map<string, Promise<InferenceSession>>();

function ensureSession(url: string): Promise<InferenceSession> {
  let promise = sessionPromises.get(url);
  if (!promise) {
    env.wasm.wasmPaths = WASM_CDN;
    env.wasm.numThreads = 1;
    promise = InferenceSession.create(url, {
      executionProviders: ['wasm'],
    }).catch((error: unknown) => {
      sessionPromises.delete(url);
      throw error;
    });
    sessionPromises.set(url, promise);
  }
  return promise;
}

export interface PairResult {
  top1: number;
  prob: number;
  maxAbs: number;
  /** 10 个输出按 logit 实际值归一化的条形高度（0..1）；全零输出就是全平底。 */
  bars: number[];
}

/** softmax 后的置信度 + 输出最大绝对值（检测「恒零」这类失效的探针）。 */
function describe(logits: Float32Array): PairResult {
  let top1 = 0;
  for (let index = 1; index < logits.length; index += 1) {
    if (logits[index] > logits[top1]) {
      top1 = index;
    }
  }
  let total = 0;
  const exps = Float64Array.from(logits, (value) => Math.exp(value - logits[top1]));
  for (const value of exps) {
    total += value;
  }
  let maxAbs = 0;
  let min = Infinity;
  let max = -Infinity;
  for (const value of logits) {
    maxAbs = Math.max(maxAbs, Math.abs(value));
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  // 条形高度按本次输出的实际 logit 范围归一化；范围为零（恒定输出）时全为 0。
  const span = max - min;
  const bars = Array.from(logits, (value) => (span > 0 ? (value - min) / span : 0));
  return { top1, prob: exps[top1] / total, maxAbs, bars };
}

async function runPair(
  data: Float32Array,
): Promise<{ fp32: PairResult; int8: PairResult; maxAbsDiff: number }> {
  const tensor = new Tensor('float32', data, DIMS);
  const fp32Session = await ensureSession(FP32_URL);
  const int8Session = await ensureSession(INT8_URL);
  const fp32Out = (await fp32Session.run({ [fp32Session.inputNames[0]]: tensor }))[
    fp32Session.outputNames[0]
  ].data as Float32Array;
  const int8Out = (await int8Session.run({ [int8Session.inputNames[0]]: tensor }))[
    int8Session.outputNames[0]
  ].data as Float32Array;
  let maxAbsDiff = 0;
  for (let index = 0; index < fp32Out.length; index += 1) {
    maxAbsDiff = Math.max(maxAbsDiff, Math.abs(fp32Out[index] - int8Out[index]));
  }
  return { fp32: describe(fp32Out), int8: describe(int8Out), maxAbsDiff };
}

export type AccuracyInputId = 'digit' | 'noise';

export interface AccuracySnapshot {
  status: 'loading' | 'ready' | 'error';
  message: string;
  inputLabel: string;
  input?: { data: Float32Array; width: number; height: number };
  fp32?: PairResult;
  int8?: PairResult;
  maxAbsDiff?: number;
  conclusion?: string;
}

export interface AccuracyArgs {
  input: AccuracyInputId;
}

export interface AccuracyInstance {
  update(args: AccuracyArgs): void;
  dispose(): void;
}

const COLOR_TEXT = '#172033';
const COLOR_MUTED = '#475569';
const COLOR_FP32 = '#4f7cff';
const COLOR_INT8 = '#16a34a';
const COLOR_BAD = '#dc2626';
const SANS = 'ui-sans-serif, system-ui, sans-serif';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

const INPUT_LABELS: Record<AccuracyInputId, string> = {
  digit: '合成数字 0',
  noise: '随机噪声',
};

/** 结论按实际输出实时计算：恒零是失效探针，top1 一致性是次要信号。 */
function conclude(result: { fp32: PairResult; int8: PairResult; maxAbsDiff: number }): string {
  if (result.int8.maxAbs === 0) {
    return 'int8 输出恒为 0：该变体在当前运行时已失效';
  }
  if (result.fp32.top1 === result.int8.top1) {
    return `top1 一致，logit 最大绝对差 ${result.maxAbsDiff.toFixed(4)}`;
  }
  return `top1 不一致，logit 最大绝对差 ${result.maxAbsDiff.toFixed(4)}——需真实数据评估`;
}

export function createAccuracyCheck(
  canvas: HTMLCanvasElement,
  emit: (snapshot: AccuracySnapshot) => void,
): AccuracyInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  let args: AccuracyArgs = { input: 'digit' };
  let snapshot: AccuracySnapshot = {
    status: 'loading',
    message: '下载模型…',
    inputLabel: INPUT_LABELS.digit,
  };
  let running = false;
  let pending: AccuracyArgs | undefined;
  let ranKey = '';

  function emitSnapshot() {
    emit(snapshot);
  }

  function drawInput(x: number, y: number, size: number) {
    const input = snapshot.input;
    ctx.fillStyle = COLOR_MUTED;
    ctx.font = `12px ${SANS}`;
    ctx.fillText(`输入：${snapshot.inputLabel}`, x, y - 10);
    ctx.strokeStyle = 'rgba(23,32,51,0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 0.5, y - 0.5, size + 1, size + 1);
    if (!input) {
      return;
    }
    const cell = size / input.width;
    for (let py = 0; py < input.height; py += 1) {
      for (let px = 0; px < input.width; px += 1) {
        const value = input.data[py * input.width + px];
        if (value > 0) {
          ctx.fillStyle = `rgba(255,255,255,${value})`;
          ctx.fillRect(x + px * cell, y + py * cell, Math.ceil(cell), Math.ceil(cell));
        }
      }
    }
  }

  /** 一张 10 根的 logit 条形图：高度来自模型真实输出，顶上标注 top1 与置信度。 */
  function drawLogits(title: string, result: PairResult | undefined, color: string, x: number, y: number, width: number) {
    ctx.fillStyle = COLOR_TEXT;
    ctx.font = `600 13px ${SANS}`;
    ctx.fillText(title, x, y - 10);
    ctx.strokeStyle = 'rgba(23,32,51,0.15)';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + width, y);
    ctx.stroke();
    if (!result) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = `12px ${MONO}`;
      ctx.fillText('…', x, y + 16);
      return;
    }
    const barMax = 64;
    ctx.font = `12px ${MONO}`;
    for (let index = 0; index < result.bars.length; index += 1) {
      const barHeight = Math.max(2, barMax * result.bars[index]);
      ctx.fillStyle = index === result.top1 ? color : 'rgba(71,85,105,0.35)';
      ctx.fillRect(x + index * (width / 10) + 2, y - barHeight, width / 10 - 4, barHeight);
      ctx.fillStyle = COLOR_MUTED;
      ctx.fillText(String(index), x + index * (width / 10) + width / 20 - 4, y + 14);
    }
    ctx.fillStyle = color;
    ctx.fillText(`top1=${result.top1} · 置信度 ${result.prob.toFixed(4)}`, x, y + 32);
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(560, size.width);
    const height = Math.max(250, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = COLOR_TEXT;
    ctx.font = `600 15px ${SANS}`;
    ctx.fillText('同一输入，两个会话：fp32（左） vs int8（右）', 28, 30);

    const chartTop = 118;
    drawInput(28, chartTop - 4, 84);
    const panelWidth = (width - 28 * 2 - 84 - 24 * 2) / 2;
    drawLogits('fp32 logits', snapshot.fp32, COLOR_FP32, 136, chartTop, panelWidth);
    drawLogits('int8 logits', snapshot.int8, COLOR_INT8, 136 + panelWidth + 24, chartTop, panelWidth);

    ctx.font = `13px ${SANS}`;
    if (snapshot.status === 'error') {
      ctx.fillStyle = COLOR_BAD;
      ctx.fillText(`出错了：${snapshot.message}（点击画布重试）`, 28, height - 18);
    } else {
      ctx.fillStyle = snapshot.conclusion?.startsWith('int8 输出恒为 0') ? COLOR_BAD : COLOR_TEXT;
      ctx.fillText(snapshot.conclusion ?? snapshot.message, 28, height - 18);
    }
    emitSnapshot();
  }

  async function run(nextArgs: AccuracyArgs) {
    if (running) {
      pending = nextArgs;
      return;
    }
    running = true;
    ranKey = JSON.stringify(nextArgs);
    args = nextArgs;
    const data = nextArgs.input === 'digit' ? makeDigit() : makeNoise(20261004);
    snapshot = {
      status: 'loading',
      message: '加载模型…',
      inputLabel: INPUT_LABELS[nextArgs.input],
      input: { data, width: 28, height: 28 },
    };
    draw();
    try {
      const result = await runPair(data);
      snapshot = {
        ...snapshot,
        status: 'ready',
        message: '就绪',
        fp32: result.fp32,
        int8: result.int8,
        maxAbsDiff: result.maxAbsDiff,
        conclusion: conclude(result),
      };
    } catch (error) {
      snapshot = {
        ...snapshot,
        status: 'error',
        message: error instanceof Error ? error.message : String(error),
      };
    }
    running = false;
    draw();

    if (pending) {
      const next = pending;
      pending = undefined;
      if (JSON.stringify(next) !== ranKey) {
        void run(next);
      }
    }
  }

  function onClick() {
    if (snapshot.status === 'error') {
      void run(args);
    }
  }

  canvas.style.cursor = 'default';
  canvas.addEventListener('click', onClick);
  const resizeObserver = createResizeObserver(canvas, draw);
  void run(args);

  return {
    update(nextArgs) {
      if (JSON.stringify(nextArgs) !== ranKey) {
        void run(nextArgs);
      }
    },
    dispose() {
      canvas.removeEventListener('click', onClick);
      resizeObserver.disconnect();
      // 不释放共享会话：同一页面里其他内嵌实例可能仍在使用；释放策略见「内存管理」课程。
    },
  };
}
