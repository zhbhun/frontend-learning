/**
 * 范例介绍：模拟「断线期间两端各自编辑 → 恢复连接后状态向量双向对账、补传收敛」的数据面过程。
 * 模拟语义：真实部署的传输层是 WebSocket 服务器，文档页内无法稳定复现断线与退避重连
 * （连接状态机与时序模拟见 3.1 课实例）；这里用三个 Y.Doc 扮演三方：
 * localDoc（本地客户端，链路可断）、serverDoc（服务器房间文档，枢纽）、
 * peerDoc（远端同事，对服务器始终在线）。重连对账按真实同步协议语义复刻：
 * 以对方状态向量计算缺失更新再应用，对应 sync step 1 / sync step 2 的双向交换，
 * Y.applyUpdate 的 CRDT 合并与真实一致；断网为瞬时切换，不模拟退避等待。
 * 输入：「链路状态」切换 在线 / 断网 / disconnect()；「本地编辑」「远端同事编辑」
 * 每次修改作为一条编辑追加（一次事务、一条 update）。
 * 预期结果：断线期间两侧照常可编辑、互不可见，待补传与待下行计数增长；
 * 恢复连接后一次对账双向补传，本地、服务器、远端三方内容收敛一致。
 * 阅读主线：reconcile 的状态向量双向交换 → 各文档 update 转发规则（断线时不发送）→
 * setLink 的重连分支 → 底部读数核对收敛。
 */
import * as Y from 'yjs';

import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

/** 链路状态选择：在线 / 断网（自动重连）/ disconnect() 主动断开。 */
export type LinkChoice = 'online' | 'offline' | 'detached';

export interface CatchupOptions {
  link: LinkChoice;
  /** 本地编辑：每次变化追加为本地文档的一条新条目。 */
  localEdit: string;
  /** 远端同事编辑：每次变化追加为远端文档的一条新条目。 */
  peerEdit: string;
}

export interface CatchupEvent {
  text: string;
  tone: 'link' | 'edit' | 'sync';
}

export interface CatchupSnapshot {
  /** 链路状态的中文标签。 */
  link: '已连接' | '断网（自动重连中）' | '已断开（不重连）';
  /** 断线期间本地新增、待上行的条目数。 */
  localPending: number;
  /** 断线期间远端新增、待下行的条目数。 */
  remotePending: number;
  /** 最近一次重连对账的双向补传数量；null 表示尚未发生。 */
  lastCatchUp: { up: number; down: number } | null;
  localText: string;
  serverText: string;
  converged: boolean;
  events: CatchupEvent[];
}

export interface CatchupInstance {
  update(options: CatchupOptions): void;
  dispose(): void;
}

/** 共享文本类型的字段名。 */
const FIELD = 'entries';
/** 房间文档的初始条目：三方初始同步的公共底稿。 */
const BASE_ENTRY = '会议纪要';
/** 事件日志最多保留条数。 */
const MAX_EVENTS = 40;

