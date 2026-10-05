/**
 * 范例：同一会话上的并发 run 与队列串行的对照。
 * 前置状态：浏览器需能访问模型文件与 ort wasm 的 CDN；会话由 session-runner.ts
 * 创建并全课共享；默认入口的 ort wasm 运行时同一时刻只允许一个 run 在飞。
 * 操作：点击画布触发一轮 5 次推理；用 Controls 切换「触发方式」再点一次对比。
 * 预期结果：「同时并发」下 5 个 run 立刻全部发出，只有第一个能进入 wasm，其余
 * 抛 Session already started，第一个也常被连累报 Session mismatch；「队列串行」
 * 下 5 个按发起顺序全部成功，时间轴呈现错峰条形。
 * 阅读主线：fireRound（按模式发起）→ 每条 run 记录起止时间 → 时间轴与汇总读数。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';
import { InferenceSession, Tensor } from 'onnxruntime-web';
import { loadSession, runQueued } from './session-runner';

export type BurstMode = 'burst' | 'queue';

export const BURST_MODE_LABELS: Record<BurstMode, string> = {
  burst: '同时并发',
  queue: '队列串行',
};

const ROUND_SIZE = 5;
const GRID = 28;

type RunState = 'waiting' | 'running' | 'ok' | 'failed';

interface RunRecord {
  index: number;
  state: RunState;
  /** waiting 阶段是发起时间；进入 running 后更新为真正开始执行的时间。 */
  start: number;
  end: number;
  error: string;
}

export interface RunConcurrencySnapshot {
  status: 'loading' | 'idle' | 'running' | 'ready' | 'error';
  message: string;
  mode: string;
  okCount: string;
  failCount: string;
  firstError: string;
}

export interface RunConcurrencyInstance {
  update(options: { mode: BurstMode }): void;
  dispose(): void;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function createRunConcurrency(
  canvas: HTMLCanvasElement,
  emit: (snapshot: RunConcurrencySnapshot) => void,
): RunConcurrencyInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  let session: InferenceSession | null = null;
  let status: RunConcurrencySnapshot['status'] = 'loading';
  let message = '加载模型…';
  let mode: BurstMode = 'queue';
  let records: RunRecord[] = [];
  let roundToken = 0;
  let layout = { width: 560, height: 300 };

  function counts(): { ok: number; fail: number; firstError: string } {
    let ok = 0;
    let fail = 0;
    let firstError = '—';
    for (const record of records) {
      if (record.state === 'ok') {
        ok += 1;
      } else if (record.state === 'failed') {
        fail += 1;
        if (firstError === '—' && record.error) {
          firstError = record.error;
        }
      }
    }
    return { ok, fail, firstError };
  }

  function emitSnapshot() {
    const { ok, fail, firstError } = counts();
    emit({
      status,
      message,
      mode: BURST_MODE_LABELS[mode],
      okCount: `${ok} / ${records.length || ROUND_SIZE}`,
      failCount: `${fail} / ${records.length || ROUND_SIZE}`,
      firstError,
    });
  }

  function draw() {
    const { width, height } = layout;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = '#172033';
    ctx.font = '600 16px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(`并发 ${ROUND_SIZE} 次推理的时间轴（${BURST_MODE_LABELS[mode]}）`, 28, 36);

    const timelineX = 66;
    const timelineWidth = width - timelineX - 150;
    const rowHeight = 40;
    const timelineTop = 64;

    if (records.length === 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = '13px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText('点击画布触发一轮推理。', 28, timelineTop + 24);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText('建议先看「队列串行」，再切到「同时并发」对比失败情况。', 28, timelineTop + 48);
      ctx.fillStyle = status === 'error' ? '#991b1b' : '#64748b';
      ctx.fillText(message, 28, height - 16);
      return;
    }

    const now = performance.now();
    const t0 = Math.min(...records.map((record) => record.start));
    const t1 = Math.max(...records.map((record) => (record.end > 0 ? record.end : now)));
    const span = Math.max(t1 - t0, 0.5);
    const xOf = (t: number) => timelineX + ((t - t0) / span) * timelineWidth;

    // 时间轴网格与总耗时标尺。
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(timelineX, timelineTop - 12);
    ctx.lineTo(timelineX + timelineWidth, timelineTop - 12);
    ctx.stroke();
    ctx.fillStyle = '#64748b';
    ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText('发起', timelineX, timelineTop - 18);
    const totalText = `一轮总耗时 ${span.toFixed(1)} ms`;
    ctx.fillText(totalText, timelineX + timelineWidth - ctx.measureText(totalText).width, timelineTop - 18);

    records.forEach((record, index) => {
      const y = timelineTop + index * rowHeight;
      ctx.fillStyle = '#475569';
      ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillText(`run ${record.index + 1}`, 28, y + 20);

      const running = record.state === 'waiting' || record.state === 'running';
      const endX = xOf(record.end > 0 ? record.end : now);
      const startX = xOf(record.start);
      const barWidth = Math.max(2, endX - startX);

      if (record.state === 'ok') {
        ctx.fillStyle = '#4f7cff';
        ctx.fillRect(startX, y + 8, barWidth, 16);
      } else if (record.state === 'running') {
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(startX, y + 8, barWidth, 16);
      } else if (record.state === 'waiting') {
        ctx.strokeStyle = '#94a3b8';
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(startX, y + 8, Math.max(4, barWidth), 16);
        ctx.setLineDash([]);
      } else {
        // 被并发保护拒绝的 run：红色短标记 + 错误缩写。
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(startX, y + 8, Math.max(4, barWidth), 16);
        const label = record.error.split('\n')[0];
        ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.fillText(`✗ ${label}`.slice(0, 26), timelineX + timelineWidth + 8, y + 20);
      }
    });

    const { ok, fail, firstError } = counts();
    const summaryY = timelineTop + records.length * rowHeight + 24;
    ctx.fillStyle = '#172033';
    ctx.font = '600 13px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(`成功 ${ok} · 失败 ${fail}`, 28, summaryY);
    if (firstError !== '—') {
      ctx.fillStyle = '#dc2626';
      ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillText(`首个错误：${firstError}`.slice(0, 64), 28, summaryY + 20);
    }

    ctx.fillStyle = status === 'error' ? '#991b1b' : '#64748b';
    ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(message, 28, height - 16);
  }

