/**
 * 范例:文档 A 同时挂 IndexeddbPersistence(本地落盘)与一条手动 relay
 * (模拟网络 Provider)通往文档 B —— 离线闭环的最小形态。
 * 「连接 relay」开:两端逐条互转增量 update;关:relay 停摆,两端各自分叉,
 * A 的每次编辑照常落盘;重新打开时做一次 state vector + 差量握手
 * (与真实 Provider 的 SyncStep1 / SyncStep2 同一件事),两端追平,
 * 且合入 A 的远端 update 同样被落盘——本地库最终含完整历史。
 * 输入:Controls 的「文档 A 内容」(text)、「远端 B 内容」(textB,留空视为未动过)
 *      与「连接 relay」(connected)。
 * 预期:离线期间「A 落盘条目」随编辑增长而 B 不变;重连后两端一致,
 *      「自 relay 合入 A(同样落盘)」计数增加,「本次重连握手字节」显示
 *      sv + 差量的真实总字节。
 * 说明:库名随机、随实例销毁而清空(clearData)——本例聚焦重连合并,
 *      刷新恢复的证据见「落盘、重放与压缩」一例。
 * 阅读主线:createOfflineReconnect → setConnected(断/连 + 重连握手)
 *      → setTextA / setTextB → relay 转发与计数 → draw。
 */
import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';

import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface OfflineReconnectOptions {
  text: string;
  textB: string;
  connected: boolean;
}

export interface OfflineReconnectSnapshot {
  connected: boolean;
  localUpdatesA: number;
  mergedFromRelay: number;
  receivedB: number;
  entries: number;
  bytes: number;
  handshakeBytes: number;
  lenA: number;
  lenB: number;
  consistent: boolean;
  lastEvent: string;
}

export interface OfflineReconnectInstance {
  update(options: OfflineReconnectOptions): void;
  dispose(): void;
}

// 随机库名:本例只回答「离线编辑 → 重连合并」,不需要跨刷新保留;
// dispose 时 clearData 清空,不留垃圾库。
const DB_NAME = `cheatsheet-yidb-relay-${Math.random().toString(36).slice(2, 10)}`;

