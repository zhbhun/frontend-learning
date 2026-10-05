/**
 * 范例：体积与速度对照——同一模型的 fp32 与 int8 变体，在浏览器里量出真实读数。
 * 前置状态：浏览器需能访问 ort 资源 CDN 与模型文件（运行时拉取，不进仓库）：
 * mnist-12（26,143 字节）/ mnist-12-int8（10,969 字节）与 squeezenet1.0-9
 * （4,952,222 字节）/ squeezenet1.0-12-int8（1,293,388 字节），均来自 ONNX Model
 * Zoo 的 Git LFS media 端点。无跨域隔离头，wasm 以单线程运行——读数注明测量环境。
 * 操作：用参数切换对照对（SqueezeNet / MNIST）与采样次数（10/30）；切换后按最新
 * 参数重跑一轮真实测量：下载两份文件并计字节数 → 创建两个会话 → 各预热 1 次、
 * 连续计时 M 次。上一轮进行中则等它结束后再跑最新一轮。
 * 预期结果：体积组读数来自 buffer.byteLength（等于文件字节数）；耗时组读数来自
 * performance.now() 的真实测量（median）。机器相关，只承诺同机同页同口径下的
 * 相对比较；小模型在单线程 wasm 上接近持平是正常结果。
 * 阅读主线：PAIRS（对照对清单）→ loadModel（下载计数 + 按 URL 缓存会话）→
 * measure（预热后连续计时取 median）→ 画布两组条形与读数。
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

/** 一对可对照的模型：同一个网络的两份权重——fp32 原版与 int8 量化版。 */
export interface ModelPair {
  id: 'mnist' | 'squeezenet';
  label: string;
  fp32: { label: string; url: string };
  int8: { label: string; url: string };
}

export const PAIRS: ModelPair[] = [
  {
    id: 'squeezenet',
    label: 'SqueezeNet 1.0（权重主导）',
    fp32: { label: 'squeezenet1.0-9', url: `${ZOO}/squeezenet/model/squeezenet1.0-9.onnx` },
    int8: {
      label: 'squeezenet1.0-12-int8',
      url: `${ZOO}/squeezenet/model/squeezenet1.0-12-int8.onnx`,
    },
  },
  {
    id: 'mnist',
    label: 'MNIST（图结构占比大）',
    fp32: { label: 'mnist-12', url: `${ZOO}/mnist/model/mnist-12.onnx` },
    int8: { label: 'mnist-12-int8', url: `${ZOO}/mnist/model/mnist-12-int8.onnx` },
  },
];

export function pairById(id: string): ModelPair {
  const pair = PAIRS.find((item) => item.id === id);
  if (!pair) {
    throw new Error(`未知对照对：${id}`);
  }
  return pair;
}

/** 下载并计数：buffer.byteLength 就是文件字节数（等于 Content-Length）。按 URL 缓存，来回切换不重复下载。 */
const bufferPromises = new Map<string, Promise<ArrayBufferLike>>();

function download(url: string): Promise<ArrayBufferLike> {
  let promise = bufferPromises.get(url);
  if (!promise) {
    promise = fetch(url).then((response) => {
      if (!response.ok) {
        throw new Error(`下载失败：HTTP ${response.status}`);
      }
      return response.arrayBuffer();
    }).catch((error: unknown) => {
      bufferPromises.delete(url);
      throw error;
    });
    bufferPromises.set(url, promise);
  }
  return promise;
}

/** 按会话缓存：体积读数记一次，耗时测量可重复；失败的 URL 不缓存，允许重试。 */
const sessionPromises = new Map<string, Promise<InferenceSession>>();

function ensureSession(url: string, buffer: ArrayBufferLike): Promise<InferenceSession> {
  let promise = sessionPromises.get(url);
  if (!promise) {
    env.wasm.wasmPaths = WASM_CDN;
    // 工作区没有 COOP/COEP 响应头（跨域隔离），保持单线程基线。
    env.wasm.numThreads = 1;
    promise = InferenceSession.create(buffer, {
      executionProviders: ['wasm'],
    }).catch((error: unknown) => {
      sessionPromises.delete(url);
      throw error;
    });
    sessionPromises.set(url, promise);
  }
  return promise;
}

