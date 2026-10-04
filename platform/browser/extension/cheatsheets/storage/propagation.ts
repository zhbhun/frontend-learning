/**
 * 范例介绍：一次 storage 写入在三个上下文触发的 onChanged 事件与 payload。
 * 前置状态：storage.local 已有 count = 42；service worker、popup、content script
 * 都注册了 onChanged 监听器（local 默认对三类上下文可访问）。
 * 主要操作：切换「写入方」与「写入操作」，顶部写入动作与各上下文收到的 changes 随之重绘。
 * 预期结果：三个上下文各收到一次 onChanged，写入方自己也收到；一次 set 两个键
 * 合并为一次事件、changes 带两个条目；remove 的条目只剩 oldValue、没有 newValue。
 * 阅读主线：顶部是 t≈0 的写入动作，下面三行是 t≈16 ms 时各上下文收到的 onChanged。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type Writer = 'sw' | 'popup';
export type WriteAction = 'set-one' | 'set-two' | 'remove';

export interface PropagationOptions {
  writer: Writer;
  action: WriteAction;
}

export interface PropagationSnapshot {
  writerLabel: string;
  onChangedCount: string;
  changeEntries: string;
  writerNotified: string;
}

export interface PropagationInstance {
  update(options: PropagationOptions): void;
  dispose(): void;
}

const WRITER_LABEL: Record<Writer, string> = {
  sw: 'service worker',
  popup: 'popup',
};

const ACTION_TEXT: Record<WriteAction, string> = {
  'set-one': "await chrome.storage.local.set({ count: 43 })",
  'set-two': 'await chrome.storage.local.set({ count: 43, note: "hello" })',
  remove: "await chrome.storage.local.remove('count')",
};

// 每种操作下各上下文收到的 changes（区域固定 storage.local，前置状态 count = 42）
const CHANGES_TEXT: Record<WriteAction, string[]> = {
  'set-one': ['changes: { count: { oldValue: 42, newValue: 43 } }'],
  'set-two': [
    'changes: { count: { oldValue: 42, newValue: 43 },',
    '          note: { newValue: "hello" } }',
  ],
  remove: ['changes: { count: { oldValue: 42 } }'],
};

const CONTEXTS = ['sw', 'popup', 'cs'] as const;
type Context = (typeof CONTEXTS)[number];

const CONTEXT_LABEL: Record<Context, string> = {
  sw: 'service worker',
  popup: 'popup',
  cs: 'content script',
};

function snapshotFor(options: PropagationOptions): PropagationSnapshot {
  return {
    writerLabel: WRITER_LABEL[options.writer],
    onChangedCount: '3 个上下文 × 1 次',
    changeEntries:
      options.action === 'set-two' ? '2 个条目（一次事件）' : '1 个条目（一次事件）',
    writerNotified: '是',
  };
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  if (ctx.measureText(text).width <= maxWidth) {
    return [text];
  }
  const lines: string[] = [];
  let line = '';
  for (const ch of text) {
    if (line && ctx.measureText(line + ch).width > maxWidth) {
      lines.push(line);
      line = ch === ' ' ? '' : ch;
    } else {
      line += ch;
    }
  }
  if (line) {
    lines.push(line);
  }
  return lines;
}

export function createPropagationExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: PropagationSnapshot) => void,
): PropagationInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  let current: PropagationOptions = { writer: 'popup', action: 'set-one' };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(330, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const innerW = width - 24;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';

    // 顶部：t ≈ 0 的写入动作
    ctx.font = '11px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('写入方', 12, 18, 60);
    const labelW = ctx.measureText('写入方').width;
    ctx.font = '600 13px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = '#1d4ed8';
    ctx.fillText(WRITER_LABEL[current.writer], 12 + labelW + 10, 18);

    ctx.textAlign = 'right';
    ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('t ≈ 0', width - 12, 18);
    ctx.textAlign = 'left';

    ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillStyle = '#172033';
    ctx.fillText(ACTION_TEXT[current.action], 12, 44, innerW);

    // 三个接收上下文：每个都触发一次 onChanged，写入方自己也收到
    const rowTop = 68;
    const rowH = Math.max(80, (height - rowTop - 12) / 3);

    CONTEXTS.forEach((id, index) => {
      const y = rowTop + index * rowH;
      const isWriter = id === current.writer;

      ctx.fillStyle = isWriter ? '#eff5ff' : '#f8fafc';
      ctx.strokeStyle = isWriter ? '#b9ccff' : '#e2e8f0';
      ctx.lineWidth = 1;
      roundedRect(ctx, 12, y + 4, innerW, rowH - 10, 8);
      ctx.fill();
      ctx.stroke();

      // 行首：上下文名；写入方行直接带后缀标记
      const nameLabel = isWriter ? `${CONTEXT_LABEL[id]}（写入方）` : CONTEXT_LABEL[id];
      ctx.font = '600 13px ui-sans-serif, system-ui, sans-serif';
      ctx.fillStyle = '#172033';
      ctx.fillText(nameLabel, 24, y + 24, 150);

      // 名字右侧：onChanged 触发标记
      const nameW = Math.min(ctx.measureText(nameLabel).width, 150);
      ctx.font = '600 12px ui-sans-serif, system-ui, sans-serif';
      ctx.fillStyle = '#15803d';
      ctx.fillText('✓ onChanged', 24 + nameW + 14, y + 24, innerW - nameW - 60);

      // 行尾时间标注
      ctx.textAlign = 'right';
      ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('t ≈ 16 ms', width - 24, y + 24);
      ctx.textAlign = 'left';

      // changes 内容（按可用宽度折行，至多 3 行）
      ctx.font = '11.5px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillStyle = '#334155';
      let lineY = y + 44;
      let drawn = 0;
      for (const text of CHANGES_TEXT[current.action]) {
        for (const line of wrapText(ctx, text, innerW - 24)) {
          if (drawn >= 3) break;
          ctx.fillText(line, 24, lineY);
          lineY += 14;
          drawn += 1;
        }
      }
    });

    emit(snapshotFor(current));
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
