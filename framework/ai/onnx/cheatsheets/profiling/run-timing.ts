/**
 * 范例：性能测量的完整闭环——预热、多次取样、分布统计。
 * 前置状态：浏览器需能访问 ort 资源 CDN 与模型文件（运行时拉取，不进仓库）：
 * mnist-8.onnx（26KB）与 squeezenet1.1-7.onnx（约 4.7MB），均来自 ONNX Model Zoo 的
 * Git LFS media 端点；默认入口的 jsep 工件（约 27MB）同样经 CDN 拉取并受 HTTP 缓存。
 * 无跨域隔离头，wasm 以单线程运行——读数注明这一测量环境。
 * 操作：用参数切换模型、预热次数（0/1/3）与采样次数（10/30）；切换后按最新参数重跑
 * 一轮真实测量，上一轮进行中则等它结束后再跑最新一轮。
 * 预期结果：读数给出从 session.inputNames / inputMetadata 读出的输入输出签名、
 * 预热与采样配置、首个样本与 min / median / p95 / max / 均值；画布把每次取样画成条形，
 * 未预热时首个样本（冷启动）以琥珀色突出——预热 1 次后该离群点即消失。全部计时来自
 * performance.now()，机器相关，不承诺绝对值；squeezenet 比 mnist 大两个数量级，
 * warmup 效应与耗时刻度都更容易观察。
 * 阅读主线：createSession（按模型缓存会话）→ readSessionIo（从会话元数据读签名）→
 * measure（预热 N 次后连续计时 M 次）→ summarize（分布统计）；画布与读数是演示外壳。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';
import { env, InferenceSession, Tensor } from 'onnxruntime-web';

/** 与工作区安装的 onnxruntime-web@1.30.0 配套的 wasm 资源 CDN。 */
export const WASM_CDN =
  'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0/dist/';

/** ONNX Model Zoo 的 Git LFS media 端点；两个模型都在 validated 视觉分类目录下。 */
export interface ModelSpec {
  id: 'mnist' | 'squeezenet';
  label: string;
  url: string;
}

export const MODELS: ModelSpec[] = [
  {
    id: 'mnist',
    label: 'mnist-8（26KB）',
    url: 'https://media.githubusercontent.com/media/onnx/models/main/validated/vision/classification/mnist/model/mnist-8.onnx',
  },
  {
    id: 'squeezenet',
    label: 'squeezenet1.1（4.7MB）',
    url: 'https://media.githubusercontent.com/media/onnx/models/main/validated/vision/classification/squeezenet/model/squeezenet1.1-7.onnx',
  },
];

export function modelSpec(id: string): ModelSpec {
  const spec = MODELS.find((model) => model.id === id);
  if (!spec) {
    throw new Error(`未知模型：${id}`);
  }
  return spec;
}

const sessionPromises = new Map<string, Promise<InferenceSession>>();

/** 创建并按模型缓存会话：换模型才重新 create，调参数只重新计时。 */
export function createSession(modelId: string): Promise<InferenceSession> {
  let promise = sessionPromises.get(modelId);
  if (!promise) {
    env.wasm.wasmPaths = WASM_CDN;
    const spec = modelSpec(modelId);
    promise = InferenceSession.create(spec.url, {
      executionProviders: ['wasm'],
    }).catch((error: unknown) => {
      // 失败后清空缓存，让下一次交互可以重新创建会话。
      sessionPromises.delete(modelId);
      throw error;
    });
    sessionPromises.set(modelId, promise);
  }
  return promise;
}

export interface SessionIo {
  inputName: string;
  inputShape: readonly (number | string)[];
  outputName: string;
  outputShape: readonly (number | string)[];
}

/**
 * 测量前先定位测量对象：输入输出的名字与形状来自会话元数据，
 * 而不是手写常量——喂错形状，测的就不是同一个模型了。
 */
export function readSessionIo(session: InferenceSession): SessionIo {
  const input = session.inputMetadata[0];
  const output = session.outputMetadata[0];
  if (!input?.isTensor || !output?.isTensor) {
    throw new Error('本范例只支持张量输入输出的模型。');
  }
  if (input.type !== 'float32') {
    throw new Error(`本范例只构造 float32 输入，模型需要 ${input.type}。`);
  }
  return {
    inputName: session.inputNames[0],
    inputShape: input.shape,
    outputName: session.outputNames[0],
    outputShape: output.shape,
  };
}

export function buildFeeds(io: SessionIo): InferenceSession.FeedsType {
  // 形状里的符号维（string）无法直接分配，本课两个模型都是固定数值形状。
  const dims = io.inputShape.map((value) => {
    if (typeof value !== 'number') {
      throw new Error(`输入含符号维 ${String(value)}，需要固定形状才能构造输入。`);
    }
    return value;
  });
  const elementCount = dims.reduce((total, dim) => total * dim, 1);
  return {
    [io.inputName]: new Tensor('float32', new Float32Array(elementCount), dims),
  };
}

/** 预热 N 次后连续计时 M 次。计时窗口包住 await run——run 返回 Promise，丢掉 await 计的只是调度时间。 */
export async function measure(
  session: InferenceSession,
  feeds: InferenceSession.FeedsType,
  warmupCount: number,
  sampleCount: number,
): Promise<number[]> {
  for (let index = 0; index < warmupCount; index += 1) {
    await session.run(feeds);
  }
  const samples: number[] = [];
  for (let index = 0; index < sampleCount; index += 1) {
    const start = performance.now();
    await session.run(feeds);
    samples.push(performance.now() - start);
  }
  return samples;
}