/** 从会话元数据读输入签名，构造全零输入——计时只关心形状，不关心数值。 */
function buildFeeds(session: InferenceSession): InferenceSession.FeedsType {
  const input = session.inputMetadata[0];
  if (!input?.isTensor) {
    throw new Error('本范例只支持张量输入的模型。');
  }
  if (input.type !== 'float32') {
    throw new Error(`本范例只构造 float32 输入，模型需要 ${input.type}。`);
  }
  const dims = input.shape.map((value) => {
    if (typeof value !== 'number') {
      throw new Error(`输入含符号维 ${String(value)}，需要固定形状才能构造输入。`);
    }
    return value;
  });
  const count = dims.reduce((total, dim) => total * dim, 1);
  return {
    [session.inputNames[0]]: new Tensor('float32', new Float32Array(count), dims),
  };
}

/** 计时口径与「性能测量」课一致：预热挡一次性成本，median 代表稳态。 */
async function measure(
  session: InferenceSession,
  feeds: InferenceSession.FeedsType,
  sampleCount: number,
): Promise<number> {
  await session.run(feeds); // 预热 1 次：首次 run 含初始化成本，不计入统计
  const samples: number[] = [];
  for (let index = 0; index < sampleCount; index += 1) {
    const start = performance.now();
    await session.run(feeds);
    samples.push(performance.now() - start);
  }
  samples.sort((a, b) => a - b);
  return samples[Math.floor(samples.length / 2)];
}

export interface SizeSpeedSnapshot {
  status: 'loading' | 'measuring' | 'ready' | 'error';
  message: string;
  pairLabel: string;
  fp32Label: string;
  int8Label: string;
  fp32Bytes?: number;
  int8Bytes?: number;
  fp32Median?: number;
  int8Median?: number;
  sampleCount: number;
  backendNote: string;
}

export interface SizeSpeedArgs {
  pair: string;
  samples: number;
}

export interface SizeSpeedInstance {
  update(args: SizeSpeedArgs): void;
  dispose(): void;
}

const COLOR_TEXT = '#172033';
const COLOR_MUTED = '#475569';
const COLOR_FP32 = '#4f7cff';
const COLOR_INT8 = '#16a34a';
const SANS = 'ui-sans-serif, system-ui, sans-serif';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

const BACKEND_NOTE = 'wasm · 单线程（无跨域隔离）';

