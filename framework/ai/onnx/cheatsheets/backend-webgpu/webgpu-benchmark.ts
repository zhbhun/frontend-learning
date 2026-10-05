/**
 * 范例：检测本页 WebGPU 能力，并用同一份 MNIST 模型对 webgpu 与 wasm 两个后端计时对比。
 * 前置状态：浏览器需能访问 ort 资源 CDN 与 MNIST 模型（约 26KB，运行时拉取，不进仓库）。
 * ort 1.30 的 WebGPU 支持矩阵（js/web README）：Chrome/Edge（Windows）需 Chromium 113+，
 * float16 需 Chrome 121+ / Edge 122+；Safari、Firefox、iOS 不在支持之列。
 * 操作：用 Storybook 的 iterations 参数控制每个后端计时的推理次数，切换参数会重新计时
 * （会话已缓存，不会重复创建）。
 * 预期结果：WebGPU 可用时，读数显示 GPUAdapter 的真实信息（vendor/architecture、shader-f16
 * 特性）与两个后端各自的均值/最快耗时；MNIST 是毫秒级小模型，两个后端的差距通常很小，
 * 读数如实呈现、不做修饰。WebGPU 不可用时（无 navigator.gpu、requestAdapter 返回 null、
 * create 失败），读数给出确切原因，wasm 一侧照常计时——这条降级路径本身就是实例的一部分。
 * 阅读主线：probeWebGpu（能力检测与不可用原因）→ createSession（两个后端各缓存一个会话）→
 * benchmarkSession（预热一次后计时 N 次）；画布卡片与读数属于演示外壳。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';
import { env, InferenceSession, Tensor } from 'onnxruntime-web';

/** ONNX Model Zoo 的 MNIST 模型（约 26KB），走 Git LFS 的 media 端点。 */
export const MODEL_URL =
  'https://media.githubusercontent.com/media/onnx/models/main/validated/vision/classification/mnist/model/mnist-8.onnx';

/** 与工作区安装的 onnxruntime-web@1.30.0 配套的 wasm 资源 CDN（两个后端共用）。 */
export const WASM_CDN =
  'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0/dist/';

/** 为避免依赖 @webgpu/types，这里只声明本实例用到的最小 WebGPU 形状。 */
interface AdapterInfoLike {
  vendor?: string;
  architecture?: string;
  description?: string;
}

interface GpuAdapterLike {
  info?: AdapterInfoLike;
  features?: Set<string>;
  requestAdapterInfo?: () => Promise<AdapterInfoLike>;
}

interface GpuLike {
  requestAdapter(): Promise<GpuAdapterLike | null>;
}

export interface WebGpuProbe {
  supported: boolean;
  /** 不可用时的具体原因；可用时为空字符串。 */
  reason: string;
  /** GPUAdapter.info 的 vendor · architecture，取不到时如实说明。 */
  adapter: string;
  /** adapter.features 里的 shader-f16：float16 内核的硬件前提。 */
  shaderF16: string;
}

/** WebGPU 能力检测：逐级给出「不可用」的确切原因，而不是一个笼统的布尔值。 */
export async function probeWebGpu(): Promise<WebGpuProbe> {
  const gpu = (navigator as { gpu?: GpuLike }).gpu;
  if (!gpu) {
    return {
      supported: false,
      reason: 'navigator.gpu 不存在（浏览器未实现 WebGPU）',
      adapter: '—',
      shaderF16: '—',
    };
  }

  let adapter: GpuAdapterLike | null;
  try {
    adapter = await gpu.requestAdapter();
  } catch (error) {
    return {
      supported: false,
      reason: `requestAdapter() 抛错：${error instanceof Error ? error.message : String(error)}`,
      adapter: '—',
      shaderF16: '—',
    };
  }
  if (!adapter) {
    return {
      supported: false,
      reason: 'requestAdapter() 返回 null（当前环境没有可用适配器）',
      adapter: '—',
      shaderF16: '—',
    };
  }

  let info = adapter.info;
  if (!info?.vendor && adapter.requestAdapterInfo) {
    info = await adapter.requestAdapterInfo().catch(() => info);
  }
  const adapterText = info?.vendor
    ? [info.vendor, info.architecture].filter(Boolean).join(' · ')
    : '（适配器未提供信息）';

  return {
    supported: true,
    reason: '',
    adapter: adapterText,
    shaderF16: adapter.features?.has('shader-f16') ? '支持' : '不支持',
  };
}

export type BackendId = 'wasm' | 'webgpu';

const sessionPromises = new Map<BackendId, Promise<InferenceSession>>();

/**
 * 创建并缓存各后端的会话。executionProviders 里写明后端是唯一的启用动作；
 * 默认入口的 JSEP 工件已含 WebGPU 内核，无需额外导入，wasmPaths 与 wasm 后端共用。
 */
