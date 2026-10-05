/**
 * 范例外壳：把「跨域隔离前提链」画成上下两行四级卡片——上行是本页的真实读数，
 * 下行是已隔离页面的概念示意（响应头无法在 Storybook 里配置，画布明确标注示意）。
 * 真正执行 ort 的代码在 isolation-probe.worker.ts（Show code 展示的文件）：
 * 主线程只负责读 window 作用域的隔离状态、按档位派生全新 worker、接收结果、画前提链。
 *
 * 前置状态：本页面没有 COOP/COEP 响应头，上行四环都应显示「未满足」。
 * 操作：Controls 切换「numThreads 设置值」（auto / 1 / 4），切换即终止旧
 * worker、派生全新 worker 重跑一次真实 create（MNIST 模型与 wasm 工件从 CDN
 * 拉取，首次会下载约 27MB 工件）。
 * 预期结果：上行 ②③④ 依次给出本页真实读数（false / undefined / 归一化 1）；
 * 切「显式 4」时读数面板出现两条回落警告原文；下行示意行恒为绿色——
 * 同一条链在已隔离页面的预期读数，本页无法伪造。
 * 阅读主线：startProbe（派生 worker）→ drawLink（四级链卡片）→ draw（双行画板）。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';
import type {
  ProbeRequest,
  ProbeResult,
  ThreadsSetting,
} from './isolation-probe.worker';

export type { ThreadsSetting };

export interface IsolationProbeArgs {
  setting: ThreadsSetting;
}

export interface IsolationProbeSnapshot {
  phase: 'running' | 'ok' | 'error';
  setting: ThreadsSetting;
  settingLabel: string;
  /** window 作用域的隔离读数（主线程直接检测）。 */
  isolated: boolean;
  hasIsolationApi: boolean;
  sabType: string;
  cores: number;
  /** worker 作用域的隔离读数；尚未回传时为 null。 */
  workerIsolated: boolean | null;
  workerSabType: string | null;
  threadsBefore: number | undefined;
  threadsAfter: number | undefined;
  warnings: string[];
  errorText: string | null;
  durationMs: number | null;
}

export interface IsolationProbeInstance {
  update(args: IsolationProbeArgs): void;
  dispose(): void;
}

/** Controls 与画布共用的档位文案。 */
export const THREAD_OPTIONS: Array<{ id: ThreadsSetting; label: string }> = [
  { id: 'auto', label: '自动（未设置）' },
  { id: 'one', label: '显式 1' },
  { id: 'four', label: '显式 4' },
];

function labelOf(id: ThreadsSetting): string {
  return THREAD_OPTIONS.find((option) => option.id === id)?.label ?? id;
}

/** 警告原文在只读面板里没有断行机会，插入零宽空格让它可换行（内容不变）。 */
export function softWrap(text: string): string {
  return text.replace(/([/.-])/g, `$1\u200b`);
}

type LinkState = 'unset' | 'active' | 'unmet' | 'met';

const LINK_COLORS: Record<
  LinkState,
  { fill: string; border: string; text: string; mark: string }
> = {
  unset: { fill: '#f4f6fa', border: '#dbe2ec', text: '#64748b', mark: '' },
  active: { fill: '#eef3ff', border: '#4f7cff', text: '#1d2b64', mark: '…' },
  unmet: { fill: '#fef2f2', border: '#dc2626', text: '#7f1d1d', mark: '✕' },
  met: { fill: '#ecfdf5', border: '#15803d', text: '#14532d', mark: '✓' },
};