function formatBytes(bytes: number): string {
  if (bytes >= 1048576) {
    return `${(bytes / 1048576).toFixed(2)} MB`;
  }
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export function createSizeSpeed(
  canvas: HTMLCanvasElement,
  emit: (snapshot: SizeSpeedSnapshot) => void,
): SizeSpeedInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  let args: SizeSpeedArgs = { pair: 'squeezenet', samples: 30 };
  let snapshot: SizeSpeedSnapshot = {
    status: 'loading',
    message: '下载与测量中…',
    pairLabel: PAIRS[0].label,
    fp32Label: PAIRS[0].fp32.label,
    int8Label: PAIRS[0].int8.label,
    sampleCount: 30,
    backendNote: BACKEND_NOTE,
  };
  let running = false;
  let pending: SizeSpeedArgs | undefined;
  let ranKey = '';

  function emitSnapshot() {
    emit(snapshot);
  }

  /** 画一组双条形：label → 两根按 value 等比的条 → 数值标注。 */
  function drawGroup(
    title: string,
    rows: { label: string; value?: number; total: number; color: string }[],
    top: number,
    width: number,
    format: (value: number) => string,
  ) {
    ctx.fillStyle = COLOR_TEXT;
    ctx.font = `600 14px ${SANS}`;
    ctx.fillText(title, 28, top);

    const barLeft = 208;
    const barMax = width - barLeft - 148;
    rows.forEach((row, index) => {
      const y = top + 20 + index * 34;
      ctx.fillStyle = COLOR_MUTED;
      ctx.font = `12px ${MONO}`;
      ctx.fillText(row.label, 28, y + 15);

      if (row.value === undefined) {
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('…', barLeft, y + 15);
        return;
      }
      const ratio = row.total > 0 ? row.value / row.total : 0;
      ctx.fillStyle = row.color;
      ctx.fillRect(barLeft, y + 2, Math.max(2, barMax * ratio), 20);
      ctx.fillStyle = COLOR_TEXT;
      ctx.font = `12px ${MONO}`;
      ctx.fillText(format(row.value), barLeft + barMax + 10, y + 15);
    });
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(560, size.width);
    const height = Math.max(260, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = COLOR_TEXT;
    ctx.font = `600 15px ${SANS}`;
    ctx.fillText(`fp32 ↔ int8 同口对照：${snapshot.pairLabel}`, 28, 32);

    const maxBytes = Math.max(snapshot.fp32Bytes ?? 0, snapshot.int8Bytes ?? 0);
    drawGroup(
      '下载体积（文件字节数）',
      [
        { label: snapshot.fp32Label, value: snapshot.fp32Bytes, total: maxBytes, color: COLOR_FP32 },
        { label: snapshot.int8Label, value: snapshot.int8Bytes, total: maxBytes, color: COLOR_INT8 },
      ],
      64,
      width,
      (value) => `${value.toLocaleString('en-US')} B（${formatBytes(value)}）`,
    );

    const maxMedian = Math.max(snapshot.fp32Median ?? 0, snapshot.int8Median ?? 0);
    drawGroup(
      `稳态 run 耗时（median，预热 1 次 × 采样 ${snapshot.sampleCount}）`,
      [
        { label: snapshot.fp32Label, value: snapshot.fp32Median, total: maxMedian, color: COLOR_FP32 },
        { label: snapshot.int8Label, value: snapshot.int8Median, total: maxMedian, color: COLOR_INT8 },
      ],
      154,
      width,
      (value) => `${value.toFixed(2)} ms`,
    );

    ctx.fillStyle = COLOR_MUTED;
    ctx.font = `12px ${SANS}`;
    ctx.fillText(
      snapshot.status === 'error'
        ? `出错了：${snapshot.message}（点击画布重试）`
        : snapshot.message,
      28,
      height - 14,
    );
    ctx.fillText(`测量环境：${BACKEND_NOTE}`, width - 268, height - 14);
    emitSnapshot();
  }

  async function run(nextArgs: SizeSpeedArgs) {
    if (running) {
      pending = nextArgs;
      return;
    }
    running = true;
    ranKey = JSON.stringify(nextArgs);
    args = nextArgs;
    const pair = pairById(nextArgs.pair);
    snapshot = {
      status: 'loading',
      message: '下载模型…',
      pairLabel: pair.label,
      fp32Label: pair.fp32.label,
      int8Label: pair.int8.label,
      fp32Bytes: undefined,
      int8Bytes: undefined,
      fp32Median: undefined,
      int8Median: undefined,
      sampleCount: nextArgs.samples,
      backendNote: BACKEND_NOTE,
    };
    draw();

    try {
      const fp32Buffer = await download(pair.fp32.url);
      snapshot.fp32Bytes = fp32Buffer.byteLength;
      snapshot.message = '下载 int8 变体…';
      draw();
      const int8Buffer = await download(pair.int8.url);
      snapshot.int8Bytes = int8Buffer.byteLength;
      snapshot.status = 'measuring';
      snapshot.message = '创建会话并计时…';
      draw();

      const fp32Session = await ensureSession(pair.fp32.url, fp32Buffer);
      const int8Session = await ensureSession(pair.int8.url, int8Buffer);
      const fp32Feeds = buildFeeds(fp32Session);
      const int8Feeds = buildFeeds(int8Session);

      snapshot.fp32Median = await measure(fp32Session, fp32Feeds, nextArgs.samples);
      snapshot.message = 'int8 测量中…';
      draw();
      snapshot.int8Median = await measure(int8Session, int8Feeds, nextArgs.samples);
      snapshot.status = 'ready';
      snapshot.message = '就绪 · 体积读数来自文件字节，耗时读数来自真实测量';
    } catch (error) {
      snapshot.status = 'error';
      snapshot.message = error instanceof Error ? error.message : String(error);
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
