/**
 * 范例：抽取式问答的最小闭环——question 与 context 两个输入，答案是 context 里的原文片段。
 *
 * - 前置状态：首次运行需从 Hugging Face Hub 下载 q8 量化模型（约 63 MB），
 *   完成后写入浏览器 Cache；再次加载显著变快。
 * - 输入：Controls 中的「question」（三个预置问题，共用同一段短文）与「top_k」（1 或 3）。
 * - 操作：等待「状态」变为 就绪；切换问题或 top_k 触发重新推理。
 * - 预期结果：画布在原文中高亮最佳答案片段（answer 本身就是原文子串，按字符串定位），
 *   并逐条画出候选的 score 条；top_k=3 时输出从单个对象变为按分数降序的三条候选。
 * - 阅读主线：load（加载与 progress_callback）→ answer（question + context 两参推理）→
 *   draw（原文高亮与答案渲染）。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

// Storybook 工作区未安装 npm 包，这里按官方 README 的 CDN 用法加载浏览器构建；
// npm 项目请改用：import { pipeline } from '@huggingface/transformers'
const TRANSFORMERS_CDN =
  'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0';

// 本课示例模型：DistilBERT 抽取式问答（SQuAD），v4.3.0 任务默认模型，q8 约 62.8 MB
const MODEL_ID = 'Xenova/distilbert-base-cased-distilled-squad';
const MODEL_SIZE = '约 63 MB';

// 预置短文（SQuAD 模型只擅长英文）；三个预置问题的答案都是这段话里的连续片段
const CONTEXT =
  'Transformers.js lets you run transformer models directly in the browser. ' +
  'Models are downloaded from the Hugging Face Hub and cached by the browser, ' +
  'so they are only downloaded once. The library uses ONNX Runtime to execute ' +
  'the models, either on the CPU with WebAssembly or on the GPU with WebGPU.';

export type QaStatus = 'loading' | 'running' | 'ready' | 'error';

export interface QaOptions {
  question: string;
  /** Controls 原始值：'1' 或 '3' */
  topK: string;
}

export interface QaCandidate {
  answer: string;
  score: number;
}

export interface QaSnapshot {
  status: QaStatus;
  message: string;
  question: string;
  topK: string;
  /** 按分数降序；top_k=1 时只有一条 */
  candidates: QaCandidate[] | null;
}

export interface QaInstance {
  update(options: QaOptions): void;
  dispose(): void;
}

/** question-answering 推理的最小形态：question 在前、context 在后 + top_k 选项 */
type QaPipe = (
  question: string,
  context: string,
  options: { top_k: number },
) => Promise<unknown>;

