/**
 * 范例：单句推理基准——首推理（冷启动）与热身推理分开计时，热身后取中位数。
 *
 * - 前置状态：首次运行需从 Hugging Face Hub 下载 q8 量化模型（约 67.6 MB，与
 *   1.2 / 3.1.1 / 4.1 课同一份文件，打开过即命中浏览器缓存）；会话在 pipeline()
 *   返回前建好，因此计时只含推理本身。
 * - 输入：Controls 的「推理次数」（每轮对同一句执行的计时次数）。
 * - 操作：模型就绪后自动跑第一轮——第 1 次是冷启动（含一次性的运行时预热），
 *   单独高亮且不进统计；调整「推理次数」再跑新一轮（全部为热身推理）。
 * - 预期结果：首轮第 1 条条形（琥珀色）显著长于其余各条；「本轮中位数」「本轮
 *   最快」只统计热身推理；新一轮条形里不再出现冷启动尖峰——预热只在页面会话
 *   里发生一次。
 * - 阅读主线：load（加载与 progress_callback）→ runRound（performance.now 计时
 *   → 中位数 / 最小值统计）→ draw（条形与中位数虚线渲染）。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

// Storybook 工作区未安装 npm 包，这里按官方 README 的 CDN 用法加载浏览器构建；
// npm 项目请改用：import { pipeline } from '@huggingface/transformers'
const TRANSFORMERS_CDN =
  'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0';

// 本课示例模型：与 1.2 / 3.1.1 / 4.1 课相同的情感分类模型（q8 约 67.6 MB）
const MODEL_ID = 'Xenova/distilbert-base-uncased-finetuned-sst-2-english';

// 固定的基准输入：同一句文本贯穿整轮，控制变量（输入长度影响耗时）
const BENCH_INPUT = 'This movie was surprisingly good, I enjoyed every minute.';

// 连续调整「推理次数」时合并为一轮；基准进行中到达的调整在结束后补跑一轮
const RERUN_DEBOUNCE_MS = 400;

export type BenchStatus = 'loading' | 'ready' | 'benchmarking' | 'error';

export interface BenchRun {
  /** 第几次推理（1 起） */
  index: number;
  /** performance.now 计得的耗时（毫秒） */
  ms: number;
  /** 是否为本页面会话的首次推理（冷启动，不进统计） */
  cold: boolean;
}

export interface BenchSnapshot {
  status: BenchStatus;
  message: string;
  input: string;
  /** 当前这轮的逐次耗时（画布条形的数据源） */
  runs: BenchRun[];
  /** 页面会话首次推理的耗时（冷启动参考值，只记一次） */
  firstColdMs: number | null;
  /** 本轮热身推理的中位数 */
  medianMs: number | null;
  /** 本轮热身推理的最小值 */
  minMs: number | null;
  label: string | null;
  score: number | null;
  /** 已完成的轮数（第 1 轮含冷启动，之后各轮全为热身） */
  round: number;
}

export interface BenchOptions {
  runs: number;
}

export interface BenchInstance {
  update(options: BenchOptions): void;
  dispose(): void;
}

/** text-classification pipeline 的最小形态：句子 → [{ label, score }] */
type ClassifierFn = (
  text: string,
) => Promise<Array<{ label: string; score: number }>>;

