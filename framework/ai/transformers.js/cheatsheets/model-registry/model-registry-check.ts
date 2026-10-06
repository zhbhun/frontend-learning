/**
 * 范例：ModelRegistry 加载前检查器——文件清单、实测体积、缓存命中三件套。
 *
 * - 前置状态：不下载模型权重、不做推理。体积来自 get_file_metadata（内部是
 *   只取 1 字节的 Range 请求，秒级返回）；缓存检查 is_pipeline_cached_files
 *   纯本地。distilbert 若在本浏览器、同一 origin 下运行过 1.2 课示例
 *   （默认 q8 档），应显示全部命中；未用过的模型显示 0 命中。
 * - 输入：Controls 的「模型预设」与「dtype 档位」。
 * - 操作：切换预设或档位，观察文件清单、各文件体积与缓存命中的变化。
 * - 预期结果：画布逐行列出 get_pipeline_files 返回的文件（名称 | 实测体积 |
 *   缓存状态），底部汇总合计体积、缓存命中与实际需下载量；仓库未提供的
 *   档位（q2）体积显示 未提供。
 * - 阅读主线：check（get_pipeline_files → is_pipeline_cached_files →
 *   get_file_metadata 求和）→ draw（清单渲染与读数输出）。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

// Storybook 工作区未安装 npm 包，沿用兄弟课的官方 CDN 动态导入；
// npm 项目请改用：import { ModelRegistry } from '@huggingface/transformers'
const TRANSFORMERS_CDN =
  'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0';

// 主预设与 1.2 课同一模型：检查阶段就能读到它的真实缓存状态
export type ModelPreset = 'distilbert' | 'minilm';

export interface PresetInfo {
  task: string;
  modelId: string;
}

// 两个预设覆盖不同任务与使用状态：text-classification（已用过）/ feature-extraction（未用过）
export const MODEL_PRESETS: Record<ModelPreset, PresetInfo> = {
  distilbert: {
    task: 'text-classification',
    modelId: 'Xenova/distilbert-base-uncased-finetuned-sst-2-english',
  },
  minilm: {
    task: 'feature-extraction',
    modelId: 'onnx-community/all-MiniLM-L6-v2-ONNX',
  },
};

// 检查演示覆盖五档：q8 是浏览器 WASM 默认档；q2 两个仓库都未导出，用来观察「未提供」
export type DtypeChoice = 'fp32' | 'fp16' | 'q8' | 'q4' | 'q2';

/** ModelRegistry 在 CDN 构建上的最小读取面（完整签名见官方 API 页） */
interface ModelRegistryLike {
  get_pipeline_files(
    task: string,
    modelId: string,
    options?: { dtype?: string },
  ): Promise<string[]>;
  is_pipeline_cached_files(
    task: string,
    modelId: string,
    options?: { dtype?: string },
  ): Promise<{
    allCached: boolean;
    files: Array<{ file: string; cached: boolean }>;
  }>;
  get_file_metadata(
    modelId: string,
    filename: string,
  ): Promise<{ exists: boolean; size?: number }>;
}

let registryPromise: Promise<ModelRegistryLike> | null = null;

/** 动态导入只发生一次：拿到 ModelRegistry 静态类（主入口命名导出） */
function loadRegistry(): Promise<ModelRegistryLike> {
  if (!registryPromise) {
    registryPromise = import(/* @vite-ignore */ TRANSFORMERS_CDN).then(
      (mod) => mod.ModelRegistry as ModelRegistryLike,
    );
  }
  return registryPromise;
}

export type CheckStatus = 'loading' | 'ready' | 'error';

/** 画布上一行文件：sizeText 为 null 表示仓库未提供该文件（exists: false） */
export interface FileRow {
  file: string;
  sizeText: string | null;
  cached: boolean;
}

export interface ModelRegistryOptions {
  model: ModelPreset;
  dtype: DtypeChoice;
}

export interface ModelRegistrySnapshot {
  status: CheckStatus;
  message: string;
  model: ModelPreset;
  modelId: string;
  dtype: DtypeChoice;
  fileCount: number;
  totalText: string | null;
  cacheText: string | null;
  pendingText: string | null;
}

export interface ModelRegistryInstance {
  update(options: ModelRegistryOptions): void;
  dispose(): void;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1e6) {
    return `${(bytes / 1e6).toFixed(1)} MB`;
  }
  if (bytes >= 1e3) {
    return `${(bytes / 1e3).toFixed(1)} KB`;
  }
  return `${bytes} B`;
}

