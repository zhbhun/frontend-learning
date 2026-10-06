/**
 * 范例：device 与 dtype 探测器——两个轻量读数：WebGPU 可用性检测 + dtype 对应的
 * ONNX 文件体积实测。
 *
 * - 前置状态：不加载模型权重、不做推理。WebGPU 检测只读 navigator.gpu 与适配器
 *   信息；体积探测只对 Hub 的 resolve URL 发 HEAD 请求（Hub 会 302 到 CDN，fetch
 *   默认跟随，读取最终响应的 Content-Length，秒级返回）。
 * - 输入：Controls 的「dtype 档位」（dtype 全集 12 档，默认 q8 即浏览器默认档）。
 * - 操作：查看画布顶部 WebGPU / shader-f16 读数；切换 dtype 观察对应文件名与
 *   实测体积（条形相对 fp32 基准伸缩）。
 * - 预期结果：仓库提供的档位显示文件名与体积；本仓库未导出的档位显示
 *   「未提供（HEAD 404）」；网络受限时显示查询失败，再次切换档位即可重试。
 * - 阅读主线：SUFFIX_BY_DTYPE（复刻源码 DEFAULT_DTYPE_SUFFIX_MAPPING）→
 *   probeWebGPU（可用性检测）→ probeFileSize（HEAD 请求与缓存）→ draw（读数渲染）。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

// 本课示例模型：与 1.2 课相同，只探测它的 onnx/ 目录，不下载任何权重
const MODEL_ID = 'Xenova/distilbert-base-uncased-finetuned-sst-2-english';

// dtype 全集（v4.3.0 源码 DATA_TYPES 去掉 auto）
export type DtypeValue =
  | 'fp32'
  | 'fp16'
  | 'q8'
  | 'int8'
  | 'uint8'
  | 'q4'
  | 'q4f16'
  | 'q2'
  | 'q2f16'
  | 'q1'
  | 'q1f16'
  | 'bnb4';

/**
 * dtype → 文件名后缀：复刻 v4.3.0 源码 utils/dtypes.js 的 DEFAULT_DTYPE_SUFFIX_MAPPING。
 * 实际下载地址 = onnx/ 子目录 + 基础名 model + 后缀 + .onnx；
 * 注意 q8 的后缀是 _quantized（历史命名），不是 _q8。
 */
const SUFFIX_BY_DTYPE: Record<DtypeValue, string> = {
  fp32: '',
  fp16: '_fp16',
  int8: '_int8',
  uint8: '_uint8',
  q8: '_quantized',
  q4: '_q4',
  q2: '_q2',
  q1: '_q1',
  q4f16: '_q4f16',
  q2f16: '_q2f16',
  q1f16: '_q1f16',
  bnb4: '_bnb4',
};

/** WebGPU API 的最小读取面：info 与 features 在部分浏览器可能缺失 */
interface AdapterInfoLike {
  vendor?: string;
  architecture?: string;
  device?: string;
  description?: string;
}

interface AdapterLike {
  info?: AdapterInfoLike;
  features?: { has(name: string): boolean };
}

interface NavigatorGpuLike {
  requestAdapter(): Promise<AdapterLike | null>;
}

export type ProbeStatus = 'loading' | 'ready';

export interface DeviceDtypeOptions {
  dtype: DtypeValue;
}

export interface DeviceDtypeSnapshot {
  status: ProbeStatus;
  message: string;
  webgpuText: string;
  shaderF16Text: string;
  dtype: DtypeValue;
  fileName: string | null;
  sizeText: string | null;
  repoText: string | null;
  ratio: number | null;
}

export interface DeviceDtypeInstance {
  update(options: DeviceDtypeOptions): void;
  dispose(): void;
}

/** 单个档位的探测结果：ok 带字节数；missing = 仓库未导出；error = 网络等异常 */
type FileProbe =
  | { kind: 'ok'; bytes: number }
  | { kind: 'missing' }
  | { kind: 'error'; detail: string };

/** WebGPU 可用性检测：navigator.gpu 存在性 + requestAdapter 读适配器信息 */
async function probeWebGPU(): Promise<{
  available: boolean;
  detail: string;
  shaderF16: boolean | null;
}> {
  // 库内部同款判断（env.js）：'gpu' in navigator
  const gpu = (navigator as Navigator & { gpu?: NavigatorGpuLike }).gpu;
  if (!gpu) {
    return { available: false, detail: 'navigator.gpu 不存在', shaderF16: null };
  }
  try {
    const adapter = await gpu.requestAdapter();
    if (!adapter) {
      return { available: false, detail: '无可用适配器', shaderF16: null };
    }
    // shader-f16 决定 fp16 档位能否在 WebGPU 上运行（源码 session.js 的硬校验点）
    const shaderF16 = adapter.features?.has('shader-f16') ?? null;
    const info = adapter.info;
    const name = info
      ? [info.vendor, info.architecture, info.description ?? info.device]
          .filter(Boolean)
          .join(' · ') || '适配器信息不可用'
      : '适配器信息不可用';
    return { available: true, detail: name, shaderF16 };
  } catch (error) {
    return {
      available: false,
      detail: `requestAdapter 抛错（${error instanceof Error ? error.message : String(error)}）`,
      shaderF16: null,
    };
  }
}

