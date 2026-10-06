/**
 * 范例：情感分类的最小闭环——加载 pipeline、推理、读取 [{ label, score }] 输出。
 *
 * - 前置状态：首次运行需从 Hugging Face Hub 下载 q8 量化模型（约 68 MB），
 *   完成后写入浏览器 Cache；再次加载显著变快。
 * - 输入：Controls 中的「示例文本」（三句中英文预置值）。
 * - 操作：等待「状态」读数从 加载中 变为 就绪，再切换示例文本触发推理。
 * - 预期结果：读数给出 label（POSITIVE / NEGATIVE）与 score（0~1 置信度），
 *   画布同步显示下载进度、推理结果或可读的错误信息。
 * - 阅读主线：loadPipeline（加载与 progress_callback）→ classify（推理）→ draw（状态渲染与读数输出）。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

// Storybook 工作区未安装 npm 包，这里按官方 README 的 CDN 用法加载浏览器构建；
// npm 项目请改用：import { pipeline } from '@huggingface/transformers'
const TRANSFORMERS_CDN =
  'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0';

// 本课示例模型：DistilBERT 情感分类（POSITIVE / NEGATIVE），q8 权重约 67.6 MB
const MODEL_ID = 'Xenova/distilbert-base-uncased-finetuned-sst-2-english';

export type PipelineStatus = 'loading' | 'running' | 'ready' | 'error';

export interface SentimentPipelineOptions {
  text: string;
}

export interface SentimentPipelineSnapshot {
  status: PipelineStatus;
  message: string;
  text: string;
  label: string | null;
  score: number | null;
}

export interface SentimentPipelineInstance {
  update(options: SentimentPipelineOptions): void;
  dispose(): void;
}

/** pipeline 推理函数的最小形态：传一句话，Promise 返回未深究的输出结构 */
type SentimentPipe = (text: string) => Promise<unknown>;

