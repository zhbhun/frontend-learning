/**
 * 范例介绍：run_at 三档怎样决定 content script 在页面加载时间线上的位置与 DOM 状态。
 * 前置状态：页面按「解析 HTML → DOM 完成（DOMContentLoaded）→ 子资源加载 → load →
 * idle」推进；页面自身脚本在解析中途执行，页面元素 #target 在解析中途出现。
 * 主要操作：切换 run_at 档位。
 * 预期结果：document_start 早于页面脚本与 #target 解析完成，querySelector 拿不到
 * 元素；document_end 已在 DOM 完成之后，能查到元素但子资源仍在加载；document_idle
 * 落在 load 前后。三条位置随 run_at 实时重绘。
 * 阅读主线：顶部标签标出各次注入的先后，中部是加载阶段条，底部给出脚本视角的结论。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type RunAt = 'document_start' | 'document_end' | 'document_idle';

export interface TimingOptions {
  runAt: RunAt;
}

export interface TimingSnapshot {
  runAtLabel: string;
  readyState: string;
  targetQuery: string;
  note: string;
}

export interface TimingInstance {
  update(options: TimingOptions): void;
  dispose(): void;
}

// 加载阶段条：x 为时间线比例，readyState 由脚本所在位置决定
const PHASES = [
  { from: 0.02, to: 0.26, label: '解析 HTML' },
  { from: 0.28, to: 0.64, label: '子资源加载' },
  { from: 0.68, to: 0.98, label: 'idle' },
];

const CSS_X = 0.03;
const PAGE_SCRIPT_X = 0.14;
const TARGET_X = 0.18;
const DCL_X = 0.26;
const LOAD_X = 0.66;

const SCRIPT_X: Record<RunAt, number> = {
  document_start: 0.08,
  document_end: 0.31,
  document_idle: 0.71,
};

const COPY: Record<
  RunAt,
  {
    label: string;
    readyState: string;
    targetQuery: string;
    note: string;
  }
> = {
  document_start: {
    label: 'document_start',
    readyState: 'loading',
    targetQuery: "querySelector('#target') → null（尚未解析到）",
    note: 'DOM 未构建：此刻脚本应尽早注册监听（DOMContentLoaded），而不是直接查询元素。',
  },
  document_end: {
    label: 'document_end',
    readyState: 'interactive',
    targetQuery: "querySelector('#target') → <div id=\"target\">",
    note: 'DOM 已完整：可直接查询与改写；图片等子资源可能仍在加载。',
  },
  document_idle: {
    label: 'document_idle（默认）',
    readyState: 'interactive ~ complete（load 前后）',
    targetQuery: "querySelector('#target') → <div id=\"target\">",
    note: 'DOM 与资源基本就绪：无需再监听 load 即可操作，官方推荐的默认档位。',
  },
};

export function createTimingExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: TimingSnapshot) => void,
): TimingInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: TimingOptions = { runAt: 'document_idle' };

  function text(
    content: string,
    x: number,
    y: number,
    options: { color?: string; font?: string; align?: CanvasTextAlign } = {},
  ) {
    drawingContext.fillStyle = options.color ?? '#172033';
    drawingContext.font =
      options.font ?? '14px ui-sans-serif, system-ui, sans-serif';
    drawingContext.textAlign = options.align ?? 'left';
    drawingContext.fillText(content, x, y);
    drawingContext.textAlign = 'left';
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(640, size.width);
    const height = 300;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const left = 40;
    const right = width - 40;
    const barTop = 168;
    const barHeight = 34;
    const runAt = current.runAt;
    const copy = COPY[runAt];

    const toX = (ratio: number) => left + ratio * (right - left);

    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 18px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('页面加载时间线与注入点（模拟）', left, 28);

    // 顶部注入标签：固定三行，避免相互压字
    interface MarkerLabel {
      ratio: number;
      label: string;
      color: string;
      row: 0 | 1 | 2;
    }
    const labels: MarkerLabel[] = [
      { ratio: PAGE_SCRIPT_X, label: '页面自身脚本', color: '#b45309', row: 0 },
      { ratio: CSS_X, label: 'manifest css', color: '#2f9e6e', row: 2 },
      { ratio: DCL_X, label: 'DOMContentLoaded', color: '#64748b', row: 2 },
      { ratio: LOAD_X, label: 'load', color: '#64748b', row: 2 },
    ];
    if (runAt === 'document_start') {
      labels.push({ ratio: SCRIPT_X[runAt], label: 'content script', color: '#4f7cff', row: 1 });
    } else if (runAt === 'document_end') {
      labels.push({ ratio: SCRIPT_X[runAt], label: 'content script', color: '#4f7cff', row: 0 });
    } else {
      labels.push({ ratio: SCRIPT_X[runAt], label: 'content script', color: '#4f7cff', row: 1 });
    }

    const rowY: Record<0 | 1 | 2, number> = { 0: 46, 1: 72, 2: 98 };
    for (const marker of labels) {
      const x = toX(marker.ratio);
      const y = rowY[marker.row];
      text(marker.label, x, y, {
        color: marker.color,
        font: '600 13px ui-sans-serif, system-ui, sans-serif',
        align: 'center',
      });
      drawingContext.strokeStyle = marker.color;
      drawingContext.lineWidth = 1;
      drawingContext.setLineDash([]);
      drawingContext.beginPath();
      drawingContext.moveTo(x, y + 8);
      drawingContext.lineTo(x, barTop);
      drawingContext.stroke();
    }

    // 加载阶段条
    for (const phase of PHASES) {
      drawingContext.fillStyle = '#e2e8f0';
      drawingContext.fillRect(
        toX(phase.from),
        barTop,
        toX(phase.to) - toX(phase.from),
        barHeight,
      );
      text(phase.label, (toX(phase.from) + toX(phase.to)) / 2, barTop + 22, {
        color: '#475569',
        font: '13px ui-sans-serif, system-ui, sans-serif',
        align: 'center',
      });
    }

    // 关键时刻（DOMContentLoaded / load）刻度
    drawingContext.strokeStyle = '#94a3b8';
    drawingContext.setLineDash([4, 3]);
    for (const ratio of [DCL_X, LOAD_X]) {
      drawingContext.beginPath();
      drawingContext.moveTo(toX(ratio), barTop);
      drawingContext.lineTo(toX(ratio), barTop + barHeight);
      drawingContext.stroke();
    }
    drawingContext.setLineDash([]);

    // #target 在解析中途出现
    drawingContext.fillStyle = '#172033';
    drawingContext.fillRect(toX(TARGET_X) - 3, barTop + barHeight, 6, 14);
    text('#target', toX(TARGET_X), barTop + barHeight + 30, {
      color: '#475569',
      font: '12px ui-monospace, SFMono-Regular, Menlo, monospace',
      align: 'center',
    });

    // 当前 run_at 的位置高亮
    const scriptRatio = SCRIPT_X[runAt];
    drawingContext.fillStyle = '#4f7cff';
    drawingContext.beginPath();
    drawingContext.moveTo(toX(scriptRatio), barTop - 2);
    drawingContext.lineTo(toX(scriptRatio) - 6, barTop - 12);
    drawingContext.lineTo(toX(scriptRatio) + 6, barTop - 12);
    drawingContext.closePath();
    drawingContext.fill();

    // 底部结论：脚本视角的两项读数
    text(`run_at = ${copy.label}`, left, 254, {
      font: '600 14px ui-monospace, SFMono-Regular, Menlo, monospace',
    });
    text(
      `注入时 document.readyState = ${copy.readyState}`,
      left + 260,
      254,
      { color: '#475569' },
    );
    text(copy.targetQuery, left, 278, {
      color: '#475569',
      font: '13px ui-monospace, SFMono-Regular, Menlo, monospace',
    });

    emit({
      runAtLabel: copy.label,
      readyState: copy.readyState,
      targetQuery: copy.targetQuery,
      note: copy.note,
    });
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options) {
      current = options;
      draw();
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
