/**
 * 范例介绍:同一页面创建两个 Awareness 实例——客户端 A「阿宁」(固定)与客户端 B
 * (由 Controls 操控),用 encodeAwarenessUpdate / applyAwarenessUpdate 手写双向中继,
 * 扮演 Provider 的 awareness 通道(真实项目里这段由 y-websocket 等 Provider 完成)。
 * 输入:Controls 的 name / color / cursorX / online。
 * 预期:B 在线时两端 states 各含两个客户端;改名字/颜色/光标在 A 端触发 updated;
 * 下线触发 removed、重新上线触发 added;读数对照 update(每次写入都触发)与
 * change(内容真变才触发),停留约 15 秒可见 B 的自动心跳只推高 update。
 * 阅读主线:createPresenceSync → 两个 Awareness + relay 中继 → applyOptions → draw。
 */
import * as Y from 'yjs';
import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
} from 'y-protocols/awareness';

import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface PresenceSyncOptions {
  name: string;
  color: string;
  cursorX: number;
  online: boolean;
}

export interface PresenceSyncSnapshot {
  onlineInA: number;
  statesInA: string;
  updatesA: number;
  changesA: number;
  lastEvent: string;
}

export interface PresenceSyncInstance {
  update(options: PresenceSyncOptions): void;
  dispose(): void;
}

/** awareness 事件载荷:本次发生变化的 clientID 列表。 */
interface AwarenessDelta {
  added: number[];
  updated: number[];
  removed: number[];
}

interface PresenceUser {
  name: string;
  color: string;
}

// 中继 origin 标记:对端 apply 回来的消息带此标记,遇到就跳过防回声,
// 否则 A→B 的同步会再触发 B→A。
const RELAY_ORIGIN = 'manual-relay';

