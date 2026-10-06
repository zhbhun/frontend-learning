/**
 * 范例：zero-shot-classification——candidate_labels 标签设计、hypothesis_template 与 multi_label。
 *
 * - 前置状态：首次运行需下载 Xenova/mobilebert-uncased-mnli 的 q8 权重（约 27 MB），
 *   完成后写入浏览器 Cache；画布滚入视口后才开始加载，避免与本页上方实例同时下载。
 * - 输入：Controls 中的「示例文本」「candidate_labels（逗号分隔）」「hypothesis_template」
 *   「multi_label」。
 * - 操作：等待就绪后编辑标签集合与假设句模板，切换 multi_label 开关。
 * - 预期结果：画布按分数降序画出每个候选标签的分数条；multi_label 关时「分数合计」
 *   恒为 1.0000（候选间互斥归一），开时合计随内容变化（逐标签独立打分）。
 * - 阅读主线：load（滚入视口触发加载）→ classify（按标签构造假设句并推理）→ draw（渲染）。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

// Storybook 工作区未安装 npm 包，这里按官方 README 的 CDN 用法加载浏览器构建；
// npm 项目请改用：import { pipeline } from '@huggingface/transformers'
const TRANSFORMERS_CDN =
  'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0';

// 本课示例模型：MobileBERT 三分类 NLI（entailment / neutral / contradiction），
// q8 权重约 27 MB，比任务默认的 distilbert-mnli（约 67.6 MB）小得多；仅支持英文
const MODEL_ID = 'Xenova/mobilebert-uncased-mnli';
const MODEL_SIZE = '约 27 MB';

export type ZeroShotStatus = 'loading' | 'running' | 'ready' | 'error';

export interface ZeroShotOptions {
  text: string;
  /** Controls 原始值：逗号分隔的候选标签字符串 */
  labels: string;
  template: string;
  multiLabel: boolean;
}

export interface ZeroShotSnapshot {
  status: ZeroShotStatus;
  message: string;
  text: string;
  labelCount: number;
  template: string;
  multiLabel: boolean;
  sum: number | null;
  loadSeconds: string | null;
}

export interface ZeroShotInstance {
  update(options: ZeroShotOptions): void;
  dispose(): void;
}

/** zero-shot 推理函数的最小形态：第二参携带候选标签与选项 */
type ZeroShotPipe = (
  text: string,
  options: {
    candidate_labels: string[];
    hypothesis_template: string;
    multi_label: boolean;
  },
) => Promise<unknown>;

interface LabelScore {
  label: string;
  score: number;
}

