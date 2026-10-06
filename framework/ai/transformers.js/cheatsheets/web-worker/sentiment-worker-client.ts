/**
 * 范例（主线程侧）：创建真实 Web Worker，用消息协议驱动加载与推理，
 * 并与「主线程直跑」对照——这是本课核心判断（推理阻塞所在线程）的可观察证据。
 *
 * - 前置状态：首次运行需从 Hub 下载 q8 模型（约 68 MB）；两种推理位置共用
 *   同源浏览器缓存，先到的那侧下载后另一侧秒级就绪。
 * - 输入：Controls 的「示例文本」与「推理位置」（Web Worker / 主线程）。
 * - 操作：分别在两个位置推理同一句话，观察画布底部帧时间线与「最大帧间隔」读数。
 * - 预期结果：主线程推理期间帧时间线出现空洞（最大帧间隔数百毫秒）；
 *   worker 推理期间主线程保持约 60 fps（最大帧间隔约一帧，17 ms）。
 * - 阅读主线：ensureWorker（new URL 模式）→ classify（两种位置的推理请求）→
 *   recordFrame（帧监视）→ draw（状态渲染与读数输出）。
 */
import { createRenderLoop, readCanvasSize } from '../../assets/canvas-runtime.js';

// Storybook 工作区未安装 npm 包，主线程对照模式与 worker 模式都按官方 README
// 的 CDN 用法加载浏览器构建；npm 项目请改用静态 import
const TRANSFORMERS_CDN =
  'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0';

const MODEL_ID = 'Xenova/distilbert-base-uncased-finetuned-sst-2-english';

/** 帧时间线窗口：画布底部展示最近 8 秒的渲染帧 */
const FRAME_WINDOW_MS = 8000;
/** 帧间隔超过该值（错过 2 帧以上）在时间线上标红 */
const LONG_FRAME_MS = 34;

/* ---------- 消息协议：与 sentiment-worker.ts 保持一致 ----------
   打包项目中可抽成共享类型模块，两边各自 import；类型在编译后不产生运行时代码 */
type WorkerToMain =
  | { type: 'progress'; progress: number }
  | { type: 'ready'; loadSeconds: number }
  | { type: 'result'; id: number; label: string; score: number; elapsedMs: number }
  | { type: 'error'; stage: 'load' | 'classify'; message: string };

export type WorkerTarget = 'worker' | 'main';
export type LoadStatus = 'loading' | 'running' | 'ready' | 'error';

export interface WorkerDemoOptions {
  text: string;
  target: WorkerTarget;
}

export interface WorkerDemoSnapshot {
  status: LoadStatus;
  target: WorkerTarget;
  progress: number;
  label: string | null;
  score: number | null;
  loadSeconds: number | null;
  inferMs: number | null;
  fps: number;
  maxGapMs: number;
}

export interface WorkerDemoInstance {
  update(options: WorkerDemoOptions): void;
  dispose(): void;
}

/** 每个推理位置各自记录加载与最近一次推理的状态 */
interface SideState {
  loading: boolean;
  ready: boolean;
  error: string | null;
  progress: number;
  loadSeconds: number | null;
  running: boolean;
  requestId: number | null;
  label: string | null;
  score: number | null;
  inferMs: number | null;
}

function createSide(): SideState {
  return {
    loading: false,
    ready: false,
    error: null,
    progress: 0,
    loadSeconds: null,
    running: false,
    requestId: null,
    label: null,
    score: null,
    inferMs: null,
  };
}

/** pipeline 推理函数的最小形态（主线程对照模式使用） */
type SentimentPipe = (text: string) => Promise<unknown>;

