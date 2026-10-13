/**
 * 范例介绍：同一页面里的两个 Y.Doc 各挂一个 WebsocketProvider，连接官方公共
 * demo 服务器（wss://demos.yjs.dev/ws）的同一随机房间；两端都设
 * disableBc: true，关闭同页 BroadcastChannel 近路，保证观察到的一致性只能
 * 来自服务器往返。
 * 输入：Controls 的「文档 A 内容」(text)与「连接服务器」(connected)。
 * 预期：connected 时状态经历 connecting → connected，收到服务器的 SyncStep2
 * 后 synced=true，A 的文本经服务器同步到 B；断开后 B 停在旧内容，重新连接
 * 后经差量握手自动追平。离线或公共服务器不可达时，状态停在 connecting /
 * disconnected 并持续退避重连（「重连计数」读数持续增长）。
 * 阅读主线：createServerSync → 两个 provider 的事件监听（status / sync /
 * connection-close / connection-error）与 update 计数 → setConnected /
 * setText → draw。
 */
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface ServerSyncOptions {
  text: string;
  connected: boolean;
}

export interface ServerSyncSnapshot {
  statusA: string;
  statusB: string;
  syncedA: boolean;
  syncedB: boolean;
  reconnectsA: number;
  reconnectsB: number;
  localUpdatesA: number;
  receivedB: number;
  lenA: number;
  lenB: number;
  consistent: boolean;
  lastEvent: string;
  url: string;
}

export interface ServerSyncInstance {
  update(options: ServerSyncOptions): void;
  dispose(): void;
}

// 公共 demo 服务器仅供体验（官方标注禁止生产）；房间名带随机后缀，
// 避免与其他读者撞进同一房间——房间名是服务器上的全局命名空间。
const SERVER_URL = 'wss://demos.yjs.dev/ws';
const ROOM = `cheatsheet-yws-${Math.random().toString(36).slice(2, 10)}`;