export function createSession(backend: BackendId): Promise<InferenceSession> {
  let promise = sessionPromises.get(backend);
  if (!promise) {
    env.wasm.wasmPaths = WASM_CDN;
    promise = InferenceSession.create(MODEL_URL, {
      executionProviders: [backend],
    }).catch((error: unknown) => {
      // 失败后清空缓存，让下一次交互可以重新创建会话。
      sessionPromises.delete(backend);
      throw error;
    });
    sessionPromises.set(backend, promise);
  }
  return promise;
}

/** 从 performance 资源记录里提取实际拉取过的 ort-wasm 工件文件名。 */
export function loadedArtifacts(): string {
  const names = new Set<string>();
  for (const entry of performance.getEntriesByType('resource')) {
    const match = entry.name.match(/ort-wasm-[a-z.-]+\.(?:wasm|mjs)/);
    if (match) {
      names.add(match[0]);
    }
  }
  return [...names].sort().join(' · ') || '—';
}

export interface BenchmarkResult {
  mean: number;
  best: number;
}

/**
 * 预热一次后计时 N 次，返回均值与最快值。预热不计入：首次 run 包含 GPU 内核
 * 编译与内存分配，把它算进均值会掩盖稳态差异。
 */
export async function benchmarkSession(
  session: InferenceSession,
  iterations: number,
): Promise<BenchmarkResult> {
  const feeds: InferenceSession.FeedsType = {
    [session.inputNames[0]]: new Tensor(
      'float32',
      new Float32Array(1 * 1 * 28 * 28),
      [1, 1, 28, 28],
    ),
  };
  await session.run(feeds);

  let total = 0;
  let best = Number.POSITIVE_INFINITY;
  for (let index = 0; index < iterations; index += 1) {
    const start = performance.now();
    await session.run(feeds);
    const elapsed = performance.now() - start;
    total += elapsed;
    best = Math.min(best, elapsed);
  }
  return { mean: total / iterations, best };
}

export interface WebGpuBenchmarkSnapshot {
  status: 'running' | 'ready' | 'error';
  message: string;
  support: string;
  adapter: string;
  shaderF16: string;
  wasmMean: string;
  wasmBest: string;
  webgpuMean: string;
  webgpuBest: string;
  /** 加速比 = wasm 均值 ÷ webgpu 均值；大于 1 表示 webgpu 更快。 */
  ratio: string;
  /** webgpu 会话创建/运行失败的原因（能力检测通过但执行失败的场合）。 */
  webgpuError: string;
  artifacts: string;
  webgpuActive: boolean;
}

export interface WebGpuBenchmarkArgs {
  iterations: number;
}

export interface WebGpuBenchmarkInstance {
  update(args: WebGpuBenchmarkArgs): void;
  dispose(): void;
}

