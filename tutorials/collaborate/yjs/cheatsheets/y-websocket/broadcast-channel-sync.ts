/**
 * 范例介绍：两个 Y.Doc 各挂一个以 connect: false 创建的 WebsocketProvider，
 * 只用 connectBc() 接入 BroadcastChannel——同一个「服务器地址 + 房间名」下的
 * 同源标签页 / 实例不经任何网络直接互同步，跑的是与 WebSocket 通道完全相同的
 * 消息协议（SyncStep1 / SyncStep2 / Update + awareness）。
 * 输入：Controls 的「文档 A 内容」(text)与「BroadcastChannel 同步」(bc)。
 * 预期：bc 开时 A 的文本直达 B；关闭后 B 停在旧内容，重新开启时经 BC 上的
 * 同步握手自动追平。全程零网络，离线也能运行。
 * 阅读主线：createBroadcastChannelSync → setBc（connectBc / disconnectBc）
 * → setText → draw。
 */
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface BroadcastChannelSyncOptions {
  text: string;
  bc: boolean;
}

export interface BroadcastChannelSyncSnapshot {
  bcA: boolean;
  bcB: boolean;
  localUpdatesA: number;
  receivedB: number;
  lenA: number;
  lenB: number;
  consistent: boolean;
  channel: string;
}

export interface BroadcastChannelSyncInstance {
  update(options: BroadcastChannelSyncOptions): void;
  dispose(): void;
}

// serverUrl 只参与拼 BC 通道名（bcChannel = serverUrl + '/' + roomname）；
// connect: false 下全程不会建立任何 WebSocket 连接。
const SERVER_URL = 'wss://offline.invalid';
const ROOM = `cheatsheet-yws-bc-${Math.random().toString(36).slice(2, 10)}`;

