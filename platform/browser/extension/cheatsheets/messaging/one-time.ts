/**
 * 范例介绍：一次性消息从 sendMessage 到 sendResponse 的通道存活时序。
 * 前置状态：发送方发出 { type: "ping" }，接收方 onMessage 监听器决定怎样应答。
 * 主要操作：切换「响应方式」，调大「sendResponse 耗时」，时序图随之重绘。
 * 预期结果：未 return true 时通道随监听器返回立即关闭，稍后的 sendResponse
 * 响应丢失，发送方拿到 Chrome 真实的 reject 文案；return true 或同步应答则正常拿到响应。
 * 阅读主线：左泳道是发送方，右泳道是监听器，蓝色激活条是通道存活区间。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';
import { drawSequence, type SeqRow } from './sequence';

export type ResponseMode = 'sync' | 'keepalive' | 'no-keepalive';

export interface OneTimeOptions {
  mode: ResponseMode;
  delay: number;
}

export interface OneTimeSnapshot {
  modeLabel: string;
  listenerReturn: string;
  channel: string;
  outcome: string;
}

export interface OneTimeInstance {
  update(options: OneTimeOptions): void;
  dispose(): void;
}

const MODE_LABEL: Record<ResponseMode, string> = {
  sync: '同步 sendResponse',
  keepalive: '异步 + return true',
  'no-keepalive': '异步未 return true',
};

// 三种应答方式的行序列；监听器约在 8 ms 时执行，sync 应答约 16 ms 送达
function buildRows(mode: ResponseMode, delay: number): SeqRow[] {
  const rows: SeqRow[] = [
    {
      kind: 'arrow',
      from: 'left',
      label: 'sendMessage({ type: "ping" })',
      sub: 't = 0 ms',
    },
  ];

  if (mode === 'sync') {
    rows.push(
      {
        kind: 'note',
        lane: 'right',
        lines: ['onMessage 触发', '同步调用 sendResponse'],
        inChannel: true,
      },
      {
        kind: 'arrow',
        from: 'right',
        label: 'sendResponse({ time: "…" })',
        sub: 't ≈ 16 ms',
        inChannel: true,
      },
      { kind: 'note', lane: 'left', lines: ['await 拿到响应，通道关闭'], tone: 'ok' },
    );
  } else if (mode === 'keepalive') {
    rows.push(
      {
        kind: 'note',
        lane: 'right',
        lines: ['onMessage 触发', 'return true：通道保活'],
        inChannel: true,
      },
      {
        kind: 'arrow',
        from: 'right',
        label: 'sendResponse({ time: "…" })',
        sub: `t ≈ ${8 + delay} ms（等待 ${delay} ms）`,
        inChannel: true,
      },
      { kind: 'note', lane: 'left', lines: ['await 拿到响应，通道关闭'], tone: 'ok' },
    );
  } else {
    rows.push(
      {
        kind: 'note',
        lane: 'right',
        lines: ['onMessage 触发', '未 return true'],
        inChannel: true,
      },
      {
        kind: 'note',
        lane: 'right',
        lines: ['监听器返回，通道立即关闭（t ≈ 16 ms）'],
        tone: 'error',
      },
      {
        kind: 'arrow',
        from: 'right',
        label: 'sendResponse 被调用 → 响应丢失',
        sub: `t ≈ ${8 + delay} ms`,
        dashed: true,
        tone: 'error',
      },
      {
        kind: 'note',
        lane: 'left',
        lines: [
          'Promise reject：',
          'The message port closed before',
          'a response was received.',
        ],
        tone: 'error',
      },
    );
  }

  return rows;
}

function snapshotFor(mode: ResponseMode): OneTimeSnapshot {
  if (mode === 'sync') {
    return {
      modeLabel: MODE_LABEL.sync,
      listenerReturn: '（同步应答，无需返回值）',
      channel: '响应送达后关闭',
      outcome: 'resolve：{ time: "…" }',
    };
  }
  if (mode === 'keepalive') {
    return {
      modeLabel: MODE_LABEL.keepalive,
      listenerReturn: 'true',
      channel: '存活至响应送达',
      outcome: 'resolve：{ time: "…" }',
    };
  }
  return {
    modeLabel: MODE_LABEL['no-keepalive'],
    listenerReturn: 'undefined',
    channel: '监听器返回后立即关闭',
    outcome: 'reject：The message port closed…',
  };
}

export function createOneTimeExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: OneTimeSnapshot) => void,
): OneTimeInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: OneTimeOptions = { mode: 'keepalive', delay: 600 };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(260, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    drawSequence(
      drawingContext,
      width,
      height,
      [
        ['发送方', 'popup / service worker'],
        ['接收方', 'onMessage 监听器'],
      ],
      buildRows(current.mode, current.delay),
    );

    emit(snapshotFor(current.mode));
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