export interface TimingStats {
  first: number;
  min: number;
  median: number;
  p95: number;
  max: number;
  mean: number;
}

/** 分布统计：median 是典型值，p95 是尾部，max 含异常尖峰；均值会被单个离群点拉偏。 */
export function summarize(samples: number[]): TimingStats {
  const sorted = [...samples].sort((a, b) => a - b);
  const count = sorted.length;
  const middle = Math.floor(count / 2);
  const median =
    count % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
  // p95 用最近秩法：第 ceil(0.95 × n) 个样本。
  const p95 = sorted[Math.ceil(0.95 * count) - 1];
  const total = sorted.reduce((sum, value) => sum + value, 0);
  return {
    first: samples[0],
    min: sorted[0],
    median,
    p95,
    max: sorted[count - 1],
    mean: total / count,
  };
}

export interface TimingSnapshot {
  status: 'running' | 'ready' | 'error';
  message: string;
  modelLabel: string;
  inputSignature: string;
  outputSignature: string;
  backendNote: string;
  warmupCount: number;
  sampleCount: number;
  stats?: TimingStats;
}

export interface TimingArgs {
  model: string;
  warmup: number;
  samples: number;
}

export interface RunTimingInstance {
  update(args: TimingArgs): void;
  dispose(): void;
}

const READOUT_BACKEND_NOTE = 'wasm · 单线程（无跨域隔离）';

export function createRunTiming(
  canvas: HTMLCanvasElement,
  emit: (snapshot: TimingSnapshot) => void,
): RunTimingInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  let args: TimingArgs = { model: 'squeezenet', warmup: 0, samples: 30 };
  let running = false;
  let pending: TimingArgs | undefined;
  let ranKey = '';
  let status: TimingSnapshot['status'] = 'running';
  let message = '创建会话…';
  let io: SessionIo | undefined;
  let samples: number[] = [];
  let stats: TimingStats | undefined;

  function snapshot(): TimingSnapshot {
    const spec = modelSpec(args.model);
    return {
      status,
      message,
      modelLabel: spec.label,
      inputSignature: io ? `${io.inputName}: float32[${io.inputShape.join(',')}]` : '—',
      outputSignature: io ? `${io.outputName}: float32[${io.outputShape.join(',')}]` : '—',
      backendNote: READOUT_BACKEND_NOTE,
      warmupCount: args.warmup,
      sampleCount: args.samples,
      stats,
    };
  }

  function emitSnapshot() {
    emit(snapshot());
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(520, size.width);
    const height = Math.max(240, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = '#172033';
    ctx.font = '600 15px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(`每次取样的 run 耗时（${args.samples} 次，预热 ${args.warmup} 次）`, 28, 34);

    if (samples.length === 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = '13px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText(status === 'error' ? message : '测量中…', 28, 72);
      emitSnapshot();
      return;
    }

    const left = 28;
    const chartTop = 56;
    const chartHeight = height - chartTop - 58;
    const chartWidth = width - left * 2;
    const peak = Math.max(...samples);
    const barWidth = Math.max(2, chartWidth / samples.length - 2);

    // median 参考线：一眼看出「典型值」与离群点的距离。
    const medianY = chartTop + chartHeight * (1 - stats!.median / peak);
    ctx.strokeStyle = '#94a3b8';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(left, medianY);
    ctx.lineTo(left + chartWidth, medianY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#64748b';
    ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText(`median ${stats!.median.toFixed(2)} ms`, left + chartWidth - 132, medianY - 5);

    samples.forEach((value, index) => {
      const barHeight = Math.max(1, chartHeight * (value / peak));
      const x = left + index * (barWidth + 2);
      const y = chartTop + chartHeight - barHeight;
      // 未预热时首个样本承担冷启动成本，单独着色；预热后它与稳态同色。
      const isColdStart = index === 0 && args.warmup === 0;
      ctx.fillStyle = isColdStart ? '#d97706' : '#4f7cff';
      ctx.fillRect(x, y, barWidth, barHeight);
    });

    ctx.fillStyle = '#475569';
    ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
    if (args.warmup === 0) {
      ctx.fillText('琥珀色 = 首个样本（冷启动，未预热）', left, height - 20);
    } else {
      ctx.fillText(`已预热 ${args.warmup} 次：首个样本不再是离群点`, left, height - 20);
    }
    ctx.fillText(`峰值 ${peak.toFixed(2)} ms`, left + chartWidth - 96, height - 20);
    emitSnapshot();
  }

  async function run(nextArgs: TimingArgs) {
    if (running) {
      pending = nextArgs;
      return;
    }
    running = true;
    ranKey = JSON.stringify(nextArgs);
    args = nextArgs;
    status = 'running';
    message = '创建会话…';
    samples = [];
    stats = undefined;
    draw();

    try {
      const session = await createSession(nextArgs.model);
      io = readSessionIo(session);
      message = '预热与计时中…';
      draw();
      const feeds = buildFeeds(io);
      const measured = await measure(session, feeds, nextArgs.warmup, nextArgs.samples);
      samples = measured;
      stats = summarize(measured);
      status = 'ready';
      message = '就绪';
    } catch (error) {
      status = 'error';
      message = error instanceof Error ? error.message : String(error);
    }
    running = false;
    draw();

    // 测量期间参数又变了：按最新参数再跑一轮。
    if (pending) {
      const next = pending;
      pending = undefined;
      if (JSON.stringify(next) !== ranKey) {
        void run(next);
      }
    }
  }

  function onClick() {
    if (status === 'error') {
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