  function makeFeeds(target: InferenceSession): InferenceSession.FeedsType {
    return {
      [target.inputNames[0]]: new Tensor('float32', new Float32Array(GRID * GRID), [1, 1, GRID, GRID]),
    };
  }

  function settle(myRound: number, record: RunRecord, ok: boolean, error: string): void {
    if (myRound !== roundToken) {
      return;
    }
    record.state = ok ? 'ok' : 'failed';
    record.end = performance.now();
    record.error = error;
    if (records.every((item) => item.state === 'ok' || item.state === 'failed')) {
      status = 'ready';
      message = '就绪；点击画布可再触发一轮';
      // 共享外壳的读数有 100ms 节流：最后一格状态定格后补发一次。
      emitSoon();
    }
    draw();
    emitSnapshot();
  }

  function fireRound(): void {
    if (!session) {
      return;
    }
    roundToken += 1;
    const myRound = roundToken;
    const firedAt = performance.now();
    records = Array.from({ length: ROUND_SIZE }, (_, index) => ({
      index,
      state: 'waiting' as RunState,
      start: firedAt,
      end: 0,
      error: '',
    }));
    status = 'running';
    message = '推理中…';
    draw();
    emitSnapshot();

    for (const record of records) {
      if (mode === 'burst') {
        // 同时并发：5 个调用不做任何排队，立刻全部发出。
        void session.run(makeFeeds(session)).then(
          () => settle(myRound, record, true, ''),
          (error: unknown) => settle(myRound, record, false, errorMessage(error)),
        );
      } else {
        // 队列串行：经过 runQueued，前一个结束后一个才开始。
        void runQueued(async () => {
          if (myRound !== roundToken) {
            return;
          }
          record.state = 'running';
          record.start = performance.now();
          draw();
          emitSnapshot();
          try {
            await session!.run(makeFeeds(session!));
            settle(myRound, record, true, '');
          } catch (error) {
            settle(myRound, record, false, errorMessage(error));
          }
        });
      }
    }
  }

  function onClick(): void {
    if (status === 'running' || status === 'loading') {
      return;
    }
    fireRound();
  }

  async function initialize(): Promise<void> {
    try {
      session = await loadSession();
      status = 'idle';
      message = '就绪；点击画布触发一轮推理';
      draw();
      emitSnapshot();
      // 打开实例先自动跑一轮「队列串行」，读者再切到「同时并发」对比。
      fireRound();
    } catch (error) {
      status = 'error';
      message = `加载失败：${errorMessage(error)}`;
      draw();
      emitSnapshot();
      emitSoon();
    }
  }

  // 共享外壳的读数有 100ms 节流：状态定格后补发一次，确保最终值被绘制。
  let emitTimer = 0;
  function emitSoon(): void {
    window.clearTimeout(emitTimer);
    emitTimer = window.setTimeout(() => {
      draw();
      emitSnapshot();
    }, 130);
  }

  canvas.style.touchAction = 'none';
  canvas.style.cursor = 'pointer';
  canvas.addEventListener('pointerdown', onClick);

  const resizeObserver = createResizeObserver(canvas, () => {
    const size = readCanvasSize(canvas);
    layout = {
      width: Math.max(560, size.width),
      height: Math.max(300, size.height),
    };
    draw();
  });
  layout = { width: Math.max(560, readCanvasSize(canvas).width), height: 300 };

  void initialize();

  return {
    update(options) {
      const next = options.mode;
      if (next !== mode) {
        mode = next;
        draw();
        emitSnapshot();
      }
    },
    dispose() {
      roundToken += 1;
      window.clearTimeout(emitTimer);
      canvas.removeEventListener('pointerdown', onClick);
      resizeObserver.disconnect();
      // 不释放共享会话：同页另一个实例仍在使用；释放策略见内存管理课程。
    },
  };
}
