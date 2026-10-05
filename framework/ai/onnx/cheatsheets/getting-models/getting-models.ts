/**
 * 范例：签名速查——用 InferenceSession.create 加载不同来源与形态的模型 URL，
 * 只读取会话元数据（inputNames / inputMetadata / outputNames / outputMetadata），
 * 刻意不执行推理：核对签名不需要跑一次模型。
 * 前置状态：浏览器需能访问模型 CDN；mnist-8 约 26KB、yolos-tiny 量化版约 9.2MB，
 * 均在运行时从远端拉取、不进仓库；首次切换 yolos-tiny 需等待下载。
 * 操作：Controls 切换「模型来源」；「raw（失败对照）」是刻意提供的失败路径——
 * 同一个模型文件，raw 端点只返回百余字节的 LFS 指针文本，无法解析。
 * 预期结果：media 与 resolve 选项显示真实输入输出签名；raw 选项显示解析失败信息。
 * 阅读主线：MODEL_SOURCES（URL 清单）→ ensureSession（按 URL 缓存创建会话）→
 * describeValues（把元数据转成签名条目）；画布绘制与读数属于演示外壳。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';
import { env, InferenceSession } from 'onnxruntime-web';

/** 与工作区安装的 onnxruntime-web@1.30.0 配套的 wasm 资源 CDN。 */
const WASM_CDN = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0/dist/';

export type ModelSourceId = 'zoo-media' | 'hf-resolve' | 'zoo-raw';

export interface ModelSource {
  id: ModelSourceId;
  /** Controls 里显示的选项名。 */
  label: string;
  /** 画布与读数里显示的来源说明。 */
  note: string;
  url: string;
}

/** 三个对照选项：两个能加载的不同来源，加一个刻意的失败对照。 */
export const MODEL_SOURCES: ModelSource[] = [
  {
    id: 'zoo-media',
    label: 'Model Zoo · media 端点',
    note: 'mnist-8（约 26KB）—— GitHub LFS 真身',
    url: 'https://media.githubusercontent.com/media/onnx/models/main/validated/vision/classification/mnist/model/mnist-8.onnx',
  },
  {
    id: 'hf-resolve',
    label: 'HuggingFace · resolve',
    note: 'Xenova/yolos-tiny 量化版（约 9.2MB）—— HF CDN 直连',
    url: 'https://huggingface.co/Xenova/yolos-tiny/resolve/main/onnx/model_quantized.onnx',
  },
  {
    id: 'zoo-raw',
    label: 'Model Zoo · raw（失败对照）',
    note: '同一个小模型 —— raw 返回 130 字节 LFS 指针文本',
    url: 'https://raw.githubusercontent.com/onnx/models/main/validated/vision/classification/mnist/model/mnist-8.onnx',
  },
];

/**
 * 按 URL 缓存会话：切换选项再切回来时不需要重新下载。
 * env 的 wasm 标志必须在第一个会话创建之前设置；失败的 URL 不缓存，允许重试。
 */
const sessionCache = new Map<string, Promise<InferenceSession>>();

function ensureSession(url: string): Promise<InferenceSession> {
  let cached = sessionCache.get(url);
  if (!cached) {
    env.wasm.wasmPaths = WASM_CDN;
    // 工作区没有 COOP/COEP 响应头（跨域隔离），保持单线程基线。
    env.wasm.numThreads = 1;
    cached = InferenceSession.create(url, {
      executionProviders: ['wasm'],
    }).catch((error: unknown) => {
      sessionCache.delete(url);
      throw error;
    });
    sessionCache.set(url, cached);
  }
  return cached;
}

export interface SignatureEntry {
  name: string;
  /** 例如 "float32 [1,1,28,28]"；? 表示未知维度（符号维度）。 */
  desc: string;
}

export interface SignatureSnapshot {
  status: 'loading' | 'ready' | 'error';
  message: string;
  sourceNote: string;
  inputs: SignatureEntry[];
  outputs: SignatureEntry[];
}

export interface SignatureInspectorOptions {
  sourceId: ModelSourceId;
}

export interface SignatureInspectorInstance {
  update(options: SignatureInspectorOptions): void;
  dispose(): void;
}

/** 把会话元数据转成「名字 + 类型与形状」的签名条目；未知维度显示为 ?。 */
function describeValues(
  values: readonly InferenceSession.ValueMetadata[],
): SignatureEntry[] {
  return values.map((meta) => {
    if (!meta.isTensor) {
      return { name: meta.name, desc: '非张量值' };
    }
    const dims = meta.shape.map((dim) => (dim === '' ? '?' : String(dim)));
    return { name: meta.name, desc: `${meta.type} [${dims.join(',')}]` };
  });
}

function truncate(text: string, max = 110): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

const COLOR_TEXT = '#172033';
const COLOR_MUTED = '#475569';
const COLOR_ACCENT = '#4f7cff';
const COLOR_OK = '#16a34a';
const COLOR_BAD = '#dc2626';
const SANS = 'ui-sans-serif, system-ui, sans-serif';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

