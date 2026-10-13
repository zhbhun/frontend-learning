/**
 * 范例介绍：同一个 Y.Doc（A）同时挂三条正交通道——IndexeddbPersistence（本地持久化，
 * db 名固定，刷新后恢复）、WebsocketProvider（星型同步，连公共 demo 服的随机房间）
 * 与 WebrtcProvider（网状同步，房间名存 localStorage，同一浏览器的标签页共享）。
 * 两个同步 Provider 传入同一个 Awareness 实例。另有一个只挂 WebSocket 的文档 B
 * 作对照端；A、B 的 WebSocket 都设 disableBc: true，保证 A↔B 的一致性只能来自
 * 服务器往返，而 WebRTC 的 BroadcastChannel 近路通道名与房间同名，互不冲突。
 * 输入：Controls 的「文档 A 内容」(text)、「WebSocket 通道」(ws)、「WebRTC 通道」(rtc)。
 * 预期：ws 开时 A 的编辑经服务器到达 B（「B 经服务器收到」计数增加）；任一通道组合下
 * 文档始终收敛；rtc 开着时再打开一个本页标签页，两端经 BroadcastChannel 近路互通
 * （「WebRTC 同伴」与「A 经 WebRTC 收到」增加，经接力宣告「在线成员 B 视角」也会增加）；
 * 每条非 IndexedDB 自身的 update 都会落库（「IndexedDB 已落库」），刷新页面后 A 恢复。
 * 依赖外网：ws 需 wss://demos.yjs.dev/ws 可达；rtc 的 RTC 连线需默认信令
 * wss://y-webrtc-eu.fly.dev 可达，但其 BC 近路完全离线可用。离线时 ws 停在
 * connecting / disconnected 并持续退避重连，不影响其余两条通道。
 * 阅读主线：createMeshingDemo → 三条通道的构造与事件监听（update 按 origin 计数）
 * → setWs / setRtc / setText（首次写入等 IndexedDB 恢复后再决定）→ draw。
 */
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { WebrtcProvider } from 'y-webrtc';
import { IndexeddbPersistence } from 'y-indexeddb';
import { Awareness } from 'y-protocols/awareness';

import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface MeshingDemoOptions {
  text: string;
  ws: boolean;
  rtc: boolean;
}

export interface MeshingDemoSnapshot {
  wsStatus: string;
  wsSynced: boolean;
  rtcOn: boolean;
  rtcPeers: number;
  idbSynced: boolean;
  idbStored: number;
  localUpdatesA: number;
  receivedB: number;
  rtcReceivedA: number;
  onlineA: number;
  onlineB: number;
  consistent: boolean;
  lastEvent: string;
}

export interface MeshingDemoInstance {
  update(options: MeshingDemoOptions): void;
  dispose(): void;
}

// WS 房间每页随机：房间名是公共服务器上的全局命名空间，随机后缀避免与
// 其他读者同房；跨标签页因此走不通——跨页同步只能来自 WebRTC 的 BC 近路。
const WS_URL = 'wss://demos.yjs.dev/ws';
const WS_ROOM = `cheatsheet-mesh-ws-${Math.random().toString(36).slice(2, 10)}`;

// IndexedDB 库名固定：持久化的意义就在于刷新后还能找回同一份数据。
const IDB_NAME = 'cheatsheet-meshing-doc';

// WebRTC 房间名存 localStorage：同一浏览器的多个标签页读到同一个房间，
// BC 近路才能互通；不同读者（不同浏览器）天然隔离。隐私模式等读写失败时
// 退化为随机房间（跨标签页演示不可用，其余不受影响）。
const RTC_ROOM = (() => {
  const KEY = 'cheatsheet-meshing:rtc-room';
  const fresh = `cheatsheet-mesh-rtc-${Math.random().toString(36).slice(2, 10)}`;
  try {
    const saved = window.localStorage.getItem(KEY);
    if (saved) {
      return saved;
    }
    window.localStorage.setItem(KEY, fresh);
    return fresh;
  } catch {
    return fresh;
  }
})();