export function createBroadcastChannelSync(
  canvas: HTMLCanvasElement,
  emit: (snapshot: BroadcastChannelSyncSnapshot) => void,
): BroadcastChannelSyncInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const g: CanvasRenderingContext2D = context;

  const docA = new Y.Doc();
  const docB = new Y.Doc();
  const textA = docA.getText('shared');
  const textB = docB.getText('shared');

  // connect: false —— 不碰 WebSocket；BC 通道由「BroadcastChannel 同步」开关
  // 通过 connectBc() / disconnectBc() 单独控制。
  const providerA = new WebsocketProvider(SERVER_URL, ROOM, docA, {
    connect: false,
  });
  const providerB = new WebsocketProvider(SERVER_URL, ROOM, docB, {
    connect: false,
  });

  let localUpdatesA = 0;
  let receivedB = 0;

  docA.on('update', (_update: Uint8Array, origin: unknown) => {
    if (origin !== providerA) {
      localUpdatesA += 1;
      draw();
    }
  });
  docB.on('update', (_update: Uint8Array, origin: unknown) => {
    if (origin === providerB) {
      receivedB += 1;
    }
    draw();
  });

  function setText(text: string) {
    if (textA.toString() === text) {
      return;
    }
    docA.transact(() => {
      textA.delete(0, textA.length);
      if (text.length > 0) {
        textA.insert(0, text);
      }
    });
    draw();
  }

  let bcOn = false;

  function setBc(next: boolean) {
    if (next === bcOn) {
      return;
    }
    bcOn = next;
    if (next) {
      // connectBc 会向通道发 SyncStep1 + SyncStep2 + queryAwareness +
      // 本地 awareness 状态四条消息，两端随即在 BC 上完成握手。
      providerA.connectBc();
      providerB.connectBc();
    } else {
      providerA.disconnectBc();
      providerB.disconnectBc();
    }
    draw();
  }

  function snapshot(): BroadcastChannelSyncSnapshot {
    return {
      bcA: providerA.bcconnected,
      bcB: providerB.bcconnected,
      localUpdatesA,
      receivedB,
      lenA: textA.length,
      lenB: textB.length,
      consistent: textA.toString() === textB.toString(),
      channel: providerA.bcChannel,
    };
  }

  function drawWrappedText(
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
    maxLines: number,
  ) {
    g.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
    g.fillStyle = '#172033';
    let line = '';
    let cy = y;
    let drawn = 0;
    const flush = (content: string) => {
      g.fillText(content, x, cy);
      cy += lineHeight;
      drawn += 1;
    };
    for (const ch of text) {
      if (g.measureText(line + ch).width > maxWidth && line !== '') {
        if (drawn === maxLines - 1) {
          flush(`${line} …`);
          return;
        }
        flush(line);
        line = ch;
      } else {
        line += ch;
      }
    }
    if (line !== '' || drawn === 0) {
      flush(line === '' ? '（空）' : line);
    }
  }

  function drawPanel(
    x: number,
    top: number,
    width: number,
    bottom: number,
    text: string,
    label: string,
  ) {
    g.fillStyle = '#ffffff';
    g.strokeStyle = '#cbd5e1';
    g.beginPath();
    g.rect(x, top, width, bottom - top);
    g.fill();
    g.stroke();

    g.font = '11px ui-sans-serif, system-ui, sans-serif';
    g.fillStyle = '#64748b';
    g.fillText(label, x + 12, top + 18);

    const maxLines = Math.max(1, Math.floor((bottom - top - 66) / 20));
    drawWrappedText(text, x + 12, top + 44, width - 24, 20, maxLines);

    g.font = '12px ui-sans-serif, system-ui, sans-serif';
    g.fillStyle = '#64748b';
    g.fillText(`${text.length} 字符`, x + 12, bottom - 14);
  }

  function fitText(text: string, maxWidth: number): string {
    if (g.measureText(text).width <= maxWidth) {
      return text;
    }
    let out = text;
    while (out.length > 0 && g.measureText(`${out} …`).width > maxWidth) {
      out = out.slice(0, -1);
    }
    return `${out} …`;
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(240, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    g.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    g.clearRect(0, 0, width, height);

    const panelTop = 48;
    const panelBottom = height - 72;
    const panelWidth = width / 2 - 20 - 30;
    drawPanel(20, panelTop, panelWidth, panelBottom, textA.toString(), '文档 A');
    drawPanel(
      width / 2 + 30,
      panelTop,
      panelWidth,
      panelBottom,
      textB.toString(),
      '文档 B',
    );

    // 两面板之间的直连箭头：BC 通道不经过任何服务器。
    const midY = (panelTop + panelBottom) / 2;
    const on = providerA.bcconnected && providerB.bcconnected;
    g.strokeStyle = on ? '#4f7cff' : '#cbd5e1';
    g.lineWidth = 2;
    g.setLineDash(on ? [] : [5, 4]);
    g.beginPath();
    g.moveTo(width / 2 - 22, midY);
    g.lineTo(width / 2 + 14, midY);
    g.stroke();
    g.setLineDash([]);
    if (on) {
      g.fillStyle = '#4f7cff';
      g.beginPath();
      g.moveTo(width / 2 + 22, midY);
      g.lineTo(width / 2 + 12, midY - 5);
      g.lineTo(width / 2 + 12, midY + 5);
      g.closePath();
      g.fill();
    }
    g.font = '11px ui-sans-serif, system-ui, sans-serif';
    g.fillStyle = on ? '#4f7cff' : '#94a3b8';
    g.textAlign = 'center';
    g.fillText('BroadcastChannel', width / 2, midY - 12);
    g.fillText(on ? '同源直达' : '已断开', width / 2, midY + 22);
    g.textAlign = 'left';

    const { consistent } = snapshot();
    g.font = '600 14px ui-sans-serif, system-ui, sans-serif';
    g.fillStyle = consistent ? '#059669' : '#d97706';
    g.textAlign = 'center';
    g.fillText(
      consistent
        ? '两端一致（未经过任何网络）'
        : '已分叉 —— 打开「BroadcastChannel 同步」后自动追平',
      width / 2,
      height - 42,
    );

    // BC 通道名 = serverUrl + '/' + roomname，不含 params。
    g.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
    g.fillStyle = '#94a3b8';
    g.fillText(fitText(`通道：${providerA.bcChannel}`, width - 32), width / 2, height - 18);
    g.textAlign = 'left';

    emit(snapshot());
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options) {
      setBc(options.bc);
      setText(options.text);
    },
    dispose() {
      resizeObserver.disconnect();
      providerA.destroy();
      providerB.destroy();
      docA.destroy();
      docB.destroy();
    },
  };
}
