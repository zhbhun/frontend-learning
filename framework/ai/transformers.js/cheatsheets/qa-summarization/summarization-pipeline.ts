/**
 * 范例：生成式摘要的最小闭环——一段文章进，模型生成的摘要文本出。
 *
 * - 前置状态：首次运行需从 Hugging Face Hub 下载 t5-small 的 q8 权重（encoder + decoder
 *   合计约 75 MB），完成后写入浏览器 Cache；画布滚入视口后才开始加载，
 *   避免与本页上方问答实例同时下载。
 * - 输入：Controls 中的「示例文章」（两篇英文短文预置）与「max_new_tokens」（32~128）。
 * - 操作：等待「状态」变为 就绪；切换文章或调整 max_new_tokens 后自动重新生成
 *   （约 0.3 秒去抖；生成进行中调整则在完成后按最新参数补跑一次）。
 * - 预期结果：画布画出摘要文本与输入/输出词数；调大 max_new_tokens，
 *   「摘要词数」上限与「生成用时」随之增长。调用代码里没有 summarize: 字样——
 *   t5-small 的 config 前缀由管线自动拼接（正文「任务前缀」一节）。
 * - 阅读主线：load（滚入视口触发加载）→ run（文本 + max_new_tokens 推理）→ draw（渲染）。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

// Storybook 工作区未安装 npm 包，这里按官方 README 的 CDN 用法加载浏览器构建；
// npm 项目请改用：import { pipeline } from '@huggingface/transformers'
const TRANSFORMERS_CDN =
  'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0';

// 本课示例模型：t5-small（Seq2Seq，任务默认翻译模型，也可做摘要），
// q8 权重 encoder 34.0 MB + decoder 约 40.5 MB，合计约 75 MB；
// 任务默认的摘要模型 distilbart-cnn-6-6 q8 合计约 271 MB，浏览器示例偏重
const MODEL_ID = 'Xenova/t5-small';
const MODEL_SIZE = '约 75 MB';

// 控件变化后的重新生成去抖；生成进行中到达的调整在完成后补跑一次
const RERUN_DEBOUNCE_MS = 300;

export type SummarizationStatus = 'loading' | 'ready' | 'generating' | 'error';

export interface SummarizationOptions {
  article: string;
  maxNewTokens: number;
}

export interface SummarizationSnapshot {
  status: SummarizationStatus;
  message: string;
  article: string;
  maxNewTokens: number;
  summary: string | null;
  outputWords: number | null;
  seconds: string | null;
}

export interface SummarizationInstance {
  update(options: SummarizationOptions): void;
  dispose(): void;
}

/** summarization 推理的最小形态：一段文本 + 生成长度，返回 [{ summary_text }] */
type SummarizePipe = (
  text: string,
  options: { max_new_tokens: number },
) => Promise<Array<{ summary_text?: unknown }>>;

