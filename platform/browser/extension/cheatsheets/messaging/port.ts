/**
 * 范例介绍：长连接 Port 从 connect 到断开（或保持开启）的完整时序。
 * 前置状态：发送方以端口名 "chat" 建立连接，接收方 onConnect 接管端口。
 * 主要操作：调整「往返轮数」，开关「发送方调用 port.disconnect()」。
 * 预期结果：同一条端口上成对出现双向 postMessage，通道不重开；调用
 * disconnect 后对端收到 onDisconnect，不断开则端口保持开启等待下一轮。
 * 阅读主线：蓝色激活条覆盖整个端口存活期，对比一次性消息「一答即关」。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';
import { drawSequence, type SeqRow } from './sequence';

export interface PortOptions {
  rounds: number;
  disconnect: boolean;
}

export interface PortSnapshot {
  portLabel: string;
  rounds: number;
  events: string;
  finalState: string;
}

export interface PortInstance {
  update(options: PortOptions): void;
  dispose(): void;
}

function buildRows(rounds: number, disconnect: boolean): SeqRow[] {
  const rows: SeqRow[] = [
    { kind: 'arrow', from: 'left', label: 'connect({ name: "chat" })', inChannel: true },
    {
      kind: 'note',
      lane: 'right',
      lines: ['onConnect(port)', '按 port.name === "chat" 处理'],
      inChannel: true,
    },
  ];

  for (let round = 1; round <= rounds; round++) {
    rows.push(
      {
        kind: 'arrow',
        from: 'left',
        label: `port.postMessage(第 ${round} 问)`,
        inChannel: true,
      },
      {
        kind: 'arrow',
        from: 'right',
        label: `port.postMessage(第 ${round} 答)`,
        inChannel: true,
      },
    );
  }

  if (disconnect) {
    rows.push(
      { kind: 'arrow', from: 'left', label: 'port.disconnect()' },
      { kind: 'note', lane: 'right', lines: ['onDisconnect 触发，收尾清理'] },
      { kind: 'note', lane: 'left', lines: ['端口已关闭'], tone: 'ok' },
    );
  } else {
    rows.push({
      kind: 'note',
      lane: 'right',
      lines: ['通道保持开启，等待下一轮 postMessage'],
      tone: 'accent',
      inChannel: true,
    });
  }

  return rows;
}

function snapshotFor(rounds: number, disconnect: boolean): PortSnapshot {
  return {
    portLabel: "connect({ name: 'chat' })",
    rounds,
    events: `connect → onConnect → postMessage ×${rounds * 2}${
      disconnect ? ' → disconnect → onDisconnect' : '（保持开启）'
    }`,
    finalState: disconnect ? '已断开，对端收到 onDisconnect' : '保持开启，两端可继续收发',
  };
}

export function createPortExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: PortSnapshot) => void,
): PortInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: PortOptions = { rounds: 3, disconnect: true };

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
        ['接收方', 'onConnect 监听器'],
      ],
      buildRows(current.rounds, current.disconnect),
    );

    emit(snapshotFor(current.rounds, current.disconnect));
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