export function createOfflineReconnect(
  canvas: HTMLCanvasElement,
  emit: (snapshot: OfflineReconnectSnapshot) => void,
): OfflineReconnectInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const g: CanvasRenderingContext2D = context;

  const docA = new Y.Doc();
  const docB = new Y.Doc();
  const textA = docA.getText('t');
  const textB = docB.getText('t');
  const persistence = new IndexeddbPersistence(DB_NAME, docA);

  let connected = true;
  let localUpdatesA = 0;
  let mergedFromRelay = 0;
  let receivedB = 0;
  let handshakeBytes = 0;
  let entries = 0;
  let bytes = 0;
  let lastEvent = 'relay 已连接:在线期间逐条互转增量 update';
  // 控件当输入事件源而非状态镜像:只在上次 apply 的值变化时写入。
  // 否则重连合并会改变文档内容,下一次 apply 把控件旧值覆盖回去,合并结果被吃掉。
  // textB 的控件默认为空串,lastTextB 与之对齐:留空即未动过。
  let lastTextA: string | null = null;
  let lastTextB = '';
  let disposed = false;

  // 只读统计 A 的本地库,复用 persistence 已打开的连接。
  function refreshStat() {
    const db = persistence.db;
    if (!db) {
      return;
    }
    try {
      const req = db
        .transaction('updates', 'readonly')
        .objectStore('updates')
        .getAll();
      req.onsuccess = () => {
        const items = req.result as Uint8Array[];
        entries = items.length;
        bytes = items.reduce((n, u) => n + u.byteLength, 0);
        if (!disposed) {
          draw();
        }
      };
    } catch {
      // 连接已关闭(dispose 后)时静默。
    }
  }

  // relay 转发:只转发本地产生的 update(origin 不是 relay 也不是 persistence),
  // 回声靠 origin 过滤——与真实 Provider 同一招,见「文档更新与同步协议」。
  docA.on('update', (update: Uint8Array, origin: unknown) => {
    if (origin === 'relay') {
      // 合入自远端的 update:origin 不是 persistence 自身,同样被落盘。
      mergedFromRelay += 1;
    } else if (origin !== persistence) {
      localUpdatesA += 1;
      if (connected) {
        Y.applyUpdate(docB, update, 'relay');
      }
    }
    window.setTimeout(refreshStat, 150);
    draw();
  });
  docB.on('update', (update: Uint8Array, origin: unknown) => {
    if (origin === 'relay') {
      receivedB += 1;
    } else if (connected) {
      Y.applyUpdate(docA, update, 'relay');
    }
    draw();
  });

  // 重连握手:互换 state vector,各自按对方 sv 编码差量,互发合入。
  // 真实网络 Provider 在重连时自动做的就是这一步。
  function handshake() {
    const svA = Y.encodeStateVector(docA);
    const svB = Y.encodeStateVector(docB);
    const diffAB = Y.encodeStateAsUpdate(docA, svB);
    const diffBA = Y.encodeStateAsUpdate(docB, svA);
    handshakeBytes =
      svA.byteLength + svB.byteLength + diffAB.byteLength + diffBA.byteLength;
    Y.applyUpdate(docB, diffAB, 'relay');
    Y.applyUpdate(docA, diffBA, 'relay');
  }

  function setConnected(next: boolean) {
    if (next === connected) {
      return;
    }
    connected = next;
    if (next) {
      handshake();
      lastEvent = `重连握手完成:sv + 差量共 ${handshakeBytes} B,两端追平`;
    } else {
      lastEvent = '已断开(离线):两端各自分叉,A 的编辑照常落盘';
    }
    window.setTimeout(refreshStat, 150);
    draw();
  }

  function writeInto(doc: Y.Doc, current: Y.Text, text: string) {
    if (current.toString() === text) {
      return;
    }
    doc.transact(() => {
      current.delete(0, current.length);
      if (text.length > 0) {
        current.insert(0, text);
      }
    });
  }

  function setTextA(text: string) {
    if (text === lastTextA) {
      return;
    }
    lastTextA = text;
    writeInto(docA, textA, text);
  }

  function setTextB(text: string) {
    if (text === lastTextB) {
      return;
    }
    lastTextB = text;
    writeInto(docB, textB, text);
  }

  function snapshot(): OfflineReconnectSnapshot {
    return {
      connected,
      localUpdatesA,
      mergedFromRelay,
      receivedB,
      entries,
      bytes,
      handshakeBytes,
      lenA: textA.length,
      lenB: textB.length,
      consistent: textA.toString() === textB.toString(),
      lastEvent,
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
      flush(line === '' ? '(空)' : line);
    }
  }

  function drawPanel(
    x: number,
    top: number,
    width: number,
    bottom: number,
    text: string,
    label: string,
    foot: string,
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
    g.fillText(foot, x + 12, bottom - 14);
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(480, size.width);
    const height = Math.max(280, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    g.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    g.clearRect(0, 0, width, height);

    // relay 节点:手动模拟的网络 Provider。
    const cx = width / 2;
    g.fillStyle = '#f1f5f9';
    g.strokeStyle = '#94a3b8';
    g.beginPath();
    g.rect(cx - 110, 12, 220, 44);
    g.fill();
    g.stroke();
    g.textAlign = 'center';
    g.fillStyle = '#172033';
    g.font = '600 13px ui-sans-serif, system-ui, sans-serif';
    g.fillText('手动 relay', cx, 30);
    g.font = '10px ui-sans-serif, system-ui, sans-serif';
    g.fillStyle = '#64748b';
    g.fillText('模拟网络 Provider(在线转发 / 重连握手)', cx, 46);
    g.textAlign = 'left';

    const panelTop = 106;
    const panelBottom = height - 66;
    const panelWidth = width / 2 - 16 - 44;
    drawPanel(
      16,
      panelTop,
      panelWidth,
      panelBottom,
      textA.toString(),
      '文档 A(本地 + 落盘)',
      `${textA.length} 字符 · IndexedDB ${entries} 条 / ${bytes} B`,
    );
    drawPanel(
      width / 2 + 44,
      panelTop,
      panelWidth,
      panelBottom,
      textB.toString(),
      '文档 B(relay 远端)',
      `${textB.length} 字符`,
    );

    // A↔relay↔B 连线:在线实线,离线灰色虚线。
    const linkY = (panelTop + 106) / 2;
    g.strokeStyle = connected ? '#4f7cff' : '#cbd5e1';
    g.lineWidth = 2;
    g.setLineDash(connected ? [] : [5, 4]);
    g.beginPath();
    g.moveTo(16 + panelWidth / 2, panelTop);
    g.lineTo(cx - 80, 56);
    g.moveTo(width / 2 + 44 + panelWidth / 2, panelTop);
    g.lineTo(cx + 80, 56);
    g.stroke();
    g.setLineDash([]);
    g.font = '11px ui-sans-serif, system-ui, sans-serif';
    g.fillStyle = connected ? '#4f7cff' : '#94a3b8';
    g.textAlign = 'center';
    g.fillText(connected ? '已连接' : '离线', cx, linkY - 40);
    g.textAlign = 'left';

    const { consistent } = snapshot();
    g.font = '600 14px ui-sans-serif, system-ui, sans-serif';
    g.fillStyle = consistent ? '#059669' : '#d97706';
    g.textAlign = 'center';
    g.fillText(
      consistent
        ? '两端一致'
        : '已分叉 —— 重新打开「连接 relay」后差量追平',
      cx,
      height - 42,
    );
    g.font = '12px ui-sans-serif, system-ui, sans-serif';
    g.fillStyle = '#1d4ed8';
    g.fillText(lastEvent, cx, height - 20);
    g.textAlign = 'left';

    emit(snapshot());
  }

  const resizeObserver = createResizeObserver(canvas, draw);
  const statTimer = window.setInterval(refreshStat, 700);

  persistence.whenSynced.then(() => {
    if (!disposed) {
      refreshStat();
    }
  });

  return {
    update(options) {
      setConnected(options.connected);
      setTextA(options.text);
      setTextB(options.textB);
    },
    dispose() {
      disposed = true;
      resizeObserver.disconnect();
      window.clearInterval(statTimer);
      // 随机库名的临时库随实例清空;clearData 内部含 destroy。
      void persistence.clearData();
      docA.destroy();
      docB.destroy();
    },
  };
}