export function createSummarizationPipeline(
  canvas: HTMLCanvasElement,
  emit: (snapshot: SummarizationSnapshot) => void,
): SummarizationInstance {
  const context2d = canvas.getContext('2d');
  if (!context2d) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context2d;

  let current: SummarizationOptions;
  let status: SummarizationStatus = 'loading';
  let message = '滚动到本实例后开始加载模型…';
  let downloadProgress = 0;
  let lastPercent = -1;
  let summary: string | null = null;
  let seconds: string | null = null;
  let pipe: SummarizePipe | null = null;
  let loading = false;
  let running = false;
  let disposed = false;
  let runToken = 0;
  let rerunTimer: number | null = null;
  let staleParams = false;
  let loadSeconds: string | null = null;

  const DEFAULT_OPTIONS: SummarizationOptions = {
    article:
      'Caching is one of the core techniques for making web applications feel fast. ' +
      'The browser stores copies of static files such as images, stylesheets, and ' +
      'scripts, so repeat visits can skip the network entirely. Service workers push ' +
      'this idea further by letting a web application manage its own cache and keep ' +
      'working offline. A good caching strategy balances freshness against speed: ' +
      'files that rarely change can live in the cache for months, while dynamic ' +
      'responses must be revalidated much more often.',
    maxNewTokens: 64,
  };
  current = { ...DEFAULT_OPTIONS };

  function countWords(text: string): number {
    return text.trim().split(/\s+/).filter(Boolean).length;
  }

  function snapshot(): SummarizationSnapshot {
    return {
      status,
      message,
      article: current.article,
      maxNewTokens: current.maxNewTokens,
      summary,
      outputWords: summary === null ? null : countWords(summary),
      seconds,
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
    drawingContext.fillText('summarization：文章 → [{ summary_text }]', 48, 40);

    drawingContext.fillStyle = '#64748b';
    drawingContext.font = mono13;
    drawingContext.fillText(
      `模型 ${MODEL_ID} · config 前缀 summarize: 由管线自动拼接 · max_new_tokens ${current.maxNewTokens}`,
      48,
      66,
    );
    drawingContext.fillStyle = '#475569';
    drawingContext.fillText(
      `输入 ${countWords(current.article)} 词（超 512 token 截断丢尾）`,
      48,
      88,
    );

    if (status === 'loading') {
      drawingContext.fillStyle = '#e2e8f0';
      drawingContext.fillRect(48, 112, contentWidth, 14);
      drawingContext.fillStyle = '#4f7cff';
      drawingContext.fillRect(
        48,
        112,
        (contentWidth * Math.min(100, downloadProgress)) / 100,
        14,
      );
      drawingContext.fillStyle = '#475569';
      drawingContext.font = mono13;
      wrapText(message, contentWidth).forEach((line, index) => {
        drawingContext.fillText(line, 48, 146 + index * 18);
      });
      return;
    }

    if (status === 'error') {
      drawingContext.fillStyle = '#b91c1c';
      drawingContext.font = mono13;
      wrapText(message, contentWidth).forEach((line, index) => {
        drawingContext.fillText(line, 48, 124 + index * 18);
      });
      return;
    }

    if (summary === null) {
      drawingContext.fillStyle = '#475569';
      drawingContext.font = '14px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText(message, 48, 140);
      return;
    }

    // 生成式输出：summary_text 是模型逐 token 写出的新文本，不是原文子串
    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 14px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText('summary_text：', 48, 116);

    drawingContext.font = '14px ui-monospace, SFMono-Regular, Menlo, monospace';
    const maxLines = Math.max(1, Math.floor((height - 170 - 48) / 22));
    const lines = wrapText(summary, contentWidth);
    const shown =
      lines.length > maxLines
        ? lines
            .slice(0, maxLines)
            .map((line, index) =>
              index === maxLines - 1 ? `${line} …` : line,
            )
        : lines;
    shown.forEach((line, index) => {
      drawingContext.fillText(line, 48, 140 + index * 22);
    });

    const afterY = 140 + shown.length * 22 + 10;
    drawingContext.fillStyle = '#475569';
    drawingContext.font = mono13;
    drawingContext.fillText(
      `输出 ${countWords(summary)} 词${seconds ? ` · 生成用时 ${seconds} 秒` : ''}`,
      48,
      afterY,
    );
    wrapText(message, contentWidth)
      .slice(0, 2)
      .forEach((line, index) => {
        drawingContext.fillText(line, 48, afterY + 20 + index * 18);
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
      pipe = (await mod.pipeline('summarization', MODEL_ID, {
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
              message = `正在下载 t5-small（${MODEL_SIZE}，仅首次）：${percent}%`;
              draw();
            }
          }
        },
      })) as SummarizePipe;
      if (disposed) {
        return;
      }
      status = 'ready';
      loadSeconds = ((performance.now() - startedAt) / 1000).toFixed(1);
      message = `模型就绪，用时 ${loadSeconds} 秒；刷新页面将命中浏览器缓存`;
      draw();
      void run();
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

  async function run() {
    if (!pipe || running || disposed) {
      return;
    }
    const runId = ++runToken;
    // 记录本轮使用的参数快照；生成期间到达的调整通过 staleParams 在结束后补跑
    const runParams = { ...current };
    if (rerunTimer !== null) {
      window.clearTimeout(rerunTimer);
      rerunTimer = null;
      staleParams = true;
    }
    running = true;
    status = 'generating';
    message = '生成中…';
    draw();
    const startedAt = performance.now();
    try {
      // 生成参数从第二个参数透传给 model.generate()；
      // 管线默认补 max_new_tokens: 256，这里显式给值覆盖
      const result = await pipe(runParams.article, {
        max_new_tokens: runParams.maxNewTokens,
      });
      const elapsed = ((performance.now() - startedAt) / 1000).toFixed(1);
      if (disposed || runId !== runToken) {
        return;
      }
      // 输出恒为 [{ summary_text }]（单条输入也包一层数组）
      const first = Array.isArray(result) ? result[0] : result;
      summary =
        typeof first?.summary_text === 'string' ? first.summary_text : '';
      seconds = elapsed;
      status = 'ready';
      message = '生成完成；切换「示例文章」或调整「max_new_tokens」可再次生成';
      draw();
    } catch (error) {
      if (disposed || runId !== runToken) {
        return;
      }
      status = 'error';
      const detail = error instanceof Error ? error.message : String(error);
      message = `生成失败：${detail}`;
      draw();
    } finally {
      running = false;
      if (!disposed && staleParams) {
        staleParams = false;
        rerunTimer = window.setTimeout(() => {
          rerunTimer = null;
          void run();
        }, 50);
      }
    }
  }

  function scheduleRun() {
    if (running) {
      // 生成进行中：只标记待补跑，本轮结束后按最新参数执行
      staleParams = true;
      return;
    }
    if (rerunTimer !== null) {
      window.clearTimeout(rerunTimer);
    }
    rerunTimer = window.setTimeout(() => {
      rerunTimer = null;
      if (pipe) {
        void run();
      } else if (status === 'error' && !loading) {
        void load(); // 加载失败后，调整控件给一次重试机会
      }
    }, RERUN_DEBOUNCE_MS);
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
  draw(); // 先画一帧加载提示，避免画布空白

  // 长驻下载延迟到画布滚入视口：避免与本页上方问答实例同时下载两个模型
  let visibility: IntersectionObserver | null = null;
  if (typeof IntersectionObserver === 'undefined') {
    void load();
  } else {
    visibility = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          visibility?.disconnect();
          void load();
        }
      },
      { rootMargin: '200px 0px' },
    );
    visibility.observe(canvas);
  }

  return {
    update(options) {
      const changed =
        options.article !== current.article ||
        options.maxNewTokens !== current.maxNewTokens;
      current = { ...current, ...options };
      if (disposed) {
        return;
      }
      draw(); // 参数回显立即更新
      if (changed) {
        scheduleRun();
      }
    },
    dispose() {
      disposed = true;
      if (rerunTimer !== null) {
        window.clearTimeout(rerunTimer);
        rerunTimer = null;
      }
      visibility?.disconnect();
      resizeObserver.disconnect();
      pipe = null;
    },
  };
}