export function createPresenceSync(
  canvas: HTMLCanvasElement,
  emit: (snapshot: PresenceSyncSnapshot) => void,
): PresenceSyncInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const g: CanvasRenderingContext2D = context;

  const docA = new Y.Doc();
  const docB = new Y.Doc();
  // clientID 借自 doc.clientID;构造时协议自动写入空状态 {},即「一创建就在线」。
  const awA = new Awareness(docA);
  const awB = new Awareness(docB);

  let updatesA = 0;
  let changesA = 0;
  let lastEvent = '(尚无事件)';

  const label = (clientID: number) =>
    clientID === awA.clientID
      ? 'A'
      : clientID === awB.clientID
        ? 'B'
        : String(clientID);

  function describe(type: string, delta: AwarenessDelta, origin: unknown) {
    const part = (title: string, ids: number[]) =>
      ids.length > 0 ? `${title}=[${ids.map(label).join(',')}]` : null;
    const body = [
      part('added', delta.added),
      part('updated', delta.updated),
      part('removed', delta.removed),
    ]
      .filter((text) => text !== null)
      .join(' ');
    return `${type} ${body} (origin: ${String(origin)})`;
  }

  // 中继:y-websocket 的 _awarenessUpdateHandler 就是这个模式——监听 update
  // 事件(每次写入都触发,含心跳与下线 null 帧),把变化的客户端全量编码转发。
  // 注意 removed 里的客户端必须一起编码:states 里已无其条目,编码结果为 null,
  // 「我下线了」正是靠这条 null 帧送达对端的。
  const relay = (from: Awareness, to: Awareness) => {
    from.on('update', (delta: AwarenessDelta, origin: unknown) => {
      if (origin === RELAY_ORIGIN) {
        return;
      }
      const changed = delta.added.concat(delta.updated, delta.removed);
      applyAwarenessUpdate(to, encodeAwarenessUpdate(from, changed), RELAY_ORIGIN);
    });
  };
  relay(awA, awB);
  relay(awB, awA);

  awA.on('update', (delta: AwarenessDelta, origin: unknown) => {
    updatesA += 1;
    lastEvent = describe('update', delta, origin);
    draw();
  });
  awA.on('change', (delta: AwarenessDelta, origin: unknown) => {
    changesA += 1;
    lastEvent = describe('change', delta, origin);
    draw();
  });

  // 中继与计数器就位后再写入初始状态,事件链完整可见。
  awA.setLocalState({ user: { name: '阿宁', color: '#4f7cff' }, cursor: { x: 25 } });

  function applyOptions(next: PresenceSyncOptions) {
    if (!next.online) {
      // setLocalState(null) 标记自己离线,states 里本端条目被删除;
      // 中继把 removed 编码为 null 帧送达 A。
      if (awB.getLocalState() !== null) {
        awB.setLocalState(null);
      }
      return;
    }
    if (awB.getLocalState() === null) {
      // 重新上线:全量写入。注意本地状态为 null 时 setLocalStateField 静默无效,
      // 所以必须先走 setLocalState。
      awB.setLocalState({
        user: { name: next.name, color: next.color },
        cursor: { x: next.cursorX },
      });
      return;
    }
    // 在线期间的常规更新:单字段合并,未提及的字段保留。
    awB.setLocalStateField('user', { name: next.name, color: next.color });
    awB.setLocalStateField('cursor', { x: next.cursorX });
  }

  function userOf(state: unknown): PresenceUser | null {
    if (typeof state !== 'object' || state === null) {
      return null;
    }
    const user = (state as { user?: unknown }).user;
    if (typeof user !== 'object' || user === null) {
      return null;
    }
    const { name, color } = user as { name?: unknown; color?: unknown };
    if (typeof name !== 'string' || typeof color !== 'string') {
      return null;
    }
    return { name, color };
  }

  function cursorXOf(state: unknown): number | null {
    if (typeof state !== 'object' || state === null) {
      return null;
    }
    const cursor = (state as { cursor?: unknown }).cursor;
    if (typeof cursor !== 'object' || cursor === null) {
      return null;
    }
    const { x } = cursor as { x?: unknown };
    return typeof x === 'number' ? x : null;
  }

  function drawPanel(
    x: number,
    top: number,
    width: number,
    bottom: number,
    self: Awareness,
  ) {
    g.fillStyle = '#ffffff';
    g.strokeStyle = '#cbd5e1';
    g.beginPath();
    g.rect(x, top, width, bottom - top);
    g.fill();
    g.stroke();

    // 在线列表:直接渲染本端 states 全表(含自己)。
    let rowY = top + 26;
    self.getStates().forEach((state, clientID) => {
      const user = userOf(state);
      if (!user) {
        return;
      }
      g.fillStyle = user.color;
      g.beginPath();
      g.arc(x + 20, rowY - 4, 5, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#172033';
      g.font = '13px ui-sans-serif, system-ui, sans-serif';
      const suffix = clientID === self.clientID ? '(我)' : '';
      g.fillText(`${user.name} ${suffix}`, x + 32, rowY);
      rowY += 20;
    });

    // 编辑区:渲染「其他端」的光标。
    const areaTop = top + 64;
    const areaBottom = bottom - 12;
    const areaX = x + 12;
    const areaWidth = width - 24;
    g.fillStyle = '#f1f5f9';
    g.fillRect(areaX, areaTop, areaWidth, areaBottom - areaTop);

    let remoteCursors = 0;
    self.getStates().forEach((state, clientID) => {
      if (clientID === self.clientID) {
        return;
      }
      const user = userOf(state);
      const cursorX = cursorXOf(state);
      if (!user || cursorX === null) {
        return;
      }
      remoteCursors += 1;
      const caretX = areaX + (cursorX / 100) * areaWidth;
      g.strokeStyle = user.color;
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(caretX, areaTop + 8);
      g.lineTo(caretX, areaBottom - 8);
      g.stroke();
      g.lineWidth = 1;
      g.fillStyle = user.color;
      g.font = '11px ui-sans-serif, system-ui, sans-serif';
      g.fillText(user.name, Math.min(caretX + 5, areaX + areaWidth - 40), areaTop + 18);
    });

    if (remoteCursors === 0) {
      g.fillStyle = '#94a3b8';
      g.font = '12px ui-sans-serif, system-ui, sans-serif';
      g.fillText('(无其他在线客户端)', areaX + 12, (areaTop + areaBottom) / 2);
    }
  }

  function snapshot(): PresenceSyncSnapshot {
    return {
      onlineInA: awA.getStates().size,
      statesInA: `[${Array.from(awA.getStates().keys()).map(label).join(', ')}]`,
      updatesA,
      changesA,
      lastEvent,
    };
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(280, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    g.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    g.clearRect(0, 0, width, height);

    const panelTop = 56;
    const panelBottom = height - 104;
    const panelWidth = width / 2 - 20 - 30;

    drawPanel(20, panelTop, panelWidth, panelBottom, awA);
    drawPanel(width / 2 + 30, panelTop, panelWidth, panelBottom, awB);

    // 中间的双向箭头代表 awareness 通道(本范例中即 relay 函数)。
    const midY = (panelTop + panelBottom) / 2;
    g.strokeStyle = '#4f7cff';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(width / 2 - 22, midY);
    g.lineTo(width / 2 + 22, midY);
    g.stroke();
    g.lineWidth = 1;
    g.fillStyle = '#4f7cff';
    g.beginPath();
    g.moveTo(width / 2 + 22, midY);
    g.lineTo(width / 2 + 12, midY - 5);
    g.lineTo(width / 2 + 12, midY + 5);
    g.closePath();
    g.fill();
    g.beginPath();
    g.moveTo(width / 2 - 22, midY);
    g.lineTo(width / 2 - 12, midY - 5);
    g.lineTo(width / 2 - 12, midY + 5);
    g.closePath();
    g.fill();
    g.font = '11px ui-sans-serif, system-ui, sans-serif';
    g.textAlign = 'center';
    g.fillText('awareness', width / 2, midY - 10);
    g.fillText('update', width / 2, midY + 18);
    g.textAlign = 'left';

    emit(snapshot());
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options) {
      applyOptions(options);
      draw();
    },
    dispose() {
      resizeObserver.disconnect();
      awA.destroy();
      awB.destroy();
      docA.destroy();
      docB.destroy();
    },
  };
}
