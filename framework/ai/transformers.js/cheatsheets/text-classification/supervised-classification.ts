/**
 * 范例：text-classification 深入——top_k 与多结果输出，二分类与多分类的输出差异。
 *
 * - 前置状态：首次使用某个模型需从 Hugging Face Hub 下载 q8 权重（二分类约 67.6 MB、
 *   三分类约 136 MB），完成后写入浏览器 Cache；二分类模型与 1.2 / 2.1.2 课共用，
 *   在本浏览器打开过那些课程时缓存直接命中。
 * - 输入：Controls 中的「分类模型」「示例文本」「top_k」。
 * - 操作：等待「状态」变为 就绪，依次切换三个控件，观察画布标签条与读数。
 * - 预期结果：画布按分数降序画出返回的每个标签条；「结果条数」跟随 top_k（超过
 *   类别数被截断），top_k 取全部时「分数合计」≈ 1.0000（softmax 归一化的直接证据）；
 *   同一句中性文本在二分类模型上被迫二选一，三分类模型给出 neutral。
 * - 阅读主线：ensurePipe（按需加载所选模型，失败可重试）→ classify（top_k 推理）→ draw（渲染）。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

// Storybook 工作区未安装 npm 包，这里按官方 README 的 CDN 用法加载浏览器构建；
// npm 项目请改用：import { pipeline } from '@huggingface/transformers'
const TRANSFORMERS_CDN =
  'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0';

/** 两个示例模型跑同一个任务：标签集不同——输出的全部差异都来自这里 */
export const MODELS = {
  sst2: {
    id: 'Xenova/distilbert-base-uncased-finetuned-sst-2-english',
    name: '二分类 · SST-2（英文）',
    size: '约 67.6 MB',
  },
  multi: {
    id: 'Xenova/distilbert-base-multilingual-cased-sentiments-student',
    name: '三分类 · 多语情感',
    size: '约 136 MB',
  },
} as const;

export type ModelKey = keyof typeof MODELS;
export type SupervisedStatus = 'loading' | 'running' | 'ready' | 'error';

export interface SupervisedOptions {
  model: ModelKey;
  text: string;
  /** Controls 的原始值：'1' | '2' | '3' | 'all'；'all' 映射为 top_k: null */
  topK: string;
}

export interface SupervisedSnapshot {
  status: SupervisedStatus;
  message: string;
  text: string;
  modelName: string;
  topK: string;
  count: number | null;
  sum: number | null;
  loadSeconds: string | null;
}

export interface SupervisedInstance {
  update(options: SupervisedOptions): void;
  dispose(): void;
}

/** pipeline 推理函数的最小形态：top_k 传 null 时返回全部类别 */
type ClassifyPipe = (
  text: string,
  options?: { top_k?: number | null },
) => Promise<unknown>;

interface LabelScore {
  label: string;
  score: number;
}

/** 按标签关键词上色：POSITIVE / NEGATIVE / neutral 各有固定颜色 */
function labelColor(label: string): string {
  const lower = label.toLowerCase();
  if (lower.includes('positive')) {
    return '#15803d';
  }
  if (lower.includes('negative')) {
    return '#b91c1c';
  }
  if (lower.includes('neutral')) {
    return '#64748b';
  }
  return '#4f7cff';
}