export function createWebGpuBenchmark(
  canvas: HTMLCanvasElement,
  emit: (snapshot: WebGpuBenchmarkSnapshot) => void,
): WebGpuBenchmarkInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  let iterations = 20;
  let running = false;
  let ranIterations: number | undefined;

  let status: WebGpuBenchmarkSnapshot['status'] = 'running';
  let message = '检测 WebGPU 能力…';
  let probe: WebGpuProbe | undefined;
  let wasmResult: BenchmarkResult | undefined;
  let webgpuResult: BenchmarkResult | undefined;
  let webgpuError = '—';
  let artifacts = '—';

  function emitSnapshot() {
    const format = (result?: BenchmarkResult) =>
      result ? `${result.mean.toFixed(2)} ms` : '—';
    const bestOf = (result?: BenchmarkResult) =>
      result ? `${result.best.toFixed(2)} ms` : '—';
    const ratio =
      wasmResult && webgpuResult && webgpuResult.mean > 0
        ? `×${(wasmResult.mean / webgpuResult.mean).toFixed(2)}`
        : '—';
    emit({
      status,
      message,
      support: probe
        ? probe.supported
          ? '支持'
          : `不可用：${probe.reason}`
        : '检测中…',
      adapter: probe?.adapter ?? '—',
      shaderF16: probe?.shaderF16 ?? '—',
      wasmMean: format(wasmResult),
      wasmBest: bestOf(wasmResult),
      webgpuMean: format(webgpuResult),
      webgpuBest: bestOf(webgpuResult),
      ratio,
      webgpuError,
      artifacts,
      webgpuActive: webgpuResult !== undefined,
    });
  }

  interface CardState {
    title: string;
    active: boolean;
    lines: string[];
  }

  function drawCard(
    x: number,
    y: number,
    width: number,
    height: number,
    card: CardState,
  ) {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 8);
    ctx.fillStyle = card.active ? '#eef3ff' : '#f4f6fa';
    ctx.fill();
    ctx.strokeStyle = card.active ? '#4f7cff' : '#dbe2ec';
    ctx.lineWidth = card.active ? 2 : 1;
    ctx.stroke();

    ctx.fillStyle = '#172033';
    ctx.font = '600 15px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(card.title, x + 14, y + 26);

    const badge = card.active ? '已计时' : '未计时';
    const badgeWidth = 48;
    ctx.beginPath();
    ctx.roundRect(x + width - badgeWidth - 12, y + 12, badgeWidth, 20, 10);
    ctx.fillStyle = card.active ? '#4f7cff' : '#e2e8f0';
    ctx.fill();
    ctx.fillStyle = card.active ? '#ffffff' : '#64748b';
    ctx.font = '600 11px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(badge, x + width - badgeWidth / 2 - 12, y + 26);
    ctx.textAlign = 'left';

    ctx.fillStyle = '#475569';
    ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    card.lines.forEach((line, index) => {
      ctx.fillText(line, x + 14, y + 52 + index * 19);
    });
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(520, size.width);
    const height = Math.max(232, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const margin = 28;
    const gap = 14;
    const cardTop = 22;
    const cardHeight = 100;
    const cardWidth = (width - margin * 2 - gap) / 2;

    drawCard(margin, cardTop, cardWidth, cardHeight, {
      title: 'wasm · CPU 基线',
      active: wasmResult !== undefined,
      lines: [`均值 ${wasmResult ? `${wasmResult.mean.toFixed(2)} ms` : '—'}`, `最快 ${wasmResult ? `${wasmResult.best.toFixed(2)} ms` : '—'}`],
    });
    drawCard(margin + cardWidth + gap, cardTop, cardWidth, cardHeight, {
      title: 'webgpu · GPU',
      active: webgpuResult !== undefined,
      lines: [`均值 ${webgpuResult ? `${webgpuResult.mean.toFixed(2)} ms` : '—'}`, `最快 ${webgpuResult ? `${webgpuResult.best.toFixed(2)} ms` : '—'}`],
    });

    const conclusionY = cardTop + cardHeight + 40;
    ctx.font = '13px ui-sans-serif, system-ui, sans-serif';
    if (status === 'error') {
      ctx.fillStyle = '#991b1b';
      ctx.fillText(`加载失败：${message}`, margin, conclusionY - 14);
      ctx.fillStyle = '#b45309';
      ctx.fillText('点击画布可重试；请检查网络与 wasmPaths 版本（onnxruntime-web@1.30.0）', margin, conclusionY + 8);
    } else if (status === 'ready' && wasmResult && webgpuResult) {
      const ratio = wasmResult.mean / webgpuResult.mean;
      ctx.fillStyle = '#172033';
      ctx.font = '600 14px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText(
        `加速比（wasm 均值 ÷ webgpu 均值）×${ratio.toFixed(2)} · ${iterations} 次推理均值`,
        margin,
        conclusionY - 14,
      );
      ctx.fillStyle = '#475569';
      ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText(
        'MNIST 是毫秒级小模型：差距小甚至为负都属正常，GPU 的收益要到大模型上才显现',
        margin,
        conclusionY + 8,
      );
    } else if (status === 'ready' && probe && !probe.supported) {
      ctx.fillStyle = '#172033';
      ctx.font = '600 14px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText('WebGPU 不可用，本页按 wasm 基线运行（降级路径）', margin, conclusionY - 14);
      ctx.fillStyle = '#64748b';
      ctx.fillText(probe.reason, margin, conclusionY + 8);
    } else {
      ctx.fillStyle = '#64748b';
      ctx.fillText(message, margin, conclusionY - 14);
    }

    emitSnapshot();
  }

  async function run(nextIterations: number) {
    if (running) {
      return;
    }
    running = true;
    iterations = nextIterations;
    status = 'running';
    message = '检测 WebGPU 能力并创建会话…';
    draw();

    try {
      probe = await probeWebGpu();

      const wasmSession = await createSession('wasm');
      wasmResult = await benchmarkSession(wasmSession, iterations);

      if (probe.supported) {
        try {
          const webgpuSession = await createSession('webgpu');
          webgpuResult = await benchmarkSession(webgpuSession, iterations);
        } catch (error) {
          // 能力检测通过但执行失败（如浏览器不在 ort 支持矩阵内）：如实读数，不掩盖。
          webgpuResult = undefined;
          webgpuError =
            error instanceof Error ? error.message : String(error);
        }
      }

      artifacts = loadedArtifacts();
      status = 'ready';
      message = '就绪';
    } catch (error) {
      status = 'error';
      message = error instanceof Error ? error.message : String(error);
    }
    ranIterations = iterations;
    running = false;
    draw();
  }

  function onClick() {
    if (status === 'error') {
      void run(iterations);
    }
  }

  canvas.style.cursor = 'default';
  canvas.addEventListener('click', onClick);

  const resizeObserver = createResizeObserver(canvas, draw);

  draw();

  return {
    update(args) {
      // 会话已缓存：换 iterations 只重新计时，不重复创建；相同参数不重跑。
      if (args.iterations !== ranIterations) {
        void run(args.iterations);
      }
    },
    dispose() {
      canvas.removeEventListener('click', onClick);
      resizeObserver.disconnect();
      // 不释放共享会话：同一页面里其他内嵌实例可能仍在使用；释放策略见「内存管理」课程。
    },
  };
}