/** 中位数：偶数个样本取中间两数的平均 */
export function median(values: number[]): number {
  if (values.length === 0) {
    throw new Error('median() 需要至少一个样本。');
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function createInferenceBenchmark(
  canvas: HTMLCanvasElement,
  emit: (snapshot: BenchSnapshot) => void,
): BenchInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: BenchOptions = { runs: 6 };
  let status: BenchStatus = 'loading';
  let message = '首次运行：正在从 CDN 加载库与模型…';
  let downloadProgress = 0;
  let lastPercent = -1;
  let runs: BenchRun[] = [];
  let firstColdMs: number | null = null;
  let medianMs: number | null = null;
  let minMs: number | null = null;
  let label: string | null = null;
  let score: number | null = null;
  let round = 0;
  let classify: ClassifierFn | null = null;
  let loading = false;
  let running = false;
  let disposed = false;
  let runToken = 0;
  let firstInferenceDone = false;
  let rerunTimer: number | null = null;
  let staleRuns = false;

  function snapshot(): BenchSnapshot {
    return {
      status,
      message,
      input: BENCH_INPUT,
      runs: [...runs],
      firstColdMs,
      medianMs,
      minMs,
      label,
      score,
      round,
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

    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 18px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('同一句 · 逐次推理计时', 48, 42);
    drawingContext.textAlign = 'right';
    drawingContext.fillStyle = '#64748b';
    drawingContext.font = '11px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('performance.now() 实测', width - 48, 42);
    drawingContext.textAlign = 'left';

    drawingContext.fillStyle = '#475569';
    drawingContext.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText(`输入：${truncate(BENCH_INPUT, contentWidth)}`, 48, 70);

    if (status === 'loading') {
      // 首次运行的主要等待就是这段下载；模型缓存命中时几乎瞬间走完
      drawingContext.fillStyle = '#e2e8f0';
      drawingContext.fillRect(48, 92, contentWidth, 16);
      drawingContext.fillStyle = '#4f7cff';
      drawingContext.fillRect(
        48,
        92,
        (contentWidth * Math.min(100, downloadProgress)) / 100,
        16,
      );
      drawingContext.fillStyle = '#475569';
      drawingContext.font = '13px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText(truncate(message, contentWidth), 48, 134);
      return;
    }

    if (status === 'error') {
      drawingContext.fillStyle = '#b91c1c';
      drawingContext.font = '13px ui-sans-serif, system-ui, sans-serif';
      wrapText(message, contentWidth).forEach((line, index) => {
        drawingContext.fillText(line, 48, 110 + index * 20);
      });
      return;
    }

    // 逐次耗时条形：琥珀色为冷启动（不进统计），蓝色为热身推理。
    // 行距按可用高度收缩；底部预留 readout 面板的高度
    const barTop = 92;
    const barGap = Math.max(
      17,
      Math.min(26, (height - barTop - 150) / Math.max(1, runs.length)),
    );
    const maxMs = Math.max(...runs.map((run) => run.ms), 1);
    const trackWidth = contentWidth - 150;
    runs.forEach((run, position) => {
      const y = barTop + position * barGap;
      const barWidth = Math.max(2, (run.ms / maxMs) * trackWidth);
      drawingContext.fillStyle = run.cold ? '#d97706' : '#4f7cff';
      drawingContext.fillRect(48, y, barWidth, 13);

      drawingContext.fillStyle = run.cold ? '#b45309' : '#334155';
      drawingContext.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
      const suffix = run.cold ? '（冷启动）' : '';
      drawingContext.fillText(
        `第 ${run.index} 次  ${run.ms.toFixed(1)} ms${suffix}`,
        48 + trackWidth + 8,
        y + 11,
      );
    });

    // 中位数虚线：横跨条形区，直观对照读数
    if (medianMs != null && runs.length > 1) {
      const x = 48 + (medianMs / maxMs) * trackWidth;
      drawingContext.save();
      drawingContext.strokeStyle = '#172033';
      drawingContext.setLineDash([4, 4]);
      drawingContext.beginPath();
      drawingContext.moveTo(x, barTop - 6);
      drawingContext.lineTo(x, barTop + runs.length * barGap - 6);
      drawingContext.stroke();
      drawingContext.restore();
    }

    // 状态消息贴在条形区下方、readout 面板上方
    drawingContext.fillStyle = '#475569';
    drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
    const messageY = Math.min(
      barTop + runs.length * barGap + 22,
      height - 10,
    );
    drawingContext.fillText(truncate(message, contentWidth), 48, messageY);
  }

  /** 一轮基准：对同一句连续计时 N 次；第 1 轮的第 1 次是冷启动 */
  async function runRound() {
    if (!classify || running || disposed) {
      return;
    }
    const token = ++runToken;
    const count = current.runs;
    running = true;
    status = 'benchmarking';
    round += 1;
    runs = [];
    medianMs = null;
    minMs = null;
    message = `第 ${round} 轮：对同一句连续推理 ${count} 次…`;
    draw();

    const roundRuns: BenchRun[] = [];
    try {
      for (let index = 1; index <= count; index += 1) {
        const cold = !firstInferenceDone;
        const startedAt = performance.now();
        const result = await classify(BENCH_INPUT);
        const elapsed = performance.now() - startedAt;
        if (disposed || token !== runToken) {
          return;
        }
        firstInferenceDone = true;
        if (cold && firstColdMs == null) {
          // 冷启动只发生一次：整页会话里记录首推理耗时，供正文对照
          firstColdMs = elapsed;
        }
        label = result[0]?.label ?? null;
        score = result[0]?.score ?? null;
        const run: BenchRun = { index, ms: elapsed, cold };
        roundRuns.push(run);
        runs = [...roundRuns];
        draw(); // 每次推理结束立即上条形，计时过程本身可观察
      }

      // 统计只吃热身推理：冷启动样本被排除在中位数与最小值之外
      const warm = roundRuns.filter((run) => !run.cold).map((run) => run.ms);
      medianMs = median(warm);
      minMs = Math.min(...warm);
      status = 'ready';
      message =
        round === 1
          ? `第 1 轮完成：第 1 次是冷启动（一次性预热），中位数来自其余 ${warm.length} 次热身推理`
          : `第 ${round} 轮完成：本轮没有冷启动尖峰——预热只在页面会话里发生一次`;
      draw();
    } catch (error) {
      if (disposed || token !== runToken) {
        return;
      }
      status = 'error';
      const detail = error instanceof Error ? error.message : String(error);
      message = `推理失败：${detail}`;
      draw();
    } finally {
      running = false;
      if (!disposed && staleRuns) {
        staleRuns = false;
        rerunTimer = window.setTimeout(() => {
          rerunTimer = null;
          void runRound();
        }, 50);
      }
    }
  }

  async function load() {
    if (classify || loading || disposed) {
      return;
    }
    loading = true;
    try {
      // @vite-ignore 让 Vite 跳过对这条 URL 的构建期分析，交给浏览器在运行时加载
      const mod = await import(/* @vite-ignore */ TRANSFORMERS_CDN);
      const { pipeline } = mod;
      classify = (await pipeline('text-classification', MODEL_ID, {
        progress_callback: (info: { status: string; progress?: number }) => {
          if (disposed) {
            return;
          }
          // 事件流：initiate → download → progress（单文件）→ done；
          // v4 另有聚合所有文件的 progress_total
          if (info.status === 'progress' || info.status === 'progress_total') {
            const percent = Math.round(info.progress ?? 0);
            if (percent !== lastPercent) {
              lastPercent = percent;
              downloadProgress = percent;
              message = `正在下载模型（q8 约 67.6 MB，仅首次）：${percent}%`;
              draw();
            }
          }
        },
      })) as ClassifierFn;
      if (disposed) {
        return;
      }
      status = 'ready';
      message = '模型就绪，自动开始第 1 轮基准…';
      draw();
      void runRound();
    } catch (error) {
      if (disposed) {
        return;
      }
      status = 'error';
      const detail = error instanceof Error ? error.message : String(error);
      message = `模型加载失败：${detail}。常见原因：网络受限或无法访问 huggingface.co / cdn.jsdelivr.net；恢复网络后调整「推理次数」即可重试。`;
      draw();
    } finally {
      loading = false;
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

  const resizeObserver = createResizeObserver(canvas, render);
  draw(); // 先画一帧加载状态，避免首个下载事件到来前画布空白
  void load();

  return {
    update(options) {
      const changed = options.runs !== current.runs;
      current = { ...current, ...options };
      if (disposed) {
        return;
      }
      if (!changed) {
        return;
      }
      if (!classify) {
        // 模型未就绪或加载失败：记下次数；加载完成后自动开跑
        if (status === 'error' && !loading) {
          void load();
        }
        return;
      }
      if (running) {
        // 基准进行中：只标记待补跑，本轮结束后按最新次数执行
        staleRuns = true;
        return;
      }
      // 连续调整合并为一轮（去抖）
      if (rerunTimer !== null) {
        window.clearTimeout(rerunTimer);
      }
      rerunTimer = window.setTimeout(() => {
        rerunTimer = null;
        void runRound();
      }, RERUN_DEBOUNCE_MS);
    },
    dispose() {
      disposed = true;
      if (rerunTimer !== null) {
        window.clearTimeout(rerunTimer);
        rerunTimer = null;
      }
      resizeObserver.disconnect();
      classify = null;
    },
  };
}