export function createModelRegistryCheck(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ModelRegistrySnapshot) => void,
): ModelRegistryInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let currentModel: ModelPreset = 'distilbert';
  let currentDtype: DtypeChoice = 'q8';
  let status: CheckStatus = 'loading';
  let message = '正在加载库并执行 ModelRegistry 检查…';
  let rows: FileRow[] = [];
  let totalText: string | null = null;
  let cacheText: string | null = null;
  let pendingText: string | null = null;
  // 检查结果按（模型, dtype）留在本会话：切回已查过的组合不重复发请求
  const results = new Map<
    string,
    {
      rows: FileRow[];
      totalText: string;
      cacheText: string;
      pendingText: string;
    }
  >();
  let checkToken = 0;
  let disposed = false;

  function snapshot(): ModelRegistrySnapshot {
    return {
      status,
      message,
      model: currentModel,
      modelId: MODEL_PRESETS[currentModel].modelId,
      dtype: currentDtype,
      fileCount: rows.length,
      totalText,
      cacheText,
      pendingText,
    };
  }

  // canvas 只画图形状态；readout 表依赖 emit 送出的快照，必须与重绘同步派发
  function drawAndEmit() {
    draw();
    emit(snapshot());
  }

  function applyResult(cached: {
    rows: FileRow[];
    totalText: string;
    cacheText: string;
    pendingText: string;
  }) {
    rows = cached.rows;
    totalText = cached.totalText;
    cacheText = cached.cacheText;
    pendingText = cached.pendingText;
    status = 'ready';
    message = '读数来自本次会话的检查缓存；切换预设或档位可查询其他组合';
    drawAndEmit();
  }

  /**
   * 生产工作流的前两段：
   * ① get_pipeline_files 列出文件清单（与随后 pipeline 的下载清单一致）
   * ② is_pipeline_cached_files 查缓存命中 + get_file_metadata 逐文件求和
   * 两步都不下载权重；第三段「实际加载」不在本实例范围内。
   */
  async function check() {
    const token = ++checkToken;
    const preset = MODEL_PRESETS[currentModel];
    const dtype = currentDtype;
    const key = `${currentModel}:${dtype}`;

    const cached = results.get(key);
    if (cached) {
      applyResult(cached);
      return;
    }

    status = 'loading';
    message = `正在检查 ${preset.modelId}（${dtype}）…`;
    rows = [];
    totalText = null;
    cacheText = null;
    pendingText = null;
    drawAndEmit();

    try {
      const registry = await loadRegistry();
      if (disposed || token !== checkToken) {
        return;
      }

      // ① 该任务 + 模型 + dtype 会用到哪些文件；task 别名（如 sentiment-analysis）也能传
      const fileList = await registry.get_pipeline_files(
        preset.task,
        preset.modelId,
        { dtype },
      );
      if (disposed || token !== checkToken) {
        return;
      }

      // ② 纯本地缓存检查：逐文件是否已在本浏览器 origin 的缓存里，无网络请求
      const cacheStatus = await registry.is_pipeline_cached_files(
        preset.task,
        preset.modelId,
        { dtype },
      );
      if (disposed || token !== checkToken) {
        return;
      }
      const cachedByFile = new Map(
        cacheStatus.files.map((entry) => [entry.file, entry.cached]),
      );

      // ③ 逐文件查体积：1 字节 Range 请求；仓库未提供的档位返回 exists: false
      const metadataList = await Promise.all(
        fileList.map(async (file) => ({
          file,
          meta: await registry.get_file_metadata(preset.modelId, file),
        })),
      );
      if (disposed || token !== checkToken) {
        return;
      }

      let totalBytes = 0;
      let pendingBytes = 0;
      rows = metadataList.map(({ file, meta }) => {
        const size =
          meta.exists && typeof meta.size === 'number' ? meta.size : null;
        if (size != null) {
          totalBytes += size;
          // 已命中的文件不再下载：实际需下载量只统计未命中的文件
          if (!cachedByFile.get(file)) {
            pendingBytes += size;
          }
        }
        return {
          file,
          sizeText: size == null ? null : formatBytes(size),
          cached: cachedByFile.get(file) ?? false,
        };
      });
      const cachedCount = rows.filter((row) => row.cached).length;
      totalText = formatBytes(totalBytes);
      cacheText = `${cachedCount}/${rows.length}`;
      pendingText = formatBytes(pendingBytes);
      status = 'ready';
      message =
        rows.length > 0 && pendingBytes === 0
          ? '全部命中缓存：用同样参数调用 pipeline() 不会产生下载'
          : '以上是实际调用 pipeline() 前的全部信息；切换预设与档位可继续对比';

      results.set(key, { rows, totalText, cacheText, pendingText });
      drawAndEmit();
    } catch (error) {
      if (disposed || token !== checkToken) {
        return;
      }
      status = 'error';
      const detail = error instanceof Error ? error.message : String(error);
      // Hub 对不存在的仓库返回 401，registry 把 401/403 包装为 ModelFileNotFoundError 抛出
      message = /401|403|ModelFileNotFound|not found|nonexistent/i.test(detail)
        ? `仓库不存在或不可访问（Hub 返回 401/403，ModelFileNotFoundError）：${detail}`
        : `查询失败：${detail}。常见原因：网络受限或无法访问 huggingface.co / cdn.jsdelivr.net；重新切换预设或档位即可重试`;
      drawAndEmit();
    }
  }

  function fitText(text: string, maxWidth: number): string {
    if (drawingContext.measureText(text).width <= maxWidth) {
      return text;
    }
    let cut = text;
    while (
      cut.length > 1 &&
      drawingContext.measureText(`${cut}…`).width > maxWidth
    ) {
      cut = cut.slice(0, -1);
    }
    return `${cut}…`;
  }

  function wrapText(text: string, maxWidth: number): string[] {
    const lines: string[] = [];
    let line = '';
    for (const char of text) {
      const candidate = line + char;
      if (line && drawingContext.measureText(candidate).width > maxWidth) {
        lines.push(line);
        line = char;
      } else {
        line = candidate;
      }
    }
    if (line) {
      lines.push(line);
    }
    return lines;
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
    const preset = MODEL_PRESETS[currentModel];

    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 18px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('ModelRegistry 加载前检查', 48, 42);
    drawingContext.textAlign = 'right';
    drawingContext.fillStyle = '#64748b';
    drawingContext.font = '11px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('不下载权重 · 秒级查询', width - 48, 42);
    drawingContext.textAlign = 'left';

    // 检查对象：task + modelId + dtype —— 三者共同决定清单、体积与缓存键
    drawingContext.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillStyle = '#64748b';
    drawingContext.fillText(`task: ${preset.task} · dtype: ${currentDtype}`, 48, 70);
    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 13px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText(fitText(preset.modelId, contentWidth), 48, 92);

    // 文件清单：get_pipeline_files 的返回顺序；✓ = 已缓存，· = 未缓存
    let rowY = 120;
    if (status === 'loading' || rows.length === 0) {
      drawingContext.fillStyle = '#475569';
      drawingContext.font = '13px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText(status === 'loading' ? '检查中…' : '暂无结果', 48, rowY);
    } else {
      for (const row of rows) {
        drawingContext.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
        drawingContext.fillStyle = row.cached ? '#15803d' : '#94a3b8';
        drawingContext.fillText(row.cached ? '✓' : '·', 48, rowY);
        drawingContext.fillStyle = '#334155';
        drawingContext.fillText(fitText(row.file, contentWidth - 120), 66, rowY);
        drawingContext.textAlign = 'right';
        if (row.sizeText != null) {
          drawingContext.fillStyle = row.cached ? '#15803d' : '#475569';
          drawingContext.fillText(row.sizeText, width - 48, rowY);
        } else {
          drawingContext.fillStyle = '#b45309';
          drawingContext.fillText('未提供', width - 48, rowY);
        }
        drawingContext.textAlign = 'left';
        rowY += 20;
      }

      // 汇总行：合计体积与缓存命中；「实际需下载」在 readout 表中给出
      rowY += 6;
      drawingContext.fillStyle = '#172033';
      drawingContext.font = '600 12px ui-monospace, SFMono-Regular, Menlo, monospace';
      drawingContext.fillText(
        fitText(
          `共 ${rows.length} 个文件 · 合计 ${totalText ?? '—'} · 缓存命中 ${cacheText ?? '—'}`,
          contentWidth,
        ),
        48,
        rowY,
      );
    }

    // 状态消息：查询中 / 就绪结论 / 错误详情（最多 3 行，防溢出画布）
    drawingContext.fillStyle = status === 'error' ? '#b91c1c' : '#475569';
    drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
    const messageLines = wrapText(message, contentWidth).slice(0, 3);
    messageLines.forEach((line, index) => {
      drawingContext.fillText(line, 48, rowY + 26 + index * 18);
    });
  }

  const resizeObserver = createResizeObserver(canvas, drawAndEmit);
  void check();

  return {
    update(options) {
      const changed =
        options.model !== currentModel || options.dtype !== currentDtype;
      currentModel = options.model;
      currentDtype = options.dtype;
      if (disposed) {
        return;
      }
      // 切换组合给新检查；出错后任何一次 Controls 交互都给重试机会
      if (changed || status === 'error') {
        void check();
      } else {
        drawAndEmit();
      }
    },
    dispose() {
      disposed = true;
      resizeObserver.disconnect();
    },
  };
}