export function createOfflineCatchup(
  canvas: HTMLCanvasElement,
  emit: (snapshot: CatchupSnapshot) => void,
): CatchupInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let options: CatchupOptions = { link: 'online', localEdit: '', peerEdit: '' };

  // 三方文档：真实部署里 serverDoc 在服务器上，peerDoc 在远端同事的浏览器里。
  const serverDoc = new Y.Doc();
  const localDoc = new Y.Doc();
  const peerDoc = new Y.Doc();

  let link: LinkChoice = 'online';
  let localPending = 0;
  let remotePending = 0;
  let lastCatchUp: { up: number; down: number } | null = null;
  let events: CatchupEvent[] = [];

  function log(text: string, tone: CatchupEvent['tone']): void {
    events.push({ text, tone });
    if (events.length > MAX_EVENTS) {
      events.shift();
    }
  }

  function entriesOf(doc: Y.Doc): string[] {
    return doc.getArray<string>(FIELD).toArray();
  }

  function joinedEntries(doc: Y.Doc): string {
    return entriesOf(doc).join(' / ');
  }

  /**
   * 与房间文档做一次状态向量双向对账。这正是重连后 sync step 1 / sync step 2
   * 的双向交换：下行补齐本地缺失（断线期间远端的编辑），
   * 上行补齐服务器缺失（本地离线期间的编辑）——provider 不缓存 update，
   * 内容始终在 Y.Doc 里，靠状态向量对账天然完整。
   */
  function reconcile(): { up: number; down: number } {
    const down = Y.encodeStateAsUpdate(serverDoc, Y.encodeStateVector(localDoc));
    const up = Y.encodeStateAsUpdate(localDoc, Y.encodeStateVector(serverDoc));
    Y.applyUpdate(localDoc, down, serverDoc);
    Y.applyUpdate(serverDoc, up, serverDoc);
    // 远端同事同样收敛本地离线期间的编辑
    Y.applyUpdate(peerDoc, up, serverDoc);
    return { up: localPending, down: remotePending };
  }

  // ---------- 各文档的转发规则：断线时不发送，恢复后由对账补齐 ----------

  // 本地文档：来自网络（origin 为 serverDoc）的不回传；断线时不上行。
  localDoc.on('update', (update: Uint8Array, origin: unknown) => {
    if (origin === serverDoc || link !== 'online') {
      return;
    }
    Y.applyUpdate(serverDoc, update, localDoc);
  });

  // 房间文档：把收到的更新转发给还没拥有它的那一方；
  // 对账交换产生的更新（origin 为 serverDoc）已由 reconcile 显式分发。
  serverDoc.on('update', (update: Uint8Array, origin: unknown) => {
    if (origin === serverDoc) {
      return;
    }
    if (origin !== peerDoc) {
      Y.applyUpdate(peerDoc, update, serverDoc);
    }
    if (link === 'online' && origin !== localDoc) {
      Y.applyUpdate(localDoc, update, serverDoc);
    }
  });

  // 远端文档：始终对服务器在线，编辑总是先汇入服务器。
  peerDoc.on('update', (update: Uint8Array, origin: unknown) => {
    if (origin === serverDoc) {
      return;
    }
    Y.applyUpdate(serverDoc, update, peerDoc);
  });

  // ---------- 编辑入口：断线期间照常产生 update 并就地应用 ----------

  function appendLocalEdit(text: string): void {
    appendEntry(localDoc, text);
    if (link === 'online') {
      log(`本地编辑「${text}」：实时上行`, 'edit');
    } else {
      // 与真实 provider 一致：断线不断文档，update 留在本地 Y.Doc 里
      localPending += 1;
      log(`本地编辑「${text}」：链路断开，update 留在本地待补传`, 'edit');
    }
  }

  function appendPeerEdit(text: string): void {
    appendEntry(peerDoc, text);
    if (link === 'online') {
      log(`远端编辑「${text}」：经服务器实时下行`, 'edit');
    } else {
      remotePending += 1;
      log(`远端编辑「${text}」：只汇入服务器，待本地重连后下行`, 'edit');
    }
  }

  // ---------- 链路切换：语义对应 disconnect / shouldConnect / 重连对账 ----------

  function setLink(next: LinkChoice): void {
    const previous = link;
    link = next;

    if (next === 'online') {
      if (previous === 'detached') {
        // disconnect() 之后没有任何自动尝试，恢复入口只有显式 connect()
        log('connect()：手动恢复连接', 'link');
      }
      log('重连成功：交换状态向量，双向对账', 'sync');
      const result = reconcile();
      lastCatchUp = result;
      localPending = 0;
      remotePending = 0;
      log(`补传完成：上行 ${result.up} 条 / 下行 ${result.down} 条`, 'sync');
      log('unsyncedChanges 归零，synced 触发', 'sync');
      return;
    }

    if (previous === 'online') {
      if (next === 'offline') {
        log('链路断开：status 回到 disconnected，自动重连开始（真实环境按退避进行）', 'link');
      } else {
        log('disconnect()：shouldConnect = false，停止自动重连', 'link');
      }
      return;
    }

    // 断开状态下切换断开方式
    if (next === 'detached') {
      log('disconnect()：取消在途重连计划', 'link');
    } else {
      log('connect()：网络仍断，连接失败，继续自动重连', 'link');
    }
  }

  function snapshot(): CatchupSnapshot {
    const localText = joinedEntries(localDoc);
    const serverText = joinedEntries(serverDoc);

    return {
      link:
        link === 'online'
          ? '已连接'
          : link === 'offline'
            ? '断网（自动重连中）'
            : '已断开（不重连）',
      localPending,
      remotePending,
      lastCatchUp,
      localText,
      serverText,
      converged: localText === serverText,
      events: events.slice(-3),
    };
  }

  // ---------- 以下为绘制外壳：状态变化时重绘的说明性视图，无动画循环 ----------

  const FONT_TITLE = '600 13px ui-sans-serif, system-ui, sans-serif';
  const FONT_BODY = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
  const FONT_LABEL = '12px ui-sans-serif, system-ui, sans-serif';

  const LINK_LABEL: Record<LinkChoice, string> = {
    online: '已连接',
    offline: '断网 · 自动重连中',
    detached: 'disconnect() · 已停止重连',
  };

  const LINK_COLOR: Record<LinkChoice, string> = {
    online: '#166534',
    offline: '#b45309',
    detached: '#b91c1c',
  };

  const LINK_BADGE_BG: Record<LinkChoice, string> = {
    online: '#e7f6ec',
    offline: '#fdf1e2',
    detached: '#fdeaea',
  };

  const TONE_COLOR: Record<CatchupEvent['tone'], string> = {
    link: '#b45309',
    edit: '#3b5bdb',
    sync: '#166534',
  };

  function wrapLines(text: string, maxWidth: number, maxLines: number): string[] {
    const lines: string[] = [];
    let current = '';
    for (const char of Array.from(text)) {
      const candidate = current + char;
      if (current && drawingContext.measureText(candidate).width > maxWidth) {
        lines.push(current);
        current = char;
        if (lines.length >= maxLines) {
          return lines;
        }
      } else {
        current = candidate;
      }
    }
    if (current.length > 0 && lines.length < maxLines) {
      lines.push(current);
    }
    return lines;
  }

  function roundRect(x: number, y: number, w: number, h: number, r: number): void {
    drawingContext.beginPath();
    drawingContext.moveTo(x + r, y);
    drawingContext.arcTo(x + w, y, x + w, y + h, r);
    drawingContext.arcTo(x + w, y + h, x, y + h, r);
    drawingContext.arcTo(x, y + h, x, y, r);
    drawingContext.arcTo(x, y, x + w, y, r);
    drawingContext.closePath();
  }

  function drawPanel(
    x: number,
    y: number,
    w: number,
    h: number,
    title: string,
    entries: string[],
  ): void {
    roundRect(x, y, w, h, 8);
    drawingContext.fillStyle = '#ffffff';
    drawingContext.fill();
    drawingContext.strokeStyle = '#dbe3f0';
    drawingContext.lineWidth = 1;
    drawingContext.stroke();

    drawingContext.fillStyle = '#172033';
    drawingContext.font = FONT_TITLE;
    drawingContext.fillText(title, x + 12, y + 22);
    drawingContext.strokeStyle = '#edf1f8';
    drawingContext.beginPath();
    drawingContext.moveTo(x + 10, y + 32);
    drawingContext.lineTo(x + w - 10, y + 32);
    drawingContext.stroke();

    drawingContext.font = FONT_BODY;
    if (entries.length === 0) {
      drawingContext.fillStyle = '#94a3b8';
      drawingContext.fillText('（空文档）', x + 12, y + 52);
      return;
    }

    const rowHeight = 17;
    const maxLines = Math.max(1, Math.floor((h - 48) / rowHeight));
    let used = 0;
    for (let index = 0; index < entries.length; index += 1) {
      if (used >= maxLines) {
        drawingContext.fillStyle = '#94a3b8';
        drawingContext.fillText(`…共 ${entries.length} 条`, x + 12, y + 52 + used * rowHeight);
        break;
      }
      const lines = wrapLines(entries[index], w - 24, maxLines - used);
      drawingContext.fillStyle = '#334155';
      lines.forEach((line, lineIndex) => {
        drawingContext.fillText(line, x + 12, y + 52 + (used + lineIndex) * rowHeight);
      });
      used += lines.length;
    }
  }

  function drawArrow(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    label: string,
    broken: boolean,
  ): void {
    drawingContext.save();
    drawingContext.strokeStyle = broken ? '#cbd5e1' : '#4f7cff';
    drawingContext.fillStyle = drawingContext.strokeStyle;
    drawingContext.lineWidth = 1.5;
    if (broken) {
      drawingContext.setLineDash([5, 4]);
    }
    drawingContext.beginPath();
    drawingContext.moveTo(x1, y1);
    drawingContext.lineTo(x2, y2);
    drawingContext.stroke();
    drawingContext.setLineDash([]);
    const tipX = x2 > x1 ? x2 : x1;
    const direction = x2 > x1 ? 1 : -1;
    drawingContext.beginPath();
    drawingContext.moveTo(tipX, y1);
    drawingContext.lineTo(tipX - 8 * direction, y1 - 4);
    drawingContext.lineTo(tipX - 8 * direction, y1 + 4);
    drawingContext.closePath();
    drawingContext.fill();
    drawingContext.restore();

    drawingContext.font = FONT_LABEL;
    drawingContext.fillStyle = broken ? '#94a3b8' : '#3b5bdb';
    const labelWidth = drawingContext.measureText(label).width;
    drawingContext.fillText(label, (x1 + x2) / 2 - labelWidth / 2, y1 - 8);
  }

  function draw(): void {
    const size = readCanvasSize(canvas);
    const width = Math.max(360, size.width);
    const height = Math.max(280, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const margin = 16;
    const centerGap = 140;
    const panelWidth = Math.max(150, Math.min(280, (width - margin * 2 - centerGap) / 2));
    const panelTop = 48;
    const logHeight = 70;
    const panelHeight = height - panelTop - logHeight - 10;

    drawPanel(margin, panelTop, panelWidth, panelHeight, '本地客户端 · Y.Doc', entriesOf(localDoc));
    drawPanel(
      width - margin - panelWidth,
      panelTop,
      panelWidth,
      panelHeight,
      '服务器房间 · Y.Doc',
      entriesOf(serverDoc),
    );

    // 中央：链路徽标
    const centerX = width / 2;
    const leftEdge = margin + panelWidth + 10;
    const rightEdge = width - margin - panelWidth - 10;
    drawingContext.font = FONT_BODY;
    const badgeLabel = LINK_LABEL[link];
    const badgeWidth = drawingContext.measureText(badgeLabel).width + 24;
    roundRect(centerX - badgeWidth / 2, 14, badgeWidth, 24, 12);
    drawingContext.fillStyle = LINK_BADGE_BG[link];
    drawingContext.fill();
    drawingContext.strokeStyle = LINK_COLOR[link];
    drawingContext.stroke();
    drawingContext.fillStyle = LINK_COLOR[link];
    drawingContext.fillText(
      badgeLabel,
      centerX - drawingContext.measureText(badgeLabel).width / 2,
      30,
    );

    // 双向箭头：上行（本地 → 服务器）与下行（服务器 → 本地）
    const upY = panelTop + 36;
    const downY = panelTop + 86;
    drawArrow(leftEdge, upY, rightEdge, upY, link === 'online' ? '实时上行' : '上行中断', link !== 'online');
    drawArrow(rightEdge, downY, leftEdge, downY, link === 'online' ? '实时下行' : '下行中断', link !== 'online');

    drawingContext.font = FONT_BODY;
    const pendingLabel =
      localPending === 0 && remotePending === 0
        ? '无待补传'
        : `待上行 ${localPending} 条 · 待下行 ${remotePending} 条`;
    drawingContext.fillStyle = '#64748b';
    drawingContext.fillText(
      pendingLabel,
      centerX - drawingContext.measureText(pendingLabel).width / 2,
      (upY + downY) / 2 + 18,
    );

    // 底部：最近事件与收敛状态
    const logTop = height - logHeight - 4;
    drawingContext.fillStyle = '#172033';
    drawingContext.font = FONT_TITLE;
    drawingContext.fillText('最近事件', margin, logTop + 10);
    const converged = joinedEntries(localDoc) === joinedEntries(serverDoc);
    drawingContext.fillStyle = converged ? '#166534' : '#9a3412';
    drawingContext.fillText(converged ? '两端内容一致' : '两端内容分叉', margin + 78, logTop + 10);

    drawingContext.font = FONT_BODY;
    events.slice(-3).forEach((event, index) => {
      drawingContext.fillStyle = TONE_COLOR[event.tone];
      drawingContext.fillText(`· ${event.text}`, margin, logTop + 30 + index * 16);
    });
  }

  // 初始同步：与重连对账同一条状态向量路径，本地与远端各自拿到房间底稿
  function runInitialSync(): void {
    appendEntry(serverDoc, BASE_ENTRY);
    const down = Y.encodeStateAsUpdate(serverDoc, Y.encodeStateVector(localDoc));
    Y.applyUpdate(localDoc, down, serverDoc);
    Y.applyUpdate(peerDoc, down, serverDoc);
    log(`初始同步：三方共享底稿「${BASE_ENTRY}」`, 'sync');
  }

  const resizeObserver = createResizeObserver(canvas, () => draw());

  runInitialSync();
  draw();
  emit(snapshot());

  return {
    update(next) {
      if (next.link !== options.link) {
        setLink(next.link);
      }
      if (next.localEdit !== options.localEdit && next.localEdit.length > 0) {
        appendLocalEdit(next.localEdit);
      }
      if (next.peerEdit !== options.peerEdit && next.peerEdit.length > 0) {
        appendPeerEdit(next.peerEdit);
      }
      options = { ...next };
      draw();
      emit(snapshot());
    },
    dispose() {
      localDoc.destroy();
      peerDoc.destroy();
      serverDoc.destroy();
      resizeObserver.disconnect();
    },
  };
}