export function createServerSync(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ServerSyncSnapshot) => void,
): ServerSyncInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const g: CanvasRenderingContext2D = context;

  const docA = new Y.Doc();
  const docB = new Y.Doc();
  const textA = docA.getText('shared');
  const textB = docB.getText('shared');

  // connect: false —— 连接时机完全交给「连接服务器」开关，便于观察完整事件序列。
  // disableBc: true —— 关掉同源 BroadcastChannel 近路，否则同页两端不经过
  // 服务器也能同步，网络证据就混了。
  const providerA = new WebsocketProvider(SERVER_URL, ROOM, docA, {
    connect: false,
    disableBc: true,
  });
  const providerB = new WebsocketProvider(SERVER_URL, ROOM, docB, {
    connect: false,
    disableBc: true,
  });

  let statusA = 'disconnected';
  let statusB = 'disconnected';
  let syncedA = false;
  let syncedB = false;
  let localUpdatesA = 0;
  let receivedB = 0;
  let lastEvent = '尚未连接';

  providerA.on('status', ({ status }) => {
    statusA = status;
    lastEvent = `A status → ${status}`;
    draw();
  });
  providerB.on('status', ({ status }) => {
    statusB = status;
    lastEvent = `B status → ${status}`;
    draw();
  });
  // sync 事件在收到服务器 SyncStep2 时以 true 触发、断开时以 false 触发；
  // 它只反映 WS 通道，BC 消息不影响 synced。
  providerA.on('sync', (state: boolean) => {
    syncedA = state;
    if (state) {
      lastEvent = 'A 收到 SyncStep2，synced=true';
    }
    draw();
  });
  providerB.on('sync', (state: boolean) => {
    syncedB = state;
    if (state) {
      lastEvent = 'B 收到 SyncStep2，synced=true';
    }
    draw();
  });
  providerA.on('connection-close', (event) => {
    // 本地主动断开或 30 秒无消息看门狗触发时，载荷 event 为 null。
    lastEvent =
      event === null
        ? 'A 连接关闭（本地主动或看门狗）'
        : `A 连接关闭（code ${event.code}）`;
    draw();
  });
  providerA.on('connection-error', () => {
    lastEvent = 'A 连接错误（浏览器随后会触发关闭）';
    draw();
  });

  // 本地 / 接收计数：A 本地产出的每条 update（origin 不是 provider）都会交给
  // provider 转发；provider 把远端 update 合入文档时，origin 正是 provider 自己。
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
    // delete + insert 包进一个事务，只产生一条 update。
    docA.transact(() => {
      textA.delete(0, textA.length);
      if (text.length > 0) {
        textA.insert(0, text);
      }
    });
    draw();
  }

  let connected = false;

  function setConnected(next: boolean) {
    if (next === connected) {
      return;
    }
    connected = next;
    if (next) {
      providerA.connect();
      providerB.connect();
    } else {
      providerA.disconnect();
      providerB.disconnect();
    }
    draw();
  }

  function snapshot(): ServerSyncSnapshot {
    return {
      statusA,
      statusB,
      syncedA,
      syncedB,
      reconnectsA: providerA.wsUnsuccessfulReconnects,
      reconnectsB: providerB.wsUnsuccessfulReconnects,
      localUpdatesA,
      receivedB,
      lenA: textA.length,
      lenB: textB.length,
      consistent: textA.toString() === textB.toString(),
      lastEvent,
      url: providerA.url,
    };
  }

  function roundRectPath(
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
  ) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
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

  function drawLink(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    status: string,
    synced: boolean,
  ) {
    const on = status === 'connected';
    g.strokeStyle = on ? '#4f7cff' : status === 'connecting' ? '#d97706' : '#cbd5e1';
    g.lineWidth = 2;
    g.setLineDash(on ? [] : [5, 4]);
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    g.stroke();
    g.setLineDash([]);

    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    g.font = '11px ui-sans-serif, system-ui, sans-serif';
    g.fillStyle = on ? '#4f7cff' : '#94a3b8';
    g.textAlign = 'center';
    g.fillText(synced ? `${status} · synced` : status, mx, my - 6);
    g.textAlign = 'left';
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
    const height = Math.max(260, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    g.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    g.clearRect(0, 0, width, height);

    // 服务器节点：房间内所有 WS 连接的中转点。
    const cx = width / 2;
    roundRectPath(cx - 110, 12, 220, 46, 8);
    g.fillStyle = '#f1f5f9';
    g.fill();
    g.strokeStyle = '#94a3b8';
    g.stroke();
    g.textAlign = 'center';
    g.fillStyle = '#172033';
    g.font = '600 13px ui-sans-serif, system-ui, sans-serif';
    g.fillText('y-websocket 服务器', cx, 30);
    g.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
    g.fillStyle = '#64748b';
    g.fillText('wss://demos.yjs.dev/ws（公共 demo）', cx, 47);
    g.textAlign = 'left';

    const panelTop = 108;
    const panelBottom = height - 66;
    const panelWidth = width / 2 - 16 - 44;
    drawPanel(16, panelTop, panelWidth, panelBottom, textA.toString(), '文档 A');
    drawPanel(
      width / 2 + 44,
      panelTop,
      panelWidth,
      panelBottom,
      textB.toString(),
      '文档 B',
    );

    drawLink(16 + panelWidth / 2, panelTop, cx - 80, 58, statusA, syncedA);
    drawLink(
      width / 2 + 44 + panelWidth / 2,
      panelTop,
      cx + 80,
      58,
      statusB,
      syncedB,
    );

    const { consistent } = snapshot();
    g.font = '600 14px ui-sans-serif, system-ui, sans-serif';
    g.fillStyle = consistent ? '#059669' : '#d97706';
    g.textAlign = 'center';
    g.fillText(
      consistent
        ? '两端一致（经服务器）'
        : '已分叉 —— 打开「连接服务器」后自动追平',
      cx,
      height - 40,
    );

    // 实际连接 URL = serverUrl + '/' + roomname（+ params），本例房间名带随机后缀。
    g.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
    g.fillStyle = '#94a3b8';
    g.fillText(fitText(providerA.url, width - 32), cx, height - 18);
    g.textAlign = 'left';

    emit(snapshot());
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options) {
      setConnected(options.connected);
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