export function createMeshingDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: MeshingDemoSnapshot) => void,
): MeshingDemoInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const g: CanvasRenderingContext2D = context;

  const docA = new Y.Doc();
  const textA = docA.getText('shared');
  const docB = new Y.Doc();
  const textB = docB.getText('shared');

  // 关键写法：两个同步 Provider 共享同一个 Awareness 实例——否则各自默认
  // 新建一个，同一份本地状态只在自己通道上可见，在线名单按通道分裂。
  const awarenessA = new Awareness(docA);

  // 持久化通道：构造即开始从 IndexedDB 恢复历史（origin 是它自己），此后每条
  // 非自身的 update 逐条落库。它没有 connect/disconnect，destroy() 是一次性的。
  const idbA = new IndexeddbPersistence(IDB_NAME, docA);

  // 同步通道 1（星型）：connect: false 把连接时机交给「WebSocket 通道」开关；
  // disableBc: true 关掉 ws 自带的同源近路，保证 A↔B 的一致性只能来自服务器。
  const wsA = new WebsocketProvider(WS_URL, WS_ROOM, docA, {
    awareness: awarenessA,
    connect: false,
    disableBc: true,
  });
  const wsB = new WebsocketProvider(WS_URL, WS_ROOM, docB, {
    connect: false,
    disableBc: true,
  });

  // 同步通道 2（网状）：构造即 connect()；room 在微任务里建立。同一进程内
  // 同名房间只能存在一个 WebrtcProvider（openRoom 硬性限制），所以对照端 B
  // 不挂 WebRTC——它的同伴在你打开的第二个本页标签页里。
  const rtcA = new WebrtcProvider(RTC_ROOM, docA, { awareness: awarenessA });

  let wsStatusA: string = 'disconnected';
  let wsStatusB: string = 'disconnected';
  let wsSyncedA = false;
  let idbSynced = false;
  let rtcPeersBc = 0;
  let rtcPeersRtc = 0;
  let localUpdatesA = 0;
  let idbStored = 0;
  let receivedB = 0;
  let rtcReceivedA = 0;
  let lastEvent = '尚未连接';
  let destroyed = false;

  // y-webrtc 的 room 异步建立，且其 _docUpdateHandler 不过滤 origin——room 即
  // 它合入远端 update 时的 origin。用函数判断，躲开 room 尚为 null 的窗口。
  const isRtcOrigin = (origin: unknown) =>
    rtcA.room !== null && origin === rtcA.room;

  wsA.on('status', ({ status }) => {
    wsStatusA = status;
    lastEvent = `WS(A) → ${status}`;
    draw();
  });
  wsB.on('status', ({ status }) => {
    wsStatusB = status;
    lastEvent = `WS(B) → ${status}`;
    draw();
  });
  wsA.on('sync', (state: boolean) => {
    wsSyncedA = state;
    if (state) {
      lastEvent = 'WS(A) 收到 SyncStep2，与服务器对齐';
    }
    draw();
  });

  rtcA.on('peers', ({ webrtcPeers, bcPeers }) => {
    rtcPeersRtc = webrtcPeers.length;
    rtcPeersBc = bcPeers.length;
    lastEvent = `WebRTC 同伴变化：RTC ${rtcPeersRtc} / BC ${rtcPeersBc}`;
    draw();
  });

  idbA.on('synced', () => {
    idbSynced = true;
    lastEvent = 'IndexedDB 本地历史已恢复';
    draw();
  });

  // 出站计数：A 本地产出的每条 update 会同时交给 ws 与 rtc 两个 Provider 转发，
  // 并被 idb 落库——一份编辑，三条通道各自独立消费。
  // 入站计数：ws 合入时 origin 是 wsA，rtc 合入时 origin 是 rtcA.room；
  // 同一 update 经多条通道到达时，第二次起 applyUpdate 静默跳过、不触发事件，
  // 所以计数不会重复——幂等性就是叠加成立的前提。
  docA.on('update', (_update: Uint8Array, origin: unknown) => {
    if (origin !== idbA) {
      idbStored += 1;
    }
    if (isRtcOrigin(origin)) {
      rtcReceivedA += 1;
    } else if (origin !== idbA && origin !== wsA) {
      localUpdatesA += 1;
    }
    draw();
  });
  docB.on('update', (_update: Uint8Array, origin: unknown) => {
    if (origin === wsB) {
      receivedB += 1;
    }
    draw();
  });

  // 在线成员读数：两个同步 Provider 转发的是同一个 awarenessA；B 用自己的
  // 默认 Awareness。两边都在 awareness 更新时重绘。
  awarenessA.on('update', draw);
  wsB.awareness.on('update', draw);

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

  let wsOn = false;

  function setWs(next: boolean) {
    if (next === wsOn) {
      return;
    }
    wsOn = next;
    if (next) {
      wsA.connect();
      wsB.connect();
    } else {
      wsA.disconnect();
      wsB.disconnect();
    }
    draw();
  }

  let rtcOn = true; // WebrtcProvider 构造即 connect()

  function setRtc(next: boolean) {
    if (next === rtcOn) {
      return;
    }
    rtcOn = next;
    if (next) {
      rtcA.connect();
      lastEvent = 'WebRTC 已接入（信令 + BroadcastChannel 发现同伴）';
    } else {
      rtcA.disconnect();
      // 注意：disconnect 会把共享 awareness 的本地状态置 null 并向剩余通道
      // 广播——B 视角里 A 立刻离线，直到下次本地状态变化重新宣告。
      lastEvent = 'WebRTC 已断开（本地 awareness 状态被置 null）';
    }
    draw();
  }

  // 首次写入推迟到 IndexedDB 恢复完成之后：有历史时不覆盖恢复的内容，
  // 没历史时写入控件默认值。之后控件值变化才写入。
  let latestText = '';
  let textWritten = false;
  idbA.whenSynced.then(() => {
    if (destroyed || textWritten) {
      return;
    }
    textWritten = true;
    if (textA.length === 0) {
      setText(latestText);
    }
    draw();
  });

  function snapshot(): MeshingDemoSnapshot {
    return {
      wsStatus: wsStatusA,
      wsSynced: wsSyncedA,
      rtcOn,
      rtcPeers: rtcPeersBc + rtcPeersRtc,
      idbSynced,
      idbStored,
      localUpdatesA,
      receivedB,
      rtcReceivedA,
      onlineA: awarenessA.getStates().size,
      onlineB: wsB.awareness.getStates().size,
      consistent: textA.toString() === textB.toString(),
      lastEvent,
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

  // 面板头部右侧的通道徽标：直观呈现「这个文档挂了哪几条通道、各自状态如何」。
  function drawBadges(
    xRight: number,
    y: number,
    badges: Array<[label: string, bg: string, fg: string]>,
  ) {
    g.font = '600 10px ui-sans-serif, system-ui, sans-serif';
    let x = xRight;
    for (let i = badges.length - 1; i >= 0; i -= 1) {
      const [label, bg, fg] = badges[i];
      const w = Math.ceil(g.measureText(label).width) + 14;
      x -= w;
      roundRectPath(x, y, w, 16, 8);
      g.fillStyle = bg;
      g.fill();
      g.fillStyle = fg;
      g.textAlign = 'center';
      g.fillText(label, x + w / 2, y + 12);
      g.textAlign = 'left';
      x -= 6;
    }
  }

  function drawPanel(
    x: number,
    top: number,
    width: number,
    bottom: number,
    text: string,
    label: string,
    badges: Array<[string, string, string]>,
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
    drawBadges(x + width - 12, top + 8, badges);

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

  function wsBadge(status: string, on: boolean): [string, string, string] {
    if (!on) {
      return ['WS', '#e2e8f0', '#94a3b8'];
    }
    return status === 'connected'
      ? ['WS', '#4f7cff', '#ffffff']
      : ['WS', '#d97706', '#ffffff'];
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(300, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    g.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    g.clearRect(0, 0, width, height);

    // 星型中心：y-websocket 服务器，房间内所有 WS 连接的中转点。
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
    g.fillText('wss://demos.yjs.dev/ws（随机房间）', cx, 47);
    g.textAlign = 'left';

    const panelTop = 100;
    const panelBottom = height - 116;
    const panelWidth = width / 2 - 16 - 44;
    drawPanel(16, panelTop, panelWidth, panelBottom, textA.toString(), '文档 A', [
      ['IDB', idbSynced ? '#059669' : '#d97706', '#ffffff'],
      wsBadge(wsStatusA, wsOn),
      ['RTC', rtcOn ? '#7c3aed' : '#e2e8f0', rtcOn ? '#ffffff' : '#94a3b8'],
    ]);
    drawPanel(
      width / 2 + 44,
      panelTop,
      panelWidth,
      panelBottom,
      textB.toString(),
      '文档 B',
      [wsBadge(wsStatusB, wsOn)],
    );

    drawLink(16 + panelWidth / 2, panelTop, cx - 80, 58, wsStatusA, wsSyncedA);
    drawLink(width / 2 + 44 + panelWidth / 2, panelTop, cx + 80, 58, wsStatusB, false);

    const { consistent } = snapshot();
    g.font = '600 14px ui-sans-serif, system-ui, sans-serif';
    g.fillStyle = consistent ? '#059669' : '#d97706';
    g.textAlign = 'center';
    g.fillText(
      consistent
        ? '两端一致 —— 三条通道叠加不改变文档语义'
        : '已分叉 —— 打开「WebSocket 通道」后自动追平',
      cx,
      height - 86,
    );

    g.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
    g.fillStyle = '#94a3b8';
    g.fillText(fitText(`WS 房间：${wsA.url}（每页随机）`, width - 32), cx, height - 62);
    g.fillText(
      fitText(`WebRTC 房间：${RTC_ROOM} · IndexedDB：${IDB_NAME}（均固定）`, width - 32),
      cx,
      height - 40,
    );
    g.fillText(
      fitText(
        '再开一个本页标签页 → 经 WebRTC 的 BroadcastChannel 近路互通；刷新页面 → A 从 IndexedDB 恢复',
        width - 32,
      ),
      cx,
      height - 18,
    );
    g.textAlign = 'left';

    emit(snapshot());
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options) {
      latestText = options.text;
      setWs(options.ws);
      setRtc(options.rtc);
      // 首次写入由 whenSynced 回调决定（恢复优先）；之后控件值变化才写入。
      if (textWritten && textA.toString() !== options.text) {
        setText(options.text);
      }
    },
    dispose() {
      destroyed = true;
      resizeObserver.disconnect();
      wsA.destroy();
      wsB.destroy();
      rtcA.destroy();
      void idbA.destroy();
      awarenessA.destroy();
      docA.destroy();
      docB.destroy();
    },
  };
}
