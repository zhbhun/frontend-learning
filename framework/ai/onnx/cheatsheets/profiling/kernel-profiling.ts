/**
 * 范例：WebGPU 内核计时的官方入口——env.webgpu.profiling.mode 与 profiling.ondata。
 * 前置状态：浏览器需支持 WebGPU，且适配器暴露 timestamp-query（或
 * chromium-experimental-timestamp-query-inside-passes）特性，才会产生内核计时；
 * 需能访问 ort 资源 CDN 与 mnist-8.onnx（26KB）。profiling.mode 是 env 全局单例上的
 * 标志，按既有口径应在第一个 WebGPU 会话创建之前设置。
 * 操作：打开实例即自动执行，无需交互；实例使用 mnist-8 模型。
 * 预期结果：先逐级给出能力检测结论（navigator.gpu → requestAdapter() →
 * timestamp-query 特性），随后创建 ['webgpu'] 会话并串行执行 4 次 run；ondata 收到的
 * 每条记录含内核名、算子类型与起止时间（纳秒，相对时间基），画布按算子类型汇总为
 * 耗时排行。任一级检测失败或设备不支持时间戳查询时，读数给出确切原因——
 * 「诊断工具有自己的边界」这件事本身就是本范例的证据之一。
 * 阅读主线：probeWebGpu（逐级检测）→ setupProfiling（设置 mode 与 ondata）→
 * createSession（webgpu 会话，按模型缓存）→ aggregate（按算子类型聚合剖析记录）。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';
import { env, InferenceSession, Tensor } from 'onnxruntime-web';
import type { Env } from 'onnxruntime-web';

/** ONNX Model Zoo 的 MNIST 模型（约 26KB），走 Git LFS 的 media 端点。 */
export const MODEL_URL =
  'https://media.githubusercontent.com/media/onnx/models/main/validated/vision/classification/mnist/model/mnist-8.onnx';

/** 与工作区安装的 onnxruntime-web@1.30.0 配套的 wasm 资源 CDN。 */
export const WASM_CDN =
  'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0/dist/';

/** 为避免依赖 @webgpu/types，这里只声明本实例用到的最小 WebGPU 形状。 */
interface AdapterInfoLike {
  vendor?: string;
  architecture?: string;
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
  adapter: string;
  /** 适配器是否提供时间戳查询特性：内核计时的硬件前提。 */
  timestampQuery: string;
}

/** 逐级检测并给出「不可用」的确切原因，而不是一个笼统的布尔值。 */
export async function probeWebGpu(): Promise<WebGpuProbe> {
  const gpu = (navigator as { gpu?: GpuLike }).gpu;
  if (!gpu) {
    return {
      supported: false,
      reason: 'navigator.gpu 不存在（浏览器未实现 WebGPU）',
      adapter: '—',
      timestampQuery: '—',
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
      timestampQuery: '—',
    };
  }
  if (!adapter) {
    return {
      supported: false,
      reason: 'requestAdapter() 返回 null（当前环境没有可用适配器）',
      adapter: '—',
      timestampQuery: '—',
    };
  }

  let info = adapter.info;
  if (!info?.vendor && adapter.requestAdapterInfo) {
    info = await adapter.requestAdapterInfo().catch(() => info);
  }
  const adapterText = info?.vendor
    ? [info.vendor, info.architecture].filter(Boolean).join(' · ')
    : '（适配器未提供信息）';
  const hasTimestampQuery =
    adapter.features?.has('chromium-experimental-timestamp-query-inside-passes') ||
    adapter.features?.has('timestamp-query');

  return {
    supported: true,
    reason: '',
    adapter: adapterText,
    timestampQuery: hasTimestampQuery ? '支持' : '不支持（收不到内核计时）',
  };
}

type ProfilingData = Env.WebGpuProfilingData;

/**
 * 在第一个 WebGPU 会话创建之前设置：mode 打开内核计时，ondata 把每条记录
 * 收进数组（不设 ondata 时数据会以 `[profiling]` 前缀打印到 console）。
 */
export function setupProfiling(): ProfilingData[] {
  env.webgpu.profiling.mode = 'default';
  const records: ProfilingData[] = [];
  env.webgpu.profiling.ondata = (data) => {
    records.push(data);
  };
  return records;
}

let sessionPromise: Promise<InferenceSession> | undefined;

/** 会话按需创建并缓存：模块加载不触发网络与设备初始化。 */
function createSessionOnce(): Promise<InferenceSession> {
  if (!sessionPromise) {
    env.wasm.wasmPaths = WASM_CDN;
    sessionPromise = InferenceSession.create(MODEL_URL, {
      executionProviders: ['webgpu'],
    }).catch((error: unknown) => {
      // 失败后清空缓存，让下一次交互可以重新创建会话。
      sessionPromise = undefined;
      throw error;
    });
  }
  return sessionPromise;
}

export interface KernelAggregate {
  /** 算子类型，如 Conv、MaxPool。 */
  kernelType: string;
  /** 汇总执行耗时（毫秒）。 */
  totalMs: number;
  /** 该算子类型被记录到的次数。 */
  count: number;
}

/** 剖析记录里的时间是纳秒（相对时间基）；按算子类型聚合为耗时排行。 */
export function aggregate(records: ProfilingData[]): KernelAggregate[] {
  const byType = new Map<string, KernelAggregate>();
  for (const record of records) {
    const entry = byType.get(record.kernelType) ?? {
      kernelType: record.kernelType,
      totalMs: 0,
      count: 0,
    };
    entry.totalMs += (record.endTime - record.startTime) / 1e6;
    entry.count += 1;
    byType.set(record.kernelType, entry);
  }
  return [...byType.values()].sort((a, b) => b.totalMs - a.totalMs);
}