export function createSignatureInspector(
  canvas: HTMLCanvasElement,
  emit: (snapshot: SignatureSnapshot) => void,
): SignatureInspectorInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  let source: ModelSource = MODEL_SOURCES[0];
  let snapshot: SignatureSnapshot = {
    status: 'loading',
    message: '加载模型…',
    sourceNote: source.note,
    inputs: [],
    outputs: [],
  };
  let loadToken = 0;
  let disposed = false;

  function emitSnapshot() {
    emit(snapshot);
  }

  function drawColumn(title: string, entries: SignatureEntry[], x: number, y: number) {
    ctx.fillStyle = COLOR_TEXT;
    ctx.font = `600 14px ${SANS}`;
    ctx.fillText(`${title}（${entries.length} 个）`, x, y);

    ctx.font = `13px ${MONO}`;
    let rowY = y + 30;
    for (const entry of entries) {
      ctx.fillStyle = COLOR_TEXT;
      ctx.fillText(entry.name, x, rowY);
      ctx.fillStyle = COLOR_ACCENT;
      ctx.fillText(entry.desc, x, rowY + 20);
      rowY += 48;
    }
    if (entries.length === 0 && snapshot.status === 'ready') {
      ctx.fillStyle = COLOR_MUTED;
      ctx.fillText('无', x, rowY);
    }
    // 右栏左侧画一条分隔竖线，帮助两栏对齐阅读。
    if (x > 48) {
      ctx.strokeStyle = 'rgba(23,32,51,0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - 28, y - 18);
      ctx.lineTo(x - 28, y + 168);
      ctx.stroke();
    }
  }

  function drawErrorPanel(width: number, height: number) {
    const boxX = 48;
    const boxY = height / 2 - 30;
    const boxWidth = width - 96;
    // 先设为错误文本的字体再测量换行，保证 measureText 与实际绘制一致。
    ctx.font = `12px ${MONO}`;
    const lines: string[] = [];
    let line = '';
    for (const char of truncate(snapshot.message)) {
      if (ctx.measureText(line + char).width > boxWidth - 28) {
        lines.push(line);
        line = char;
        if (lines.length >= 3) {
          break;
        }
      } else {
        line += char;
      }
    }
    if (lines.length < 3 && line) {
      lines.push(line);
    }
    const boxHeight = 40 + lines.length * 19 + 24;

    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 6);
    ctx.fillStyle = '#fff5f5';
    ctx.fill();
    ctx.strokeStyle = '#fecaca';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = COLOR_BAD;
    ctx.font = `600 13px ${SANS}`;
    ctx.fillText('加载失败', boxX + 14, boxY + 24);
    ctx.fillStyle = COLOR_BAD;
    ctx.font = `12px ${MONO}`;
    lines.forEach((text, index) => {
      ctx.fillText(text, boxX + 14, boxY + 46 + index * 19);
    });
    ctx.fillStyle = '#b45309';
    ctx.font = `12px ${SANS}`;
    ctx.fillText(
      '提示：确认 URL 返回的是模型文件本体，而不是网页或 LFS 指针文本。',
      boxX + 14,
      boxY + boxHeight - 10,
    );
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(560, size.width);
    const height = Math.max(300, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = COLOR_TEXT;
    ctx.font = `600 18px ${SANS}`;
    ctx.fillText('签名速查：模型 URL → 会话元数据（未执行推理）', 48, 44);

    ctx.fillStyle = COLOR_ACCENT;
    ctx.font = `13px ${MONO}`;
    ctx.fillText(snapshot.sourceNote, 48, 72);

    const statusColor =
      snapshot.status === 'ready'
        ? COLOR_OK
        : snapshot.status === 'error'
          ? COLOR_BAD
          : COLOR_MUTED;
    const statusText =
      snapshot.status === 'error' ? '加载失败（详情见下方面板）' : snapshot.message;
    ctx.fillStyle = statusColor;
    ctx.font = `600 14px ${SANS}`;
    ctx.fillText(statusText, 48, 100);

    if (snapshot.status === 'error') {
      drawErrorPanel(width, height);
    } else {
      const midX = Math.round(width / 2) + 16;
      drawColumn('输入 · feeds 的键', snapshot.inputs, 48, 148);
      drawColumn('输出 · 按名读取', snapshot.outputs, midX, 148);
      if (snapshot.status === 'loading') {
        ctx.fillStyle = COLOR_MUTED;
        ctx.font = `13px ${SANS}`;
        ctx.fillText('首次加载会下载模型文件，稍候…', 48, height - 28);
      }
    }

    emitSnapshot();
  }

  async function load() {
    const token = ++loadToken;
    snapshot = {
      status: 'loading',
      message: '加载模型…',
      sourceNote: source.note,
      inputs: [],
      outputs: [],
    };
    draw();
    try {
      const session = await ensureSession(source.url);
      if (token !== loadToken || disposed) {
        return;
      }
      snapshot = {
        status: 'ready',
        message: '就绪 · 签名来自会话元数据',
        sourceNote: source.note,
        inputs: describeValues(session.inputMetadata),
        outputs: describeValues(session.outputMetadata),
      };
    } catch (error) {
      if (token !== loadToken || disposed) {
        return;
      }
      snapshot = {
        status: 'error',
        message: error instanceof Error ? error.message : String(error),
        sourceNote: source.note,
        inputs: [],
        outputs: [],
      };
    }
    draw();
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  // 打开实例即加载默认来源（Model Zoo 的 mnist-8），无需等待交互。
  draw();
  void load();

  return {
    update(options) {
      const next =
        MODEL_SOURCES.find((item) => item.id === options.sourceId) ??
        MODEL_SOURCES[0];
      if (next.id === source.id && snapshot.status !== 'error') {
        return;
      }
      source = next;
      void load();
    },
    dispose() {
      disposed = true;
      loadToken += 1;
      resizeObserver.disconnect();
      // 不释放共享会话：同页其他内嵌实例可能仍在使用（见「内存管理」课程）。
    },
  };
}