/** Controls 的逗号分隔字符串 → 标签数组：去空格、去空项 */
export function parseLabels(raw: string): string[] {
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export function createZeroShotClassification(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ZeroShotSnapshot) => void,
): ZeroShotInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: ZeroShotOptions = {
    text: 'I have a problem with my iPhone that needs to be resolved asap.',
    labels: 'urgent, not urgent, phone, tablet, computer',
    template: 'This example is {}.',
    multiLabel: false,
  };
  let status: ZeroShotStatus = 'loading';
  let message = '滚动到本实例后开始加载模型…';
  let downloadProgress = 0;
  let lastPercent = -1;
  let results: LabelScore[] | null = null;
  let pipe: ZeroShotPipe | null = null;
  let loading = false;
  let disposed = false;
  let runToken = 0;
  let debounceTimer = 0;
  let loadSeconds: string | null = null;

  function snapshot(): ZeroShotSnapshot {
    const labels = parseLabels(current.labels);
    const sum = results
      ? results.reduce((total, item) => total + item.score, 0)
      : null;
    return {
      status,
      message,
      text: current.text,
      labelCount: labels.length,
      template: current.template,
      multiLabel: current.multiLabel,
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
    const labels = parseLabels(current.labels);

    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 18px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      'zero-shot-classification：候选标签 → 假设句 → P(entailment)',
      48,
      52,
    );

    drawingContext.fillStyle = '#475569';
    drawingContext.font = '14px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText(`前提：${truncate(current.text, contentWidth)}`, 48, 84);

    drawingContext.fillStyle = '#64748b';
    drawingContext.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText(
      `假设句模板：${truncate(current.template, contentWidth)}`,
      48,
      108,
    );
    drawingContext.fillText(
      `${labels.length} 个标签 → ${labels.length} 次句对前向　multi_label：${current.multiLabel ? '开' : '关'}`,
      48,
      130,
    );

    if (status === 'loading') {
      drawingContext.fillStyle = '#e2e8f0';
      drawingContext.fillRect(48, 154, contentWidth, 16);
      drawingContext.fillStyle = '#4f7cff';
      drawingContext.fillRect(
        48,
        154,
        (contentWidth * Math.min(100, downloadProgress)) / 100,
        16,
      );
      drawingContext.fillStyle = '#475569';
      drawingContext.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
      wrapText(message, contentWidth).forEach((line, index) => {
        drawingContext.fillText(line, 48, 194 + index * 20);
      });
      return;
    }

    if (status === 'error') {
      drawingContext.fillStyle = '#b91c1c';
      drawingContext.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
      wrapText(message, contentWidth).forEach((line, index) => {
        drawingContext.fillText(line, 48, 168 + index * 20);
      });
      return;
    }

    if (results === null || results.length === 0) {
      drawingContext.fillStyle = '#475569';
      drawingContext.font = '14px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText(message, 48, 178);
      return;
    }

    // 输出 { sequence, labels, scores }：labels 与 scores 一一对应，已按分数降序
    const trackX = 205;
    const trackWidth = Math.max(60, width - trackX - 76);
    results.slice(0, 8).forEach((item, index) => {
      const top = 152 + index * 28;
      // 排名上色：第 1 名蓝色，其余灰色——标签语义任意，不预设颜色
      const color = index === 0 ? '#4f7cff' : '#94a3b8';

      drawingContext.fillStyle = color;
      drawingContext.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
      drawingContext.fillText(truncate(item.label, 140), 48, top + 12);

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

    // multi_label 关：候选间互斥归一，合计恒为 1.0000；开：逐标签独立，合计任意
    const shownRows = Math.min(8, results.length);
    const sum = results.reduce((total, item) => total + item.score, 0);
    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 14px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText(
      `分数合计：${sum.toFixed(4)}${current.multiLabel ? '（逐标签独立）' : '（互斥归一）'}`,
      48,
      152 + shownRows * 28 + 24,
    );
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
      pipe = (await mod.pipeline('zero-shot-classification', MODEL_ID, {
        // dtype / device 不传，按环境默认——浏览器 WASM 下即 q8 档位
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
              message = `正在下载 NLI 模型（${MODEL_SIZE}，仅首次）：${percent}%`;
              draw();
            }
          }
        },
      })) as ZeroShotPipe;
      if (disposed) {
        return;
      }
      status = 'ready';
      loadSeconds = ((performance.now() - startedAt) / 1000).toFixed(1);
      message = `模型就绪，用时 ${loadSeconds} 秒；刷新页面将命中浏览器缓存`;
      draw();
      void classify();
    } catch (error) {
      if (disposed) {
        return;
      }
      status = 'error';
      const detail = error instanceof Error ? error.message : String(error);
      message = `模型加载失败：${detail}。常见原因：网络受限或无法访问 huggingface.co / cdn.jsdelivr.net；编辑任意控件即可重试。`;
      draw();
    } finally {
      loading = false;
    }
  }

  async function classify() {
    if (!pipe || disposed) {
      return;
    }
    const labels = parseLabels(current.labels);
    if (labels.length === 0) {
      // 空标签集没有可打的分：给出可执行的修正提示而不是报错
      results = null;
      status = 'ready';
      message = '请至少输入一个候选标签（逗号分隔）';
      draw();
      return;
    }
    const runId = ++runToken;
    status = 'running';
    message = `推理中：${labels.length} 个标签各做一次句对前向…`;
    draw();
    try {
      const output = (await pipe(current.text, {
        candidate_labels: labels,
        hypothesis_template: current.template,
        multi_label: current.multiLabel,
      })) as { labels?: unknown; scores?: unknown };
      if (disposed || runId !== runToken) {
        return;
      }
      const names = (Array.isArray(output?.labels) ? output.labels : []) as unknown[];
      const scores = (Array.isArray(output?.scores) ? output.scores : []) as unknown[];
      results = names
        .map((label, index) => ({ label: String(label), score: Number(scores[index]) }))
        .filter((item) => Number.isFinite(item.score));
      status = 'ready';
      message = current.multiLabel
        ? 'multi_label 开：每个标签独立打分，多个标签可以同时高分'
        : 'multi_label 关：分数在候选间互斥归一，合计为 1';
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
  draw(); // 先画一帧加载提示，避免画布空白

  // 长驻下载延迟到画布滚入视口：避免与本页上方实例同时下载两个模型
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

  /** 控件变化后的统一入口：去抖后再重新推理（文本框控件会逐键触发更新） */
  function scheduleRefresh() {
    window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => {
      if (pipe) {
        void classify();
      } else if (status === 'error' && !loading) {
        void load(); // 加载失败后，编辑控件给一次重试机会
      } else {
        draw();
      }
    }, 250);
  }

  return {
    update(options) {
      current = options;
      if (disposed) {
        return;
      }
      scheduleRefresh();
    },
    dispose() {
      disposed = true;
      window.clearTimeout(debounceTimer);
      visibility?.disconnect();
      resizeObserver.disconnect();
      pipe = null;
    },
  };
}