export function createIsolationProbe(
  canvas: HTMLCanvasElement,
  emit: (snapshot: IsolationProbeSnapshot) => void,
): IsolationProbeInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  // window 作用域的隔离读数：主线程能直接检测的部分，一次读取。
  const windowScope = window as unknown as {
    crossOriginIsolated?: boolean;
    SharedArrayBuffer?: unknown;
  };
  const windowReadings = {
    isolated: windowScope.crossOriginIsolated === true,
    hasIsolationApi: 'crossOriginIsolated' in windowScope,
    sabType: typeof windowScope.SharedArrayBuffer,
    cores: navigator.hardwareConcurrency ?? 0,
  };

  let setting: ThreadsSetting = 'auto';
  let phase: IsolationProbeSnapshot['phase'] = 'running';
  let workerIsolated: boolean | null = null;
  let workerSabType: string | null = null;
  let threadsBefore: number | undefined;
  let threadsAfter: number | undefined;
  let warnings: string[] = [];
  let errorText: string | null = null;
  let durationMs: number | null = null;
  let worker: Worker | null = null;

  /** 隔离生效时 numThreads 自动值的公式结果（下行示意行使用）。 */
  function autoThreads(cores: number): number {
    return Math.min(4, Math.ceil(cores / 2));
  }

  function emitSnapshot() {
    emit({
      phase,
      setting,
      settingLabel: labelOf(setting),
      ...windowReadings,
      workerIsolated,
      workerSabType,
      threadsBefore,
      threadsAfter,
      warnings,
      errorText,
      durationMs,
    });
  }

  /**
   * 上行四环（响应头 → 隔离判定 → 共享内存 → 线程数生效）的各自状态。
   * ①响应头本体 JS 读不到，状态由②推断——crossOriginIsolated 是唯一公开判据。
   */
  function rowStates(): [LinkState, LinkState, LinkState, LinkState] {
    if (phase === 'running') {
      return [
        windowReadings.isolated ? 'met' : 'unmet',
        windowReadings.isolated ? 'met' : 'unmet',
        windowReadings.sabType === 'function' ? 'met' : 'unmet',
        'active',
      ];
    }
    const threadsState: LinkState =
      (threadsAfter ?? 1) > 1 ? 'met' : 'unmet';
    return [
      windowReadings.isolated ? 'met' : 'unmet',
      windowReadings.isolated ? 'met' : 'unmet',
      windowReadings.sabType === 'function' ? 'met' : 'unmet',
      threadsState,
    ];
  }

  function drawLink(
    x: number,
    y: number,
    width: number,
    height: number,
    title: string,
    subtitle: string,
    detail: string,
    state: LinkState,
  ) {
    const colors = LINK_COLORS[state];
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 8);
    ctx.fillStyle = colors.fill;
    ctx.fill();
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = state === 'unset' ? 1 : 2;
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = colors.text;
    ctx.font = '600 13px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(title, x + 10, y + 20);

    ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
    // maxWidth 让过长的 API 名在窄卡片里压缩显示，不裁掉尾部。
    ctx.fillText(subtitle, x + 10, y + 38, width - 20);
    ctx.fillText(detail, x + 10, y + 52, width - 20);

    if (colors.mark) {
      ctx.font = '700 14px ui-sans-serif, system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(colors.mark, x + width - 10, y + 21);
      ctx.textAlign = 'left';
    }
  }

  function drawArrow(x: number, y: number, length: number) {
    ctx.strokeStyle = '#94a3b8';
    ctx.fillStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + length, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + length, y);
    ctx.lineTo(x + length - 6, y - 4);
    ctx.lineTo(x + length - 6, y + 4);
    ctx.closePath();
    ctx.fill();
  }

  function drawRowLabel(y: number, text: string, color: string) {
    ctx.fillStyle = color;
    ctx.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(text, 20, y);
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(560, size.width);
    const height = Math.max(312, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const margin = 20;
    const gap = 30;
    const boxWidth = (width - margin * 2 - gap * 3) / 4;
    const boxHeight = 64;

    const titles = ['① 响应头', '② 隔离判定', '③ 共享内存', '④ 线程数生效'];
    const rowLabelHeight = 24;
    const rowTop = { real: 34, ideal: 34 + rowLabelHeight + boxHeight + 42 };

    // 上行：本页的真实读数。
    drawRowLabel(24, '本页（真实读数）', '#334155');
    const realStates = rowStates();
    const realDetails = [
      windowReadings.isolated ? '已配置（由②推断）' : '隔离未成立（看②）',
      'crossOriginIsolated',
      'SharedArrayBuffer',
      '归一化 numThreads',
    ];
    const realSubtitles = [
      'COOP + COEP',
      windowReadings.isolated ? 'true' : 'false',
      windowReadings.sabType === 'function' ? 'function' : 'undefined',
      phase === 'running' ? '创建中…' : String(threadsAfter ?? '—'),
    ];
    for (let index = 0; index < 4; index += 1) {
      const x = margin + index * (boxWidth + gap);
      drawLink(
        x,
        rowTop.real,
        boxWidth,
        boxHeight,
        titles[index],
        realSubtitles[index],
        realDetails[index],
        realStates[index],
      );
      if (index < 3) {
        drawArrow(x + boxWidth + 5, rowTop.real + boxHeight / 2, gap - 10);
      }
    }

    // 下行：已隔离页面的概念示意——响应头无法在 Storybook 里配置，不能伪造读数。
    drawRowLabel(rowTop.ideal - 14, '已隔离页面（概念示意，非本页读数）', '#15803d');
    const idealDetails = [
      'same-origin + require-corp',
      'crossOriginIsolated',
      'SharedArrayBuffer',
      `min(4, ⌈${windowReadings.cores}÷2⌉) = ${autoThreads(windowReadings.cores)}`,
    ];
    const idealSubtitles = ['COOP + COEP', 'true', '可用', '自动值'];
    for (let index = 0; index < 4; index += 1) {
      const x = margin + index * (boxWidth + gap);
      drawLink(
        x,
        rowTop.ideal,
        boxWidth,
        boxHeight,
        titles[index],
        idealSubtitles[index],
        idealDetails[index],
        'met',
      );
      if (index < 3) {
        drawArrow(x + boxWidth + 5, rowTop.ideal + boxHeight / 2, gap - 10);
      }
    }

    // 底部信息行：真实 create 的进度与结论。
    const infoY = rowTop.ideal + boxHeight + 28;
    ctx.textAlign = 'left';
    if (phase === 'running') {
      ctx.fillStyle = '#4f7cff';
      ctx.font = '600 13px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText(
        `正在全新 worker 里真实 create（${labelOf(setting)}）…首次约下载 27MB 工件，命中缓存后复访很快`,
        margin,
        infoY,
      );
    } else if (phase === 'ok') {
      const warnNote =
        warnings.length > 0 ? `，回落警告 ${warnings.length} 条（原文见读数）` : '，无警告';
      ctx.fillStyle = '#334155';
      ctx.font = '600 13px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText(
        `create 完成（${(durationMs ?? 0).toFixed(0)} ms）：设置 ${labelOf(setting)} → 归一化 ${threadsAfter ?? '—'}${warnNote}`,
        margin,
        infoY,
      );
    } else {
      ctx.fillStyle = '#dc2626';
      ctx.font = '600 13px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText('create 失败：报错原文见读数面板', margin, infoY);
    }
    ctx.fillStyle = '#64748b';
    ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(
      '本页链条断在第①环：配置响应头后刷新页面，同一套读数即可验证隔离生效',
      margin,
      infoY + 20,
    );

    emitSnapshot();
  }

  function startProbe(next: ThreadsSetting) {
    setting = next;
    phase = 'running';
    workerIsolated = null;
    workerSabType = null;
    threadsBefore = undefined;
    threadsAfter = undefined;
    warnings = [];
    errorText = null;
    durationMs = null;

    worker?.terminate();
    const nextWorker = new Worker(
      new URL('./isolation-probe.worker.ts', import.meta.url),
      { type: 'module' },
    );
    worker = nextWorker;

    nextWorker.onmessage = (event: MessageEvent<ProbeResult>) => {
      if (event.data.setting !== setting || nextWorker !== worker) {
        return; // 丢弃过期结果
      }
      phase = event.data.ok ? 'ok' : 'error';
      workerIsolated = event.data.isolated;
      workerSabType = event.data.sabType;
      threadsBefore = event.data.threadsBefore;
      threadsAfter = event.data.threadsAfter;
      warnings = event.data.warnings;
      errorText = event.data.errorText;
      durationMs = event.data.durationMs;
      draw();
    };
    nextWorker.onerror = (event) => {
      if (nextWorker !== worker) {
        return;
      }
      phase = 'error';
      errorText = event.message || 'worker 加载失败';
      draw();
    };

    draw();
    const request: ProbeRequest = { setting: next };
    nextWorker.postMessage(request);
  }

  const resizeObserver = createResizeObserver(canvas, draw);
  draw();
  startProbe(setting);

  return {
    update(args: IsolationProbeArgs) {
      if (args.setting !== setting) {
        startProbe(args.setting);
      }
    },
    dispose() {
      worker?.terminate();
      worker = null;
      resizeObserver.disconnect();
    },
  };
}