export function createSentimentPipeline(
  canvas: HTMLCanvasElement,
  emit: (snapshot: SentimentPipelineSnapshot) => void,
): SentimentPipelineInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let currentText = 'I love transformers!';
  let status: PipelineStatus = 'loading';
  let message = '首次运行：正在从 CDN 加载库与模型…';
  let downloadProgress = 0;
  let lastPercent = -1;
  let label: string | null = null;
  let score: number | null = null;
  let pipe: SentimentPipe | null = null;
  let loading = false;
  let disposed = false;
  let runToken = 0;
  let loadSeconds: string | null = null;

  function snapshot(): SentimentPipelineSnapshot {
    return { status, message, text: currentText, label, score };
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
      'sentiment-analysis：一句话 → [{ label, score }]',
      48,
      58,
    );

    drawingContext.fillStyle = '#475569';
    drawingContext.font = '14px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText(`输入：${truncate(currentText, contentWidth)}`, 48, 96);

    if (status === 'loading') {
      // 首次运行的主要等待就是这段下载；不传 progress_callback 时它是完全静默的
      drawingContext.fillStyle = '#e2e8f0';
      drawingContext.fillRect(48, 128, contentWidth, 18);
      drawingContext.fillStyle = '#4f7cff';
      drawingContext.fillRect(
        48,
        128,
        (contentWidth * Math.min(100, downloadProgress)) / 100,
        18,
      );
      drawingContext.fillStyle = '#475569';
      drawingContext.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
      wrapText(message, contentWidth).forEach((line, index) => {
        drawingContext.fillText(line, 48, 178 + index * 20);
      });
      return;
    }

    if (status === 'error') {
      drawingContext.fillStyle = '#b91c1c';
      drawingContext.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
      wrapText(message, contentWidth).forEach((line, index) => {
        drawingContext.fillText(line, 48, 136 + index * 20);
      });
      return;
    }

    if (label === null) {
      // running 且还没有结果
      drawingContext.fillStyle = '#475569';
      drawingContext.font = '14px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText(message, 48, 150);
      return;
    }

    // 输出 [{ label, score }]：label 是类别名，score 是 0~1 的置信度
    const resultColor = label === 'NEGATIVE' ? '#b91c1c' : '#15803d';
    drawingContext.fillStyle = resultColor;
    drawingContext.font = '600 24px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText(`label: ${label}`, 48, 152);

    const shownScore = score ?? 0;
    drawingContext.fillStyle = '#e2e8f0';
    drawingContext.fillRect(48, 172, contentWidth, 18);
    drawingContext.fillStyle = resultColor;
    drawingContext.fillRect(48, 172, contentWidth * shownScore, 18);

    drawingContext.fillStyle = '#475569';
    drawingContext.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText(`score: ${shownScore.toFixed(4)}`, 48, 214);
    wrapText(message, contentWidth).forEach((line, index) => {
      drawingContext.fillText(line, 48, 246 + index * 20);
    });
  }

  async function loadPipeline() {
    if (pipe || loading || disposed) {
      return;
    }
    loading = true;
    try {
      const startedAt = performance.now();
      // @vite-ignore 让 Vite 跳过对这条 URL 的构建期分析，交给浏览器在运行时加载
      const mod = await import(/* @vite-ignore */ TRANSFORMERS_CDN);
      const { pipeline } = mod;

      // 实例只创建一次：任务名 + 模型 ID + options（这里只接进度事件，
      // dtype/device 不传，按环境默认——浏览器 WASM 下即 q8 档位）
      pipe = await pipeline('sentiment-analysis', MODEL_ID, {
        progress_callback: (info: {
          status: string;
          progress?: number;
        }) => {
          if (disposed) {
            return;
          }
          // 事件流：initiate → download → progress（单文件）→ done；
          // v4 另有聚合所有文件的 progress_total；全部就绪后触发一次 ready
          if (info.status === 'progress' || info.status === 'progress_total') {
            const percent = Math.round(info.progress ?? 0);
            if (percent !== lastPercent) {
              lastPercent = percent;
              downloadProgress = percent;
              message = `正在下载模型（q8 约 68 MB，仅首次）：${percent}%`;
              draw();
            }
          }
        },
      });
      if (disposed) {
        return;
      }
      status = 'ready';
      loadSeconds = ((performance.now() - startedAt) / 1000).toFixed(1);
      message = `模型就绪，用时 ${loadSeconds} 秒；刷新页面将命中浏览器缓存，加载显著变快`;
      draw();
      void classify();
    } catch (error) {
      if (disposed) {
        return;
      }
      status = 'error';
      const detail = error instanceof Error ? error.message : String(error);
      message = `模型加载失败：${detail}。常见原因：网络受限或无法访问 huggingface.co / cdn.jsdelivr.net；恢复网络后切换「示例文本」即可重试。`;
      draw();
    } finally {
      loading = false;
    }
  }

  async function classify() {
    if (!pipe || disposed) {
      return;
    }
    const runId = ++runToken;
    status = 'running';
    message = '推理中…';
    draw();
    try {
      const output = await pipe(currentText);
      if (disposed || runId !== runToken) {
        return;
      }
      // 输出是 [{ label, score }] 数组；top_k 默认 1，这里取分数最高的一个
      const results = (Array.isArray(output) ? output : [output]) as Array<{
        label?: unknown;
        score?: unknown;
      }>;
      const best = results[0] ?? {};
      label = typeof best.label === 'string' ? best.label : '未知';
      score = typeof best.score === 'number' ? best.score : 0;
      status = 'ready';
      message = `推理完成；切换「示例文本」可再次推理（本次模型加载用时 ${loadSeconds ?? '—'} 秒）`;
      draw();
    } catch (error) {
      if (disposed || runId !== runToken) {
        return;
      }
      status = 'error';
      const detail = error instanceof Error ? error.message : String(error);
      message = `推理失败：${detail}`;
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
  void loadPipeline();

  return {
    update(options) {
      const textChanged = options.text !== currentText;
      currentText = options.text;
      if (disposed) {
        return;
      }
      if (pipe) {
        // 换文本只触发推理，不重建实例
        if (textChanged) {
          void classify();
        } else {
          draw();
        }
      } else if (status === 'error' && textChanged && !loading) {
        // 加载失败后，换文本给一次重试机会
        void loadPipeline();
      } else {
        draw();
      }
    },
    dispose() {
      disposed = true;
      resizeObserver.disconnect();
      pipe = null;
    },
  };
}
