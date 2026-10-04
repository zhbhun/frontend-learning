/**
 * 范例介绍：两个入口 API 下 native messaging host 进程的生死时序。
 * 前置状态：host 已注册，且注册文件的 allowed_origins 命中本扩展 ID。
 * 主要操作：切换 Story 预设、调整往返轮数、勾选「host 提前退出」。
 * 预期结果：sendNativeMessage 每次调用都新起一个 host 进程，收到响应后进程即退；
 * connectNative 的进程活到端口销毁，期间多轮收发；host 提前退出时，发送方分别得到
 * Promise reject 与 port.onDisconnect + lastError。
 * 阅读主线：左泳道是扩展，右泳道是 host 进程；右泳道红条是进程存活区间，
 * 蓝色箭头是流经 stdin/stdout 的帧。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type LifecycleMode = 'send' | 'connect';

export interface LifecycleOptions {
  mode: LifecycleMode;
  rounds: number;
  disconnect: boolean;
  crash: boolean;
}

export interface LifecycleSnapshot {
  modeLabel: string;
  hostStarts: number;
  roundsLabel: string;
  outcome: string;
  process: string;
}

export interface LifecycleInstance {
  update(options: LifecycleOptions): void;
  dispose(): void;
}

type Row =
  | {
      kind: 'arrow';
      from: 'left' | 'right';
      label: string;
      sub?: string;
      dashed?: boolean;
      tone?: 'accent' | 'error';
      inChannel?: boolean;
    }
  | {
      kind: 'note';
      lane: 'left' | 'right';
      lines: string[];
      tone?: 'ok' | 'error';
      inChannel?: boolean;
    };

const INK = '#172033';
const MUTED = '#475569';
const ACCENT = '#4f7cff';
const OK = '#15803d';
const ERROR = '#b91c1c';
const LINE = '#94a3b8';

const LANES: [string[], string[]] = [
  ['扩展', 'popup / service worker'],
  ['native messaging host', '独立进程 · stdin/stdout'],
];

const HEAD_H = 64;
const FOOT_H = 40;

function buildRows(options: LifecycleOptions): Row[] {
  const { mode, rounds, disconnect, crash } = options;

  if (mode === 'send') {
    const rows: Row[] = [
      {
        kind: 'arrow',
        from: 'left',
        label: 'sendNativeMessage(host, { text: "hi" })',
        sub: '每次调用 → 新起一个 host 进程',
      },
      {
        kind: 'note',
        lane: 'right',
        lines: ['Chrome 启动 host 进程', 'argv[1] = chrome-extension://<ID>/'],
        inChannel: true,
      },
      { kind: 'arrow', from: 'left', label: 'stdin 帧', inChannel: true },
      {
        kind: 'note',
        lane: 'right',
        lines: ['host 读帧、处理、写响应帧'],
        inChannel: true,
      },
    ];
    if (crash) {
      rows.push(
        {
          kind: 'note',
          lane: 'right',
          lines: ['host 提前退出，stdout 管道断裂'],
          tone: 'error',
        },
        {
          kind: 'note',
          lane: 'left',
          lines: ['Promise reject：', 'Native host has exited.'],
          tone: 'error',
        },
      );
    } else {
      rows.push(
        {
          kind: 'arrow',
          from: 'right',
          label: 'stdout 帧（host 第一条消息即响应）',
          inChannel: true,
        },
        {
          kind: 'note',
          lane: 'left',
          lines: ['Promise resolve：{ echo: "hi" }'],
          tone: 'ok',
        },
        {
          kind: 'note',
          lane: 'right',
          lines: ['host 写完即可退出，进程结束'],
        },
      );
    }
    return rows;
  }

  const rows: Row[] = [
    {
      kind: 'arrow',
      from: 'left',
      label: 'port = connectNative(host)',
      sub: '一次连接 → 一个 host 进程',
    },
    {
      kind: 'note',
      lane: 'right',
      lines: ['Chrome 启动 host 进程', '端口存活期间进程保持运行'],
      inChannel: true,
    },
  ];
  for (let round = 1; round <= rounds; round += 1) {
    rows.push({
      kind: 'arrow',
      from: 'left',
      label: `port.postMessage 第 ${round} 轮`,
      inChannel: true,
    });
    rows.push({
      kind: 'arrow',
      from: 'right',
      label: `port.onMessage 第 ${round} 轮`,
      inChannel: true,
    });
  }
  if (crash) {
    rows.push(
      {
        kind: 'note',
        lane: 'right',
        lines: ['host 提前退出，stdout 管道断裂'],
        tone: 'error',
      },
      {
        kind: 'note',
        lane: 'left',
        lines: ['port.onDisconnect 触发', 'lastError: Native host has exited.'],
        tone: 'error',
      },
    );
  } else if (disconnect) {
    rows.push(
      { kind: 'note', lane: 'left', lines: ['port.disconnect()'] },
      {
        kind: 'note',
        lane: 'right',
        lines: ['Chrome 关闭 stdin', 'host 读到 EOF 后退出'],
      },
    );
  } else {
    rows.push({
      kind: 'note',
      lane: 'right',
      lines: ['端口保持连接', '进程继续运行，仍可收发'],
    });
  }
  return rows;
}

function snapshotFor(options: LifecycleOptions): LifecycleSnapshot {
  const { mode, rounds, disconnect, crash } = options;
  if (mode === 'send') {
    return {
      modeLabel: 'sendNativeMessage',
      hostStarts: 1,
      roundsLabel: '一问一答',
      outcome: crash ? 'reject：Native host has exited.' : 'resolve：{ echo: "hi" }',
      process: crash ? '异常退出' : '响应后退出',
    };
  }
  return {
    modeLabel: 'connectNative',
    hostStarts: 1,
    roundsLabel: `${rounds} 轮`,
    outcome: crash
      ? 'onDisconnect：lastError Native host has exited.'
      : disconnect
        ? 'disconnect 后端口关闭'
        : '端口保持连接',
    process: crash ? '异常退出' : disconnect ? '断开后退出' : '运行中',
  };
}

function rowHeight(row: Row): number {
  if (row.kind === 'note') {
    return 20 + row.lines.length * 15;
  }
  return row.sub ? 36 : 22;
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.closePath();
}

function drawSequence(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  rows: Row[],
) {
  const leftX = Math.max(96, Math.min(160, width * 0.2));
  const rightX = width - leftX;
  const laneWidth = Math.min(178, width - leftX - 24);

  context.clearRect(0, 0, width, height);

  LANES.forEach((lines, index) => {
    const laneX = index === 0 ? leftX : rightX;
    const boxX = laneX - laneWidth / 2;
    roundedRect(context, boxX, 10, laneWidth, 40, 6);
    context.fillStyle = 'rgba(255, 255, 255, 0.9)';
    context.strokeStyle = '#dbe3f0';
    context.fill();
    context.stroke();

    context.textAlign = 'center';
    context.fillStyle = INK;
    context.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    context.fillText(lines[0], laneX, 27);
    context.fillStyle = MUTED;
    context.font = '10.5px ui-monospace, SFMono-Regular, Menlo, monospace';
    context.fillText(lines[1], laneX, 42);
  });

  const natural = rows.reduce((sum, row) => sum + rowHeight(row), 0);
  const available = Math.max(80, height - HEAD_H - FOOT_H);
  const scale = Math.min(1, available / natural);

  const positions: number[] = [];
  let cursor = HEAD_H + 8;
  for (const row of rows) {
    const span = rowHeight(row) * scale;
    positions.push(cursor + span / 2);
    cursor += span;
  }
  const lifelineBottom = cursor + 8;

  context.save();
  context.strokeStyle = LINE;
  context.lineWidth = 1;
  context.setLineDash([5, 4]);
  for (const laneX of [leftX, rightX]) {
    context.beginPath();
    context.moveTo(laneX, HEAD_H - 10);
    context.lineTo(laneX, lifelineBottom);
    context.stroke();
  }
  context.restore();

  // 连续 inChannel 的行是进程/通道活跃区间：在右泳道上画红色进程存活条
  let runStart = -1;
  for (let index = 0; index <= rows.length; index += 1) {
    const active = index < rows.length && rows[index].inChannel === true;
    if (active && runStart < 0) {
      runStart = index;
    }
    if (!active && runStart >= 0) {
      const top = positions[runStart] - (rowHeight(rows[runStart]) * scale) / 2;
      const bottom =
        positions[index - 1] + (rowHeight(rows[index - 1]) * scale) / 2;
      for (const laneX of [leftX, rightX]) {
        context.fillStyle = 'rgba(185, 28, 28, 0.13)';
        context.strokeStyle = 'rgba(185, 28, 28, 0.4)';
        roundedRect(context, laneX - 4, top, 8, bottom - top, 3);
        context.fill();
        context.stroke();
      }
      runStart = -1;
    }
  }

  rows.forEach((row, index) => {
    const y = positions[index];
    if (row.kind === 'arrow') {
      const tone = row.tone === 'error' ? ERROR : ACCENT;
      const fromX = row.from === 'left' ? leftX + 7 : rightX - 7;
      const toX = row.from === 'left' ? rightX - 8 : leftX + 8;

      context.save();
      context.strokeStyle = tone;
      context.fillStyle = tone;
      context.lineWidth = 1.4;
      if (row.dashed) {
        context.setLineDash([5, 4]);
      }
      context.beginPath();
      context.moveTo(fromX, y);
      context.lineTo(toX, y);
      context.stroke();
      context.setLineDash([]);

      const direction = toX > fromX ? 1 : -1;
      context.beginPath();
      context.moveTo(toX, y);
      context.lineTo(toX - direction * 8, y - 4);
      context.lineTo(toX - direction * 8, y + 4);
      context.closePath();
      context.fill();

      context.font =
        row.label.length > 34
          ? '11px ui-sans-serif, system-ui, sans-serif'
          : '600 11.5px ui-sans-serif, system-ui, sans-serif';
      context.textAlign = 'center';
      context.fillStyle = INK;
      context.fillText(row.label, (leftX + rightX) / 2, y - 6);

      if (row.sub) {
        context.fillStyle = MUTED;
        context.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
        context.fillText(row.sub, (leftX + rightX) / 2, y + 14);
      }
      context.restore();
    } else {
      const lineHeight = 15;
      const boxHeight = row.lines.length * lineHeight + 12;
      const boxY = y - boxHeight / 2;

      context.save();
      context.font = '11.5px ui-sans-serif, system-ui, sans-serif';
      const textWidth = Math.max(
        ...row.lines.map((line) => context.measureText(line).width),
      );
      const boxWidth = Math.min(340, textWidth + 20);
      const laneX = row.lane === 'left' ? leftX : rightX;
      const boxX = Math.max(8, Math.min(laneX - boxWidth / 2, width - boxWidth - 8));

      roundedRect(context, boxX, boxY, boxWidth, boxHeight, 5);
      context.fillStyle = 'rgba(255, 255, 255, 0.92)';
      context.fill();
      context.strokeStyle = row.tone === 'error' ? ERROR : row.tone === 'ok' ? OK : '#dbe3f0';
      context.stroke();

      context.textAlign = 'center';
      context.fillStyle = row.tone === 'error' ? ERROR : row.tone === 'ok' ? OK : INK;
      row.lines.forEach((line, lineIndex) => {
        context.fillText(
          line,
          boxX + boxWidth / 2,
          boxY + 16 + lineIndex * lineHeight,
        );
      });
      context.restore();
    }
  });
}

export function createLifecycleExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: LifecycleSnapshot) => void,
): LifecycleInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: LifecycleOptions = {
    mode: 'send',
    rounds: 3,
    disconnect: true,
    crash: false,
  };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(420, size.width);
    const height = Math.max(300, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    drawSequence(drawingContext, width, height, buildRows(current));
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