export function createQaPipeline(
  canvas: HTMLCanvasElement,
  emit: (snapshot: QaSnapshot) => void,
): QaInstance {
  const context2d = canvas.getContext('2d');
  if (!context2d) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context2d;

  let current: QaOptions = {
    question: 'Where are the models downloaded from?',
    topK: '1',
  };
  let status: QaStatus = 'loading';
  let message = '首次运行：正在从 CDN 加载库与模型…';
  let downloadProgress = 0;
  let lastPercent = -1;
  let candidates: QaCandidate[] | null = null;
  let pipe: QaPipe | null = null;
  let loading = false;
  let disposed = false;
  let runToken = 0;
  let loadSeconds: string | null = null;

  function snapshot(): QaSnapshot {
    return {
      status,
      message,
      question: current.question,
      topK: current.topK,
      candidates,
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
    const height = Math.max(280, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const contentWidth = width - 96;
    const mono13 = '13px ui-monospace, SFMono-Regular, Menlo, monospace';

    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 16px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      'question-answering：question + context → 答案片段',
      48,
      40,
    );

    drawingContext.fillStyle = '#475569';
    drawingContext.font = mono13;
    drawingContext.fillText(
      `question：${truncate(current.question, contentWidth)}`,
      48,
      66,
    );

    // context 与最佳答案片段的高亮：抽取式问答的 answer 就是原文子串，
    // v4.3.0 输出没有 start/end，这里直接用 indexOf 定位（定位失败则不高亮）
    const best = candidates?.[0] ?? null;
    const answerIndex = best ? CONTEXT.indexOf(best.answer) : -1;
    const contextLines = layoutLines(CONTEXT, contentWidth, 5);
    drawingContext.font = mono13;
    contextLines.forEach((line, index) => {
      const y = 88 + index * 18;
      if (best && answerIndex >= 0) {
        const from = Math.max(answerIndex, line.start);
        const to = Math.min(
          answerIndex + best.answer.length,
          line.start + line.text.length,
        );
        if (from < to) {
          const prefix = line.text.slice(0, from - line.start);
          const span = line.text.slice(from - line.start, to - line.start);
          const x = 48 + drawingContext.measureText(prefix).width;
          drawingContext.fillStyle = 'rgba(79, 124, 255, 0.2)';
          drawingContext.fillRect(
            x - 2,
            y - 12,
            drawingContext.measureText(span).width + 4,
            16,
          );
        }
      }
      drawingContext.fillStyle = '#475569';
      drawingContext.fillText(line.text, 48, y);
    });

    if (status === 'loading') {
      // 首次运行的主要等待就是这段下载；不传 progress_callback 时它是完全静默的
      const barY = 88 + contextLines.length * 18 + 12;
      drawingContext.fillStyle = '#e2e8f0';
      drawingContext.fillRect(48, barY, contentWidth, 14);
      drawingContext.fillStyle = '#4f7cff';
      drawingContext.fillRect(
        48,
        barY,
        (contentWidth * Math.min(100, downloadProgress)) / 100,
        14,
      );
      drawingContext.fillStyle = '#475569';
      drawingContext.font = mono13;
      wrapText(message, contentWidth).forEach((line, index) => {
        drawingContext.fillText(line, 48, barY + 34 + index * 18);
      });
      return;
    }

    if (status === 'error') {
      drawingContext.fillStyle = '#b91c1c';
      drawingContext.font = mono13;
      wrapText(message, contentWidth).forEach((line, index) => {
        drawingContext.fillText(line, 48, 200 + index * 18);
      });
      return;
    }

    if (!candidates || candidates.length === 0) {
      drawingContext.fillStyle = '#475569';
      drawingContext.font = '14px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText(message, 48, 220);
      return;
    }

    // 输出 { answer, score }（top_k>1 时为按分数降序的数组）：逐条画答案与 score 条
    const shownCandidates = candidates.slice(0, 3);
    const barX = Math.round(48 + contentWidth * 0.42);
    const barWidth = Math.max(60, width - barX - 76);
    shownCandidates.forEach((candidate, index) => {
      const y = 88 + contextLines.length * 18 + 34 + index * 26;

      drawingContext.fillStyle = index === 0 ? '#172033' : '#64748b';
      drawingContext.font = `600 13px ui-monospace, SFMono-Regular, Menlo, monospace`;
      drawingContext.fillText(
        truncate(`answer: ${candidate.answer}`, barX - 60),
        48,
        y,
      );

      drawingContext.fillStyle = '#e2e8f0';
      drawingContext.fillRect(barX, y - 11, barWidth, 13);
      drawingContext.fillStyle = index === 0 ? '#4f7cff' : '#94a3b8';
      drawingContext.fillRect(barX, y - 11, barWidth * candidate.score, 13);

      drawingContext.fillStyle = '#475569';
      drawingContext.font = mono13;
      drawingContext.fillText(
        `${(candidate.score * 100).toFixed(2)}%`,
        barX + barWidth + 8,
        y,
      );
    });

    drawingContext.fillStyle = '#64748b';
    drawingContext.font = mono13;
    wrapText(message, contentWidth)
      .slice(0, 2)
      .forEach((line, index) => {
        drawingContext.fillText(
          line,
          48,
          88 +
            contextLines.length * 18 +
            34 +
            shownCandidates.length * 26 +
            14 +
            index * 18,
        );
      });
  }

  async function load() {
    if (pipe || loading || disposed) {
      return;
    }
    loading = true;
    try {
      const startedAt = performance.now();
      // @vite-ignore 让 Vite 跳过对这条 URL 的构建期分析，交给浏览器在运行时加载
      const mod = await import(/* @vite-ignore */ TRANSFORMERS_CDN);

      // 实例只创建一次：任务名 + 模型 ID + options（dtype/device 不传，
      // 按环境默认——浏览器 WASM 下即 q8 档位）
      pipe = (await mod.pipeline('question-answering', MODEL_ID, {
        progress_callback: (info: { status: string; progress?: number }) => {
          if (disposed) {
            return;
          }
          // 事件流：initiate → download → progress（单文件）→ done；全部就绪后 ready
          if (info.status === 'progress' || info.status === 'progress_total') {
            const percent = Math.round(info.progress ?? 0);
            if (percent !== lastPercent) {
              lastPercent = percent;
              downloadProgress = percent;
              message = `正在下载模型（${MODEL_SIZE}，仅首次）：${percent}%`;
              draw();
            }
          }
        },
      })) as QaPipe;
      if (disposed) {
        return;
      }
      status = 'ready';
      loadSeconds = ((performance.now() - startedAt) / 1000).toFixed(1);
      message = `模型就绪，用时 ${loadSeconds} 秒；刷新页面将命中浏览器缓存，加载显著变快`;
      draw();
      void answer();
    } catch (error) {
      if (disposed) {
        return;
      }
      status = 'error';
      const detail = error instanceof Error ? error.message : String(error);
      message = `模型加载失败：${detail}。常见原因：网络受限或无法访问 huggingface.co / cdn.jsdelivr.net；切换任意控件即可重试。`;
      draw();
    } finally {
      loading = false;
    }
  }

  async function answer() {
    if (!pipe || disposed) {
      return;
    }
    const runId = ++runToken;
    status = 'running';
    message = '推理中…';
    draw();
    try {
      // 两个输入参数：question 在前、context 在后；top_k 是管线唯一的推理选项
      const output = await pipe(current.question, CONTEXT, {
        top_k: Number(current.topK),
      });
      if (disposed || runId !== runToken) {
        return;
      }
      // top_k=1 返回单个对象，top_k>1 返回按分数降序的数组；统一收成候选列表
      const raw = Array.isArray(output) ? output : [output];
      candidates = (raw as Array<Record<string, unknown>>)
        .filter((item) => typeof item?.answer === 'string')
        .map((item) => ({
          answer: item.answer as string,
          score: typeof item.score === 'number' ? item.score : 0,
        }));
      status = 'ready';
      message =
        candidates.length > 1
          ? 'top_k>1：候选按 score 降序，重叠片段会同时上榜（span 打分不去重）'
          : '推理完成；切换「question」或「top_k」可再次推理';
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

  /** 按显示宽度折行，同时记录每行在原文中的起始下标，供高亮定位 */
  function layoutLines(
    text: string,
    maxWidth: number,
    maxLines: number,
  ): Array<{ text: string; start: number }> {
    const lines: Array<{ text: string; start: number }> = [];
    let line = '';
    let start = 0;
    for (const char of text) {
      if (line && drawingContext.measureText(line + char).width > maxWidth) {
        lines.push({ text: line, start });
        start += line.length;
        line = char;
        if (lines.length === maxLines) {
          lines[lines.length - 1].text = `${lines[lines.length - 1].text.trimEnd()}…`;
          return lines;
        }
      } else {
        line += char;
      }
    }
    if (line) {
      lines.push({ text: line, start });
    }
    return lines;
  }

  function truncate(text: string, maxWidth: number): string {
    if (drawingContext.measureText(text).width <= maxWidth) {
      return text;
    }
    let cut = text;
    while (
      cut.length > 0 &&
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

  const resizeObserver = createResizeObserver(canvas, draw);
  draw(); // 先画一帧加载状态，避免首个下载事件到来前画布空白
  void load();

  return {
    update(options) {
      const changed =
        options.question !== current.question || options.topK !== current.topK;
      current = { ...current, ...options };
      if (disposed) {
        return;
      }
      if (pipe) {
        // 换问题或 top_k 只触发推理，不重建实例
        if (changed) {
          void answer();
        } else {
          draw();
        }
      } else if (status === 'error' && changed && !loading) {
        // 加载失败后，切换控件给一次重试机会
        void load();
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