export function createSupervisedClassification(
  canvas: HTMLCanvasElement,
  emit: (snapshot: SupervisedSnapshot) => void,
): SupervisedInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: SupervisedOptions = {
    model: 'sst2',
    text: 'I love transformers!',
    topK: 'all',
  };
  let status: SupervisedStatus = 'loading';
  let message = '首次运行：正在从 CDN 加载库与模型…';
  let downloadProgress = 0;
  let lastPercent = -1;
  let results: LabelScore[] | null = null;
  let disposed = false;
  let runToken = 0;
  let loadSeconds: string | null = null;

  // 每个模型只加载一次：切换模型不丢弃已就绪的实例，切回来时免加载
  const pipes = new Map<string, Promise<ClassifyPipe>>();
  const ready = new Set<string>();

  function ensurePipe(modelKey: ModelKey): Promise<ClassifyPipe> {
    const modelId = MODELS[modelKey].id;
    let promise = pipes.get(modelId);
    if (!promise) {
      const startedAt = performance.now();
      promise = (async () => {
        // @vite-ignore 让 Vite 跳过对这条 URL 的构建期分析，交给浏览器在运行时加载
        const mod = await import(/* @vite-ignore */ TRANSFORMERS_CDN);
        return (await mod.pipeline('text-classification', modelId, {
          // dtype / device 不传，按环境默认——浏览器 WASM 下即 q8 档位
          progress_callback: (info: { status: string; progress?: number }) => {
            if (disposed || current.model !== modelKey) {
              return; // 只为当前展示的模型显示下载进度
            }
            // 事件流：initiate → download → progress（单文件）→ done；全部就绪后 ready
            if (info.status === 'progress' || info.status === 'progress_total') {
              const percent = Math.round(info.progress ?? 0);
              if (percent !== lastPercent) {
                lastPercent = percent;
                downloadProgress = percent;
                message = `正在下载「${MODELS[modelKey].name}」权重（${MODELS[modelKey].size}，仅首次）：${percent}%`;
                draw();
              }
            }
          },
        })) as ClassifyPipe;
      })();
      pipes.set(modelId, promise);
      promise
        .then(() => {
          ready.add(modelKey);
          loadSeconds = ((performance.now() - startedAt) / 1000).toFixed(1);
        })
        .catch(() => {
          // 加载失败移除缓存的 Promise，切换控件后可重试
          pipes.delete(modelId);
        });
    }
    return promise;
  }

  /** Controls 值的展示文案：'all' 即 top_k: null */
  function topKText(): string {
    return current.topK === 'all' ? 'null（全部）' : current.topK;
  }

  function snapshot(): SupervisedSnapshot {
    const sum = results
      ? results.reduce((total, item) => total + item.score, 0)
      : null;
    return {
      status,
      message,
      text: current.text,
      modelName: MODELS[current.model].name,
      topK: topKText(),
      count: results ? results.length : null,
      sum,
      loadSeconds,
    };
  }

  // canvas 只画图形状态；readout 表依赖 emit 送出的快照，必须与重绘同步派发
  function draw() {
    render();
    emit(snapshot());
  }

  function render() {
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
    drawingContext.fillText(
      'text-classification：top_k 与多结果输出',
      48,
      52,
    );

    drawingContext.fillStyle = '#475569';
    drawingContext.font = '14px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText(`输入：${truncate(current.text, contentWidth)}`, 48, 84);

    drawingContext.fillStyle = '#64748b';
    drawingContext.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText(
      `模型：${MODELS[current.model].name}　top_k：${topKText()}`,
      48,
      108,
    );

    if (status === 'loading') {
      drawingContext.fillStyle = '#e2e8f0';
      drawingContext.fillRect(48, 136, contentWidth, 16);
      drawingContext.fillStyle = '#4f7cff';
      drawingContext.fillRect(
        48,
        136,
        (contentWidth * Math.min(100, downloadProgress)) / 100,
        16,
      );
      drawingContext.fillStyle = '#475569';
      drawingContext.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
      wrapText(message, contentWidth).forEach((line, index) => {
        drawingContext.fillText(line, 48, 176 + index * 20);
      });
      return;
    }

    if (status === 'error') {
      drawingContext.fillStyle = '#b91c1c';
      drawingContext.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
      wrapText(message, contentWidth).forEach((line, index) => {
        drawingContext.fillText(line, 48, 150 + index * 20);
      });
      return;
    }

    if (results === null || results.length === 0) {
      drawingContext.fillStyle = '#475569';
      drawingContext.font = '14px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText(message, 48, 160);
      return;
    }

    // 输出 [{ label, score }]：pipeline 已按 score 降序排列，这里原样呈现
    const trackX = 205;
    const trackWidth = Math.max(60, width - trackX - 76);
    results.slice(0, 5).forEach((item, index) => {
      const top = 140 + index * 34;
      const color = labelColor(item.label);

      drawingContext.fillStyle = color;
      drawingContext.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
      drawingContext.fillText(item.label, 48, top + 12);

      drawingContext.fillStyle = '#e2e8f0';
      drawingContext.fillRect(trackX, top, trackWidth, 14);
      drawingContext.fillStyle = color;
      drawingContext.fillRect(trackX, top, trackWidth * item.score, 14);

      drawingContext.fillStyle = '#475569';
      drawingContext.fillText(
        `${(item.score * 100).toFixed(2)}%`,
        trackX + trackWidth + 8,
        top + 12,
      );
    });

    // softmax 归一化的直接证据：top_k 取全部时合计 ≈ 1.0000
    const shownRows = Math.min(5, results.length);
    const sum = results.reduce((total, item) => total + item.score, 0);
    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 14px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText(
      `分数合计：${sum.toFixed(4)}${current.topK === 'all' ? '（softmax 归一化）' : '（仅返回的条目）'}`,
      48,
      154 + shownRows * 34,
    );
  }

  async function classify() {
    const runId = ++runToken;
    const meta = MODELS[current.model];
    const isReady = ready.has(meta.id);
    status = isReady ? 'running' : 'loading';
    message = isReady
      ? '推理中…'
      : `首次使用「${meta.name}」需下载 ${meta.size}（仅一次，之后命中浏览器缓存）`;
    draw();
    try {
      const pipe = await ensurePipe(current.model);
      if (disposed || runId !== runToken) {
        return;
      }
      status = 'running';
      message = '推理中…';
      draw();

      // top_k 只裁剪返回条数：softmax 始终在全部类别上做，分数本身不变
      const topK = current.topK === 'all' ? null : Number(current.topK) || 1;
      const output = await pipe(current.text, { top_k: topK });
      if (disposed || runId !== runToken) {
        return;
      }

      // 单条字符串输入恒返回扁平数组（按 score 降序）
      const list = (Array.isArray(output) ? output : [output]) as Array<{
        label?: unknown;
        score?: unknown;
      }>;
      results = list
        .filter(
          (item) =>
            typeof item?.label === 'string' && typeof item?.score === 'number',
        )
        .map((item) => ({ label: item.label as string, score: item.score as number }));
      status = 'ready';
      message = `top_k = ${topKText()}；类别数由模型 id2label 决定，超出会被截断`;
      draw();
    } catch (error) {
      if (disposed || runId !== runToken) {
        return;
      }
      status = 'error';
      const detail = error instanceof Error ? error.message : String(error);
      message = `加载或推理失败：${detail}。常见原因：网络受限或无法访问 huggingface.co / cdn.jsdelivr.net；切换任意控件即可重试。`;
      draw();
    }
  }

  function truncate(text: string, maxWidth: number): string {
    if (drawingContext.measureText(text).width <= maxWidth) {
      return text;
    }
    let cut = text;
    while (cut.length > 0 && drawingContext.measureText(`${cut}…`).width > maxWidth) {
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

  const resizeObserver = createResizeObserver(canvas, draw);
  void classify();

  return {
    update(options) {
      const modelChanged = options.model !== current.model;
      current = options;
      if (disposed) {
        return;
      }
      if (modelChanged) {
        // 换模型：重置进度读数；未就绪的模型在 classify 里走下载流程
        downloadProgress = 0;
        lastPercent = -1;
      }
      void classify();
    },
    dispose() {
      disposed = true;
      resizeObserver.disconnect();
      pipes.clear();
      ready.clear();
    },
  };
}
