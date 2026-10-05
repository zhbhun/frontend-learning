/**
 * 范例外壳：用持续旋转的标记与帧间隔时间线，把「推理占不占主线程」变成可见、可计数的证据。
 * 真正的推理执行在 ort-attempts.ts（Show code 展示的文件）：本文件只驱动 rAF、逐帧记录
 * 间隔、绘制时间线，并把计时汇总成读数。
 *
 * 怎么读图：每根竖条是一帧的帧间隔（高度封顶 100ms，虚线是 16.7ms 的 60fps 参考线）。
 * 主线程直跑档，run 的同步计算不把事件循环让给渲染，推理期间动画冻结，时间线出现一根
 * 覆盖整轮推理的红色长条；proxy / 自建 worker 档主线程只等消息，帧间隔贴着参考线。
 * 离开视口时渲染会暂停，恢复后的首个大间隔（超过 RESUME_GAP_MS）不计入统计。
 *
 * 阅读主线：tick（rAF 计帧）→ startAttempt（固定窗口时间戳）→ statsOf（窗口内帧统计）→ draw。
 */
import {
  createRenderLoop,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';
import { buildInputPattern, type AttemptOutcome } from './inference-shared';
import {
  disposeOwnWorker,
  runInferenceAttempt,
  type ProbeMode,
} from './ort-attempts';

export interface ProbeArgs {
  mode: ProbeMode;
  runs: number;
}

export interface ProbeSnapshot {
  phase: 'running' | 'ok' | 'error';
  modeLabel: string;
  runs: number;
  createMs: number | null;
  avgRunMs: number | null;
  maxRunMs: number | null;
  /** 推理窗口内最大的帧间隔；窗口内没有记录到帧（例如一直离屏）时为 null。 */
  maxFrameGapMs: number | null;
  /** 按每帧 16.7ms 估算的累计掉帧数。 */
  missedFrames: number | null;
  digit: number | null;
  confidence: number | null;
  errorText: string;
}

export interface ProbeInstance {
  update(args: ProbeArgs): void;
  dispose(): void;
}

/** Controls 与画布共用的档位文案。 */
export const MODE_OPTIONS: Array<{ id: ProbeMode; label: string }> = [
  { id: 'main', label: '主线程直跑' },
  { id: 'proxy', label: 'ort proxy' },
  { id: 'own-worker', label: '自建 worker' },
];

function labelOf(mode: ProbeMode): string {
  return MODE_OPTIONS.find((option) => option.id === mode)?.label ?? mode;
}

const FRAME_BUDGET_MS = 1000 / 60;
const HISTORY_SLOTS = 220;
const FRAME_LOG_CAP = 800;
/** 比它大的帧间隔视为离屏暂停后的恢复首帧，不计入统计。 */
const RESUME_GAP_MS = 1500;
/** 帧间隔高度封顶值。 */
const BAR_CAP_MS = 100;

export function createProbe(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ProbeSnapshot) => void,
): ProbeInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  // 输入图案预渲染到 28×28 离屏画布，绘制时放大呈现（关闭平滑保持像素感）。
  const inputPreview = document.createElement('canvas');
  inputPreview.width = 28;
  inputPreview.height = 28;
  const previewCtx = inputPreview.getContext('2d');
  if (!previewCtx) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const pattern = buildInputPattern();
  const previewImage = previewCtx.createImageData(28, 28);
  for (let i = 0; i < pattern.length; i += 1) {
    const value = Math.round(pattern[i] * 255);
    previewImage.data[i * 4] = value;
    previewImage.data[i * 4 + 1] = value;
    previewImage.data[i * 4 + 2] = value;
    previewImage.data[i * 4 + 3] = 255;
  }
  previewCtx.putImageData(previewImage, 0, 0);

  let mode: ProbeMode = 'main';
  let runs = 20;
  let phase: ProbeSnapshot['phase'] = 'running';
  let outcome: AttemptOutcome | null = null;
  let errorText = '';

  let attemptSeq = 0;
  let attemptStart = performance.now();
  let completedAt: number | undefined;

  let lastTick: number | null = null;
  let spinnerAngle = 0;
  /** 最近若干帧的间隔（时间线展示）。 */
  const history: number[] = [];
  /** 帧时间戳与间隔（推理窗口统计用）。 */
  const frameLog: Array<{ t: number; dt: number }> = [];

  /** 推理窗口内的帧统计：窗口从本次尝试开始，到完成后一小段收尾帧为止。 */
  function statsOf(): { count: number; maxGap: number; missed: number } {
    let count = 0;
    let maxGap = 0;
    let missed = 0;
    const windowEnd = (completedAt ?? Number.POSITIVE_INFINITY) + 120;
    for (const frame of frameLog) {
      if (frame.t < attemptStart || frame.t > windowEnd) {
        continue;
      }
      count += 1;
      maxGap = Math.max(maxGap, frame.dt);
      missed += Math.max(0, Math.round(frame.dt / FRAME_BUDGET_MS) - 1);
    }
    return { count, maxGap, missed };
  }

  function emitSnapshot() {
    const stats = statsOf();
    emit({
      phase,
      modeLabel: labelOf(mode),
      runs,
      createMs: outcome?.createMs ?? null,
      avgRunMs:
        outcome && outcome.runMs.length > 0
          ? outcome.runMs.reduce((a, b) => a + b, 0) / outcome.runMs.length
          : null,
      maxRunMs: outcome && outcome.runMs.length > 0 ? Math.max(...outcome.runMs) : null,
      maxFrameGapMs: stats.count > 0 ? stats.maxGap : null,
      missedFrames: stats.count > 0 ? stats.missed : null,
      digit: outcome?.digit ?? null,
      confidence: outcome?.confidence ?? null,
      errorText,
    });
  }

  function tick() {
    const now = performance.now();
    const dt = lastTick === null ? FRAME_BUDGET_MS : now - lastTick;
    lastTick = now;
    spinnerAngle = (spinnerAngle + dt * 0.36) % 360; // 约每秒一圈，被占住时肉眼可见地停住
    if (dt <= RESUME_GAP_MS) {
      history.push(dt);
      if (history.length > HISTORY_SLOTS) {
        history.shift();
      }
      frameLog.push({ t: now, dt });
      if (frameLog.length > FRAME_LOG_CAP) {
        frameLog.shift();
      }
    }
    draw();
    emitSnapshot();
  }

  function frameColor(dt: number): string {
    if (dt <= FRAME_BUDGET_MS * 1.5) {
      return '#15803d';
    }
    if (dt <= FRAME_BUDGET_MS * 3) {
      return '#d97706';
    }
    return '#dc2626';
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(560, size.width);
    const height = Math.max(252, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const margin = 24;

    ctx.textAlign = 'left';
    ctx.fillStyle = '#172033';
    ctx.font = '600 14px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('主线程动画与帧间隔时间线', margin, 32);

    // 图例（标题行右侧）
    ctx.font = '11px ui-sans-serif, system-ui, sans-serif';
    const legend = [
      { color: '#15803d', text: '≤25ms' },
      { color: '#d97706', text: '≤50ms' },
      { color: '#dc2626', text: '更久（冻结）' },
    ];
    let legendX = width - margin - 220;
    for (const item of legend) {
      ctx.fillStyle = item.color;
      ctx.fillRect(legendX, 22, 9, 9);
      ctx.fillStyle = '#64748b';
      ctx.fillText(item.text, legendX + 13, 30);
      legendX += 13 + ctx.measureText(item.text).width + 14;
    }

    // 旋转标记：主线程空闲时匀速转圈，被推理占住时停住
    const spinnerX = width - margin - 26;
    const spinnerY = 74;
    const spinnerR = 17;
    ctx.beginPath();
    ctx.arc(spinnerX, spinnerY, spinnerR, 0, Math.PI * 2);
    ctx.strokeStyle = '#dbe2ec';
    ctx.lineWidth = 4;
    ctx.stroke();
    const angle = (spinnerAngle * Math.PI) / 180;
    ctx.beginPath();
    ctx.moveTo(
      spinnerX + Math.cos(angle) * (spinnerR - 9),
      spinnerY + Math.sin(angle) * (spinnerR - 9),
    );
    ctx.lineTo(
      spinnerX + Math.cos(angle) * (spinnerR - 2),
      spinnerY + Math.sin(angle) * (spinnerR - 2),
    );
    ctx.strokeStyle = '#4f7cff';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = '#64748b';
    ctx.font = '11px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('动画', spinnerX, spinnerY + spinnerR + 16);
    ctx.textAlign = 'left';

    // 帧间隔时间线
    const stripX = margin;
    const stripY = 52;
    const stripW = width - margin * 2;
    const stripH = 84;
    ctx.beginPath();
    ctx.roundRect(stripX, stripY, stripW, stripH, 8);
    ctx.fillStyle = '#f8fafc';
    ctx.fill();
    ctx.strokeStyle = '#dbe2ec';
    ctx.lineWidth = 1;
    ctx.stroke();

    const slotW = (stripW - 16) / HISTORY_SLOTS;
    for (let i = 0; i < history.length; i += 1) {
      const dt = history[i];
      const barH = Math.min(stripH - 8, (dt / BAR_CAP_MS) * stripH);
      ctx.fillStyle = frameColor(dt);
      ctx.fillRect(stripX + 8 + i * slotW, stripY + stripH - 4 - barH, Math.max(1, slotW - 1), barH);
    }
    const guideH = (FRAME_BUDGET_MS / BAR_CAP_MS) * stripH;
    const guideY = stripY + stripH - 4 - guideH;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(stripX + 8, guideY);
    ctx.lineTo(stripX + stripW - 8, guideY);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#64748b';
    ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText('16.7 ms（60fps）', stripX + 12, guideY - 5);

    // 输入预览与状态行
    const previewTop = stripY + stripH + 20;
    const previewSize = 56;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(inputPreview, margin, previewTop, previewSize, previewSize);
    ctx.strokeStyle = '#dbe2ec';
    ctx.strokeRect(margin + 0.5, previewTop + 0.5, previewSize, previewSize);
    ctx.fillStyle = '#64748b';
    ctx.font = '11px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('输入 28×28（三档相同）', margin, previewTop + previewSize + 16);

    const statusX = margin + previewSize + 20;
    const statusY = previewTop + 26;
    ctx.font = '600 13px ui-sans-serif, system-ui, sans-serif';
    if (phase === 'running') {
      ctx.fillStyle = '#4f7cff';
      ctx.fillText(
        `推理中：${labelOf(mode)} × ${runs} 次 —— 盯住旋转标记与红色长条`,
        statusX,
        statusY,
      );
      ctx.fillStyle = '#64748b';
      ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText('首次运行会下载约 13.6MB 的 wasm 工件，命中缓存后复跑很快', statusX, statusY + 20);
    } else if (phase === 'ok' && outcome) {
      const avg =
        outcome.runMs.length > 0
          ? outcome.runMs.reduce((a, b) => a + b, 0) / outcome.runMs.length
          : 0;
      const total = outcome.runMs.reduce((a, b) => a + b, 0);
      ctx.fillStyle = '#15803d';
      ctx.fillText(
        `完成：create ${outcome.createMs.toFixed(0)} ms；推理 ${total.toFixed(0)} ms（均值 ${avg.toFixed(1)} ms/次）`,
        statusX,
        statusY,
      );
      ctx.fillStyle = '#64748b';
      ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText(
        `输出类别 ${outcome.digit}（置信 ${((outcome.confidence ?? 0) * 100).toFixed(0)}%）——三档应一致`,
        statusX,
        statusY + 20,
      );
    } else {
      ctx.fillStyle = '#dc2626';
      ctx.fillText(`失败：${errorText.slice(0, 110)}`, statusX, statusY);
      ctx.fillStyle = '#64748b';
      ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText('完整报错原文见左下读数', statusX, statusY + 20);
    }

    emitSnapshot();
  }

  async function startAttempt() {
    attemptSeq += 1;
    const seq = attemptSeq;
    phase = 'running';
    outcome = null;
    errorText = '';
    completedAt = undefined;
    attemptStart = performance.now();
    draw();
    const result = await runInferenceAttempt(mode, runs);
    if (seq !== attemptSeq) {
      return; // 已被更新的尝试取代，丢弃过期结果
    }
    outcome = result;
    errorText = result.errorText ?? '';
    completedAt = performance.now();
    phase = result.ok ? 'ok' : 'error';
    draw();
  }

  const renderLoop = createRenderLoop(canvas, tick);
  draw();
  void startAttempt();

  return {
    update(args: ProbeArgs) {
      if (args.mode !== mode || args.runs !== runs) {
        mode = args.mode;
        runs = args.runs;
        void startAttempt();
      }
    },
    dispose() {
      renderLoop.dispose();
      disposeOwnWorker();
    },
  };
}