/** HEAD 请求探测文件体积：只取响应头，不下载权重；Hub 302 到 CDN 后最终响应带 Content-Length */
async function probeFileSize(url: string): Promise<FileProbe> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    if (response.status === 404) {
      return { kind: 'missing' };
    }
    if (!response.ok) {
      return { kind: 'error', detail: `HTTP ${response.status}` };
    }
    const length = response.headers.get('content-length');
    if (length === null) {
      return { kind: 'error', detail: '响应无 Content-Length' };
    }
    return { kind: 'ok', bytes: Number(length) };
  } catch (error) {
    return {
      kind: 'error',
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

/** 十进制 MB，与正文表格一致（67.6 MB 这种写法） */
function formatBytes(bytes: number): string {
  return `${(bytes / 1e6).toFixed(1)} MB`;
}

function fileUrl(dtype: DtypeValue): string {
  const suffix = SUFFIX_BY_DTYPE[dtype];
  return `https://huggingface.co/${MODEL_ID}/resolve/main/onnx/model${suffix}.onnx`;
}

export function createDeviceDtypeProbe(
  canvas: HTMLCanvasElement,
  emit: (snapshot: DeviceDtypeSnapshot) => void,
): DeviceDtypeInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let status: ProbeStatus = 'loading';
  let message = '正在检测 WebGPU 与 fp32 基准体积…';
  let webgpuText = '检测中…';
  let shaderF16Text = '—';
  let currentDtype: DtypeValue = 'q8';
  let fileName: string | null = null;
  let sizeText: string | null = null;
  let repoText: string | null = null;
  let ratio: number | null = null;
  let fp32Bytes: number | null = null;
  const probes = new Map<DtypeValue, FileProbe>();
  let probeToken = 0;
  let disposed = false;

  function snapshot(): DeviceDtypeSnapshot {
    return {
      status,
      message,
      webgpuText,
      shaderF16Text,
      dtype: currentDtype,
      fileName,
      sizeText,
      repoText,
      ratio,
    };
  }

  // canvas 只画图形状态；readout 表依赖 emit 送出的快照，必须与重绘同步派发
  function drawAndEmit() {
    draw();
    emit(snapshot());
  }

  /** 把一次探测结果写进当前读数 */
  function applyProbe(dtype: DtypeValue, probe: FileProbe) {
    fileName = `onnx/model${SUFFIX_BY_DTYPE[dtype]}.onnx`;
    if (probe.kind === 'ok') {
      sizeText = formatBytes(probe.bytes);
      repoText = '已提供（HEAD 200）';
      ratio = fp32Bytes == null ? null : probe.bytes / fp32Bytes;
    } else if (probe.kind === 'missing') {
      sizeText = null;
      repoText = '未提供（HEAD 404）';
      ratio = null;
    } else {
      sizeText = null;
      repoText = `查询失败（${probe.detail}）`;
      ratio = null;
    }
    drawAndEmit();
  }

  async function probeDtype(dtype: DtypeValue) {
    if (disposed) {
      return;
    }
    const cached = probes.get(dtype);
    if (cached && cached.kind !== 'error') {
      // 缓存命中直接应用，不闪「查询中」
      applyProbe(dtype, cached);
      return;
    }
    const token = ++probeToken;
    fileName = `onnx/model${SUFFIX_BY_DTYPE[dtype]}.onnx`;
    sizeText = null;
    repoText = '查询中…';
    ratio = null;
    drawAndEmit();
    const probe = await probeFileSize(fileUrl(dtype));
    if (disposed) {
      return;
    }
    // 结果先入缓存：即使档位已切走，下次切回时直接命中
    probes.set(dtype, probe);
    // 只在"仍是当前档位且没有更新发起的探测"时更新显示，避免旧请求覆盖新读数
    if (token !== probeToken || dtype !== currentDtype) {
      return;
    }
    applyProbe(dtype, probe);
  }

  /** fp32 是体积对比的基准：启动时先实测一次（也是全精度档位本身的缓存） */
  async function loadBaseline() {
    const probe = await probeFileSize(fileUrl('fp32'));
    if (disposed) {
      return;
    }
    probes.set('fp32', probe);
    if (probe.kind === 'ok') {
      fp32Bytes = probe.bytes;
      const cached = probes.get(currentDtype);
      if (cached && cached.kind === 'ok') {
        applyProbe(currentDtype, cached);
        return;
      }
      drawAndEmit();
    } else {
      message = 'fp32 基准查询失败，比例条暂不可用；档位读数仍可查看，切换档位即可重试';
      drawAndEmit();
    }
  }

  async function init() {
    const gpu = await probeWebGPU();
    if (disposed) {
      return;
    }
    webgpuText = gpu.available ? `可用 · ${gpu.detail}` : `不可用（${gpu.detail}）`;
    shaderF16Text =
      gpu.shaderF16 === null
        ? '—（WebGPU 不可用）'
        : gpu.shaderF16
          ? '支持（fp16 可用）'
          : '不支持（webgpu + fp16 将被拒绝）';
    status = 'ready';
    message = '切换「dtype 档位」查看对应文件与实测体积';
    drawAndEmit();
    void loadBaseline();
    void probeDtype(currentDtype);
  }

  function fitText(text: string, maxWidth: number): string {
    if (drawingContext.measureText(text).width <= maxWidth) {
      return text;
    }
    let cut = text;
    while (cut.length > 1 && drawingContext.measureText(`${cut}…`).width > maxWidth) {
      cut = cut.slice(0, -1);
    }
    return `${cut}…`;
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(240, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const contentWidth = width - 96;

    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 18px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('device 与 dtype 探测器', 48, 42);
    drawingContext.textAlign = 'right';
    drawingContext.fillStyle = '#64748b';
    drawingContext.font = '11px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('HEAD 实测 · 不下载权重', width - 48, 42);
    drawingContext.textAlign = 'left';

    // WebGPU 检测读数：来源是 navigator.gpu + requestAdapter，见 probeWebGPU
    const gpuColor = webgpuText.startsWith('可用')
      ? '#15803d'
      : webgpuText === '检测中…'
        ? '#475569'
        : '#b91c1c';
    drawingContext.fillStyle = gpuColor;
    drawingContext.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText(fitText(`WebGPU: ${webgpuText}`, contentWidth), 48, 72);

    const f16Color = shaderF16Text.startsWith('支持')
      ? '#15803d'
      : shaderF16Text.startsWith('不支持')
        ? '#b45309'
        : '#94a3b8';
    drawingContext.fillStyle = f16Color;
    drawingContext.fillText(fitText(`shader-f16: ${shaderF16Text}`, contentWidth), 48, 94);

    // dtype 对应的 ONNX 文件名：基础名 model + SUFFIX_BY_DTYPE 后缀
    drawingContext.fillStyle = '#64748b';
    drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(`当前 dtype: ${currentDtype} → 对应文件`, 48, 126);
    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 15px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText(fitText(fileName ?? '—', contentWidth), 48, 150);

    if (sizeText) {
      drawingContext.fillStyle = '#4f7cff';
      drawingContext.font = '600 26px ui-monospace, SFMono-Regular, Menlo, monospace';
      drawingContext.fillText(sizeText, 48, 188);
    } else if (repoText === '未提供（HEAD 404）') {
      drawingContext.fillStyle = '#b45309';
      drawingContext.font = '600 20px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText('仓库未提供该档位文件', 48, 188);
    } else if (repoText === '查询中…') {
      drawingContext.fillStyle = '#475569';
      drawingContext.font = '14px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText('查询中…', 48, 186);
    }

    // 体积条：以 fp32 实测体积为 100% 基准，展示当前档位的相对大小
    const trackWidth = contentWidth;
    drawingContext.fillStyle = '#e2e8f0';
    drawingContext.fillRect(48, 206, trackWidth, 18);
    if (ratio != null && ratio > 0) {
      drawingContext.fillStyle = '#4f7cff';
      drawingContext.fillRect(48, 206, Math.min(1, ratio) * trackWidth, 18);
      drawingContext.fillStyle = '#475569';
      drawingContext.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
      drawingContext.fillText(
        `相当于 fp32 基准（${formatBytes(fp32Bytes ?? 0)}）的 ${(ratio * 100).toFixed(1)}%`,
        48,
        246,
      );
    } else if (fp32Bytes != null) {
      drawingContext.fillStyle = '#94a3b8';
      drawingContext.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
      drawingContext.fillText(`fp32 基准：${formatBytes(fp32Bytes)}（满条）`, 48, 246);
    }

    // 查询失败红字提示；其余状态（含初始加载中）用中性灰
    drawingContext.fillStyle = repoText !== null && repoText.startsWith('查询失败') ? '#b91c1c' : '#475569';
    drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(fitText(message, contentWidth), 48, 268);
  }

  const resizeObserver = createResizeObserver(canvas, draw);
  drawAndEmit();
  void init();

  return {
    update(options) {
      currentDtype = options.dtype;
      if (disposed || status !== 'ready') {
        draw();
        return;
      }
      const cached = probes.get(currentDtype);
      if (cached?.kind === 'error') {
        // 上次查询失败的档位：切换/重选给一次重试机会
        probes.delete(currentDtype);
        void probeDtype(currentDtype);
        return;
      }
      if (cached) {
        applyProbe(currentDtype, cached);
      } else {
        void probeDtype(currentDtype);
      }
    },
    dispose() {
      disposed = true;
      resizeObserver.disconnect();
    },
  };
}