export function createWorkerDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: WorkerDemoSnapshot) => void,
): WorkerDemoInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: WorkerDemoOptions = { text: 'I love transformers!', target: 'worker' };
  let disposed = false;
  let runToken = 0;

  const sides: Record<WorkerTarget, SideState> = { worker: createSide(), main: createSide() };

  let worker: Worker | null = null;
  let mainPipe: SentimentPipe | null = null;

  /* ---------- 帧监视：主线程是否被推理冻结，用它说话 ---------- */

  let frameTimes: number[] = [];
  let lastFrameAt = 0;
  let fps = 0;
  let measuring = false;
  let maxGapMs = 0;
  // 可见性翻转（离屏暂停、切页）前后夹出的帧间隔不可信，跳过一次统计
  let gapBoundary = true;

  const visibilityObserver = new IntersectionObserver((entries) => {
    gapBoundary = true;
    void entries;
  });
  visibilityObserver.observe(canvas);
  const onVisibilityChange = () => {
    gapBoundary = true;
  };
  document.addEventListener('visibilitychange', onVisibilityChange);

  function recordFrame(): void {
    const now = performance.now();
    const gap = lastFrameAt > 0 ? now - lastFrameAt : 0;
    lastFrameAt = now;

    // 只统计推理窗口内的帧间隔：主线程推理冻结后恢复的第一帧，
    // 其 gap 正是冻结时长；worker 推理期间 gap 保持约一帧
    if (gap > 0 && !gapBoundary && measuring && gap > maxGapMs) {
      maxGapMs = gap;
    }
    gapBoundary = false;
    if (measuring && !sides[current.target].running) {
      measuring = false;
    }

    frameTimes.push(now);
    const windowStart = now - FRAME_WINDOW_MS;
    while (frameTimes.length > 0 && frameTimes[0] < windowStart) {
      frameTimes.shift();
    }
    fps = frameTimes.filter((t) => t >= now - 1000).length;
  }

  /* ---------- worker 侧：创建与消息接收 ---------- */

  function ensureWorker(): Worker {
    if (!worker) {
      // Vite 识别的 worker 模式：dev 直接以 ESM 提供，build 打成独立 chunk。
      // new URL 必须直接写在 new Worker(...) 内，两个参数都必须是字面量。
      worker = new Worker(new URL('./sentiment-worker.ts', import.meta.url), {
        type: 'module',
      });
      worker.addEventListener('message', onWorkerMessage);
      worker.addEventListener('error', onWorkerError);
    }
    return worker;
  }

  function onWorkerMessage(event: MessageEvent): void {
    if (disposed) {
      return;
    }
    const data = event.data as WorkerToMain;
    const side = sides.worker;
    switch (data.type) {
      case 'progress':
        side.progress = data.progress;
        if (current.target === 'worker') draw();
        break;
      case 'ready':
        side.loading = false;
        side.ready = true;
        side.loadSeconds = data.loadSeconds;
        if (current.target === 'worker') classify();
        break;
      case 'result':
        if (data.id !== side.requestId) {
          return; // 过期结果：该侧已有更新的请求
        }
        side.running = false;
        side.label = data.label;
        side.score = data.score;
        side.inferMs = data.elapsedMs;
        if (current.target === 'worker') draw();
        break;
      case 'error':
        if (data.stage === 'load') {
          side.loading = false;
          side.error = data.message;
        } else {
          side.running = false;
          side.error = data.message;
        }
        if (current.target === 'worker') draw();
        break;
    }
  }

  function onWorkerError(event: ErrorEvent): void {
    if (disposed) {
      return;
    }
    // worker 文件加载失败、module worker 不受支持等构造期错误走这里
    sides.worker.loading = false;
    sides.worker.error = event.message || 'Web Worker 启动失败';
    if (current.target === 'worker') draw();
  }

  /* ---------- 主线程对照侧：与兄弟课同款的加载与推理 ---------- */

  async function loadMain(): Promise<void> {
    const side = sides.main;
    if (side.ready || side.loading || disposed) {
      return;
    }
    side.loading = true;
    side.error = null;
    try {
      const startedAt = performance.now();
      const mod = await import(/* @vite-ignore */ TRANSFORMERS_CDN);
      mainPipe = await mod.pipeline('sentiment-analysis', MODEL_ID, {
        progress_callback: (info: { status: string; progress?: number }) => {
          if (info.status === 'progress_total') {
            const percent = Math.round(info.progress ?? 0);
            if (percent !== side.progress) {
              side.progress = percent;
              if (current.target === 'main') draw();
            }
          }
        },
      });
      side.ready = true;
      side.loadSeconds = (performance.now() - startedAt) / 1000;
    } catch (error) {
      side.error = error instanceof Error ? error.message : String(error);
    } finally {
      side.loading = false;
      if (!disposed && current.target === 'main') {
        if (side.ready) {
          classify();
        } else {
          draw();
        }
      }
    }
  }

  /* ---------- 推理请求：同一状态机服务两种位置 ---------- */

  function ensureSide(target: WorkerTarget): void {
    if (target === 'worker') {
      const w = ensureWorker();
      if (!sides.worker.ready && !sides.worker.loading) {
        sides.worker.loading = true;
        sides.worker.error = null;
        w.postMessage({ type: 'load' });
      }
    } else {
      void loadMain();
    }
  }

  /* 最新请求获胜：连点或快速切文本时，旧请求的结果按 id 丢弃 */
  function classify(): void {
    const target = current.target;
    const side = sides[target];
    if (!side.ready || disposed) {
      return;
    }
    const id = ++runToken;
    side.requestId = id;
    side.running = true;
    side.inferMs = null;
    maxGapMs = 0;
    measuring = true;
    draw();
    if (target === 'worker') {
      worker?.postMessage({ type: 'classify', id, text: current.text });
    } else {
      void classifyOnMain(id);
    }
  }

  async function classifyOnMain(id: number): Promise<void> {
    const side = sides.main;
    const startedAt = performance.now();
    try {
      const output = await mainPipe!(current.text);
      if (disposed || id !== side.requestId) {
        return;
      }
      side.running = false;
      side.inferMs = Math.round(performance.now() - startedAt);
      applyResult(side, output);
    } catch (error) {
      if (disposed || id !== side.requestId) {
        return;
      }
      side.running = false;
      side.error = error instanceof Error ? error.message : String(error);
    }
    draw();
  }

  function applyResult(side: SideState, output: unknown): void {
    const results = (Array.isArray(output) ? output : [output]) as Array<{
      label?: unknown;
      score?: unknown;
    }>;
    const best = results[0] ?? {};
    side.label = typeof best.label === 'string' ? best.label : '未知';
    side.score = typeof best.score === 'number' ? best.score : 0;
  }

  function deriveStatus(): LoadStatus {
    const side = sides[current.target];
    if (side.running) {
      return 'running';
    }
    if (side.error) {
      return 'error';
    }
    if (side.ready) {
      return 'ready';
    }
    return 'loading';
  }

  function statusMessage(): string {
    const side = sides[current.target];
    const where = current.target === 'worker' ? 'worker 线程' : '主线程';
    if (side.error) {
      return `失败（${where}）：${side.error}`;
    }
    if (side.running) {
      return current.target === 'worker'
        ? '推理中（worker 线程）——帧时间线应保持均匀'
        : '推理中（主线程）——WASM 同步执行，帧时间线出现空洞';
    }
    if (side.ready) {
      return '就绪；切换「示例文本」或「推理位置」继续对比';
    }
    return `正在 ${where} 加载库与模型…（首次约 68 MB，命中缓存则很快）`;
  }

  /* ---------- 渲染 ---------- */

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

  function draw(): void {
    const now = performance.now();
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(260, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const contentWidth = width - 96;
    const side = sides[current.target];
    const status = deriveStatus();

    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 18px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      `sentiment-analysis · 推理位置：${current.target === 'worker' ? 'Web Worker' : '主线程'}`,
      48,
      44,
    );

    drawingContext.fillStyle = '#475569';
    drawingContext.font = '14px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText(`输入：${truncate(current.text, contentWidth)}`, 48, 78);

    if (status === 'error') {
      drawingContext.fillStyle = '#b91c1c';
      drawingContext.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
      drawingContext.fillText(truncate(statusMessage(), contentWidth), 48, 120);
    } else if (status === 'loading') {
      drawingContext.fillStyle = '#e2e8f0';
      drawingContext.fillRect(48, 100, contentWidth, 16);
      drawingContext.fillStyle = '#4f7cff';
      drawingContext.fillRect(
        48,
        100,
        (contentWidth * Math.min(100, side.progress)) / 100,
        16,
      );
      drawingContext.fillStyle = '#475569';
      drawingContext.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
      drawingContext.fillText(truncate(statusMessage(), contentWidth), 48, 146);
    } else {
      // running 沿用最近一次结果占位，ready 显示完整读数
      if (side.label === null) {
        drawingContext.fillStyle = '#475569';
        drawingContext.font = '14px ui-sans-serif, system-ui, sans-serif';
        drawingContext.fillText(
          side.running ? '推理中…' : '就绪；切换「示例文本」开始一次推理',
          48,
          130,
        );
      } else {
        const resultColor = side.label === 'NEGATIVE' ? '#b91c1c' : '#15803d';
        drawingContext.fillStyle = resultColor;
        drawingContext.font = '600 24px ui-monospace, SFMono-Regular, Menlo, monospace';
        drawingContext.fillText(`label: ${side.label}`, 48, 132);

        const shownScore = side.score ?? 0;
        drawingContext.fillStyle = '#e2e8f0';
        drawingContext.fillRect(48, 150, contentWidth, 14);
        drawingContext.fillStyle = resultColor;
        drawingContext.fillRect(48, 150, contentWidth * shownScore, 14);
        drawingContext.fillStyle = '#475569';
        drawingContext.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
        drawingContext.fillText(
          `score: ${shownScore.toFixed(4)} · 推理用时 ${side.inferMs ?? '—'} ms`,
          48,
          184,
        );
      }
      drawingContext.fillStyle = '#475569';
      drawingContext.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
      drawingContext.fillText(truncate(statusMessage(), contentWidth), 48, 214);
    }

    // 帧时间线：每根竖线是一帧；空洞与红线 = 主线程在该时段被冻结
    const baseline = height - 30;
    const windowStart = now - FRAME_WINDOW_MS;
    let previous = 0;
    for (const t of frameTimes) {
      const x = 48 + ((t - windowStart) / FRAME_WINDOW_MS) * contentWidth;
      drawingContext.fillStyle =
        previous > 0 && t - previous > LONG_FRAME_MS ? '#b91c1c' : '#94a3b8';
      drawingContext.fillRect(x, baseline - 12, 1, 12);
      previous = t;
    }
    drawingContext.fillStyle = '#475569';
    drawingContext.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText('帧时间线（最近 8 秒）：空洞与红线 = 主线程冻结', 48, baseline + 12);

    emit({
      status,
      target: current.target,
      progress: side.progress,
      label: side.label,
      score: side.score,
      loadSeconds: side.loadSeconds,
      inferMs: side.inferMs,
      fps,
      maxGapMs,
    });
  }

  const renderLoop = createRenderLoop(canvas, () => {
    recordFrame();
    draw();
  });
  void ensureSide(current.target);

  return {
    update(options) {
      if (disposed) {
        return;
      }
      const targetChanged = options.target !== current.target;
      const textChanged = options.text !== current.text;
      current = { ...options };
      if (targetChanged) {
        void ensureSide(current.target); // 另一侧未加载则开始加载，就绪后自动推理
      } else if (textChanged) {
        const side = sides[current.target];
        if (side.ready) {
          classify();
        } else if (side.error && !side.loading) {
          // 加载失败后，换输入给一次重试机会
          void ensureSide(current.target);
        }
      }
      draw();
    },
    dispose() {
      disposed = true;
      renderLoop.dispose();
      visibilityObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      // 硬停 worker：其中的库、模型、进行中的推理一并丢弃（Cache 里的磁盘缓存不受影响）
      worker?.terminate();
      worker = null;
      mainPipe = null;
    },
  };
}