/** ondata 在查询回读后异步到达：run 结束后再等一个窗口期收尾。 */
export const PROFILING_SETTLE_MS = 600;

export interface ProfilingSnapshot {
  status: 'running' | 'ready' | 'error';
  message: string;
  support: string;
  adapter: string;
  timestampQuery: string;
  profilingMode: string;
  runCount: string;
  recordCount: string;
  topKernels: string[];
}

export interface ProfilingInstance {
  update(): void;
  dispose(): void;
}

export function createKernelProfiling(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ProfilingSnapshot) => void,
): ProfilingInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  const RUN_COUNT = 4;
  let status: ProfilingSnapshot['status'] = 'running';
  let message = '检测 WebGPU 能力…';
  let probe: WebGpuProbe | undefined;
  let records: ProfilingData[] = [];
  let aggregates: KernelAggregate[] = [];
  let ran = false;

  function emitSnapshot() {
    const topLines = aggregates
      .slice(0, 3)
      .map(
        (entry) =>
          `${entry.kernelType} ×${entry.count} · 共 ${entry.totalMs.toFixed(3)} ms`,
      );
    emit({
      status,
      message,
      support: probe
        ? probe.supported
          ? '支持'
          : `不可用：${probe.reason}`
        : '检测中…',
      adapter: probe?.adapter ?? '—',
      timestampQuery: probe?.timestampQuery ?? '—',
      profilingMode: "env.webgpu.profiling.mode = 'default'",
      runCount: `${RUN_COUNT} 次（串行）`,
      recordCount: `${records.length} 条`,
      topKernels: topLines.length > 0 ? topLines : ['—'],
    });
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
    ctx.fillText('按算子类型汇总的内核耗时（ondata 记录）', 28, 34);

    if (aggregates.length === 0) {
      ctx.fillStyle = status === 'error' ? '#991b1b' : '#64748b';
      ctx.font = '13px ui-sans-serif, system-ui, sans-serif';
      const hint =
        status === 'ready' && probe?.supported
          ? '已按 ondata 口径执行完毕；未收到剖析记录（设备不支持时间戳查询或数据尚未回读）'
          : status === 'ready'
            ? probe?.reason ?? 'WebGPU 不可用，无法演示内核计时'
            : message;
      ctx.fillText(hint, 28, 72);
      emitSnapshot();
      return;
    }

    const left = 28;
    const chartTop = 56;
    const rowHeight = 26;
    const chartWidth = width - left * 2 - 190;
    const peak = aggregates[0].totalMs;

    aggregates.slice(0, 8).forEach((entry, index) => {
      const y = chartTop + index * rowHeight;
      const barWidth = Math.max(2, chartWidth * (entry.totalMs / peak));
      ctx.fillStyle = '#4f7cff';
      ctx.fillRect(left, y, barWidth, rowHeight - 8);
      ctx.fillStyle = '#172033';
      ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillText(
        `${entry.kernelType} ×${entry.count}`,
        left + chartWidth + 10,
        y + 13,
      );
      ctx.fillStyle = '#475569';
      ctx.fillText(`${entry.totalMs.toFixed(3)} ms`, left + chartWidth + 110, y + 13);
    });

    ctx.fillStyle = '#64748b';
    ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(
      `${records.length} 条剖析记录 · ${RUN_COUNT} 次 run · 时间为内核执行的相对时长`,
      left,
      height - 20,
    );
    emitSnapshot();
  }

  async function run() {
    if (ran) {
      return;
    }
    ran = true;
    status = 'running';
    draw();

    try {
      probe = await probeWebGpu();
      if (!probe.supported) {
        status = 'ready';
        message = 'WebGPU 不可用';
        draw();
        return;
      }

      records = setupProfiling();
      message = '创建 WebGPU 会话…';
      draw();

      const session = await createSessionOnce();
      const input = session.inputMetadata[0];
      if (!input?.isTensor) {
        throw new Error('MNIST 模型输入不是张量。');
      }
      const dims = input.shape.map((value) => {
        if (typeof value !== 'number') {
          throw new Error(`输入含符号维 ${String(value)}。`);
        }
        return value;
      });
      const feeds: InferenceSession.FeedsType = {
        [session.inputNames[0]]: new Tensor(
          'float32',
          new Float32Array(dims.reduce((total, dim) => total * dim, 1)),
          dims,
        ),
      };

      // 同一会话的 run 必须串行；剖析记录随查询回读异步到达，结束后再等一个窗口期。
      for (let index = 0; index < RUN_COUNT; index += 1) {
        await session.run(feeds);
      }
      message = '等待剖析数据回读…';
      draw();
      await new Promise((resolve) => setTimeout(resolve, PROFILING_SETTLE_MS));

      aggregates = aggregate(records);
      status = 'ready';
      message = '就绪';
    } catch (error) {
      status = 'error';
      message = error instanceof Error ? error.message : String(error);
    }
    draw();
  }

  const resizeObserver = createResizeObserver(canvas, draw);
  void run();

  return {
    update() {
      // 本实例无需参数：打开即执行一次完整检测与计时。
    },
    dispose() {
      resizeObserver.disconnect();
      // 不释放共享会话，也不清 env.webgpu.profiling：同一页面里其他内嵌实例可能仍在使用。
    },
  };
}
