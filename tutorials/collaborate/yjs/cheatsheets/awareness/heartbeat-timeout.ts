/**
 * 范例介绍:验证 awareness 的存活机制——心跳自动续期与 30 秒过期(outdatedTimeout)。
 * 两个 Awareness 实例(A 观察 B)。协议内部每 outdatedTimeout/10(3 秒)检查一轮:
 * 本端状态 15 秒(outdatedTimeout/2)未广播就自动续期——即心跳,origin 'local',
 * 内容不变,所以对端只触发 update、不触发 change;对端 30 秒无消息就由检查循环
 * removeAwarenessStates(..., 'timeout') 移除。
 * 输入:Controls 的 relay(中继连接)、silenceA(A 未收到 B 消息的秒数)、
 * silenceB(B 距上次心跳的秒数)。后两者拨回协议内部的 meta.lastUpdated 时间戳
 * 来快进等待;续期与移除动作仍由协议自身的检查循环执行,非范例模拟。
 * 预期:silenceB ≥ 15 → 数秒内 B 自动心跳;silenceA ≥ 30 → 数秒内 B 从 A 的
 * states 消失(origin 'timeout');中继保持开启时,B 最迟约 15 秒后被自身心跳带回。
 * 阅读主线:createHeartbeatTimeout → relay 中继 → applyOptions 拨回时间戳 →
 * 渲染循环读出心跳 / 沉默计时。
 */
import * as Y from 'yjs';
import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
  outdatedTimeout,
} from 'y-protocols/awareness';

import {
  createRenderLoop,
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface HeartbeatTimeoutOptions {
  relay: boolean;
  silenceA: number;
  silenceB: number;
}

export interface HeartbeatTimeoutSnapshot {
  aSeesB: string;
  heartbeats: string;
  timeoutsA: string;
  updatesChangesA: string;
  nextHeartbeat: string;
  lastEventA: string;
}

export interface HeartbeatTimeoutInstance {
  update(options: HeartbeatTimeoutOptions): void;
  dispose(): void;
}

/** awareness 事件载荷:本次发生变化的 clientID 列表。 */
interface AwarenessDelta {
  added: number[];
  updated: number[];
  removed: number[];
}

const RELAY_ORIGIN = 'manual-relay';

export function createHeartbeatTimeout(
  canvas: HTMLCanvasElement,
  emit: (snapshot: HeartbeatTimeoutSnapshot) => void,
): HeartbeatTimeoutInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const g: CanvasRenderingContext2D = context;

  const docA = new Y.Doc();
  const docB = new Y.Doc();
  const awA = new Awareness(docA);
  const awB = new Awareness(docB);

  let relayOn = true;
  let heartbeats = 0;
  let timeoutsA = 0;
  let updatesA = 0;
  let changesA = 0;
  let lastEventA = '(尚无事件)';
  let lastHeartbeatAt = 0;

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

  const relay = (from: Awareness, to: Awareness) => {
    from.on('update', (delta: AwarenessDelta, origin: unknown) => {
      if (origin === RELAY_ORIGIN || !relayOn) {
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
    // 超时移除由 A 实例自己的检查循环触发,origin 固定为 'timeout'。
    if (origin === 'timeout' && delta.removed.includes(awB.clientID)) {
      timeoutsA += 1;
    }
    lastEventA = describe('update', delta, origin);
    draw();
  });
  awA.on('change', (delta: AwarenessDelta, origin: unknown) => {
    changesA += 1;
    lastEventA = describe('change', delta, origin);
    draw();
  });

  // 初始状态写入完成后再挂心跳计数:B 的内容从不修改,
  // 之后 origin 'local' 且 updated 含自己的 update 只可能来自心跳续期。
  awA.setLocalState({ user: { name: '阿宁', color: '#4f7cff' } });
  awB.setLocalState({ user: { name: '小柏', color: '#e25c5c' } });
  awB.on('update', (delta: AwarenessDelta, origin: unknown) => {
    if (origin === 'local' && delta.updated.includes(awB.clientID)) {
      heartbeats += 1;
      lastHeartbeatAt = Date.now();
    }
  });

  function applyOptions(next: HeartbeatTimeoutOptions) {
    relayOn = next.relay;
    // 快进「A 眼中 B 的沉默时长」:拨回 A 端记录的 B.lastUpdated。
    // ≥30 秒后,A 的检查循环(每 3 秒一轮)按超时移除 B。
    const metaBInA = awA.meta.get(awB.clientID);
    if (metaBInA) {
      metaBInA.lastUpdated = Date.now() - next.silenceA * 1000;
    }
    // 快进「B 距上次心跳的时长」:拨回 B 本地的 lastUpdated。
    // ≥15 秒后,B 的检查循环自动续期并广播心跳。
    const metaB = awB.meta.get(awB.clientID);
    if (metaB) {
      metaB.lastUpdated = Date.now() - next.silenceB * 1000;
    }
    draw();
  }

  function drawPanelBox(x: number, top: number, width: number, bottom: number) {
    g.fillStyle = '#ffffff';
    g.strokeStyle = '#cbd5e1';
    g.beginPath();
    g.rect(x, top, width, bottom - top);
    g.fill();
    g.stroke();
  }

  function drawUserRow(
    x: number,
    y: number,
    color: string,
    name: string,
    active: boolean,
  ) {
    g.globalAlpha = active ? 1 : 0.35;
    g.fillStyle = color;
    g.beginPath();
    g.arc(x + 20, y - 4, 5, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#172033';
    g.font = '13px ui-sans-serif, system-ui, sans-serif';
    g.fillText(name, x + 32, y);
    g.globalAlpha = 1;
  }

  function drawMeter(
    x: number,
    y: number,
    width: number,
    ratio: number,
    color: string,
    text: string,
  ) {
    g.fillStyle = '#e2e8f0';
    g.fillRect(x, y, width, 12);
    g.fillStyle = color;
    g.fillRect(x, y, Math.min(1, Math.max(0, ratio)) * width, 12);
    g.fillStyle = '#475569';
    g.font = '11px ui-sans-serif, system-ui, sans-serif';
    g.fillText(text, x, y + 26);
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

    const now = Date.now();
    const panelTop = 56;
    const panelBottom = height - 150;
    const panelWidth = width / 2 - 20 - 30;

    // 左侧面板:客户端 B 与其心跳计时(15 秒自动续期)。
    drawPanelBox(20, panelTop, panelWidth, panelBottom);
    drawUserRow(20, panelTop + 26, '#e25c5c', '小柏 (B)', true);
    const metaB = awB.meta.get(awB.clientID);
    const heartbeatElapsed = metaB ? now - metaB.lastUpdated : 0;
    drawMeter(
      34,
      panelTop + 46,
      panelWidth - 28,
      heartbeatElapsed / (outdatedTimeout / 2),
      '#4f7cff',
      `心跳计时 ${Math.floor(heartbeatElapsed / 1000)}s / 15s 自动续期`,
    );
    if (now - lastHeartbeatAt < 700) {
      g.strokeStyle = '#4f7cff';
      g.lineWidth = 2;
      g.beginPath();
      g.arc(40, panelTop + 22, 10, 0, Math.PI * 2);
      g.stroke();
      g.lineWidth = 1;
    }

    // 右侧面板:客户端 A 眼中的 B 与沉默计时(30 秒超时移除)。
    drawPanelBox(width / 2 + 30, panelTop, panelWidth, panelBottom);
    const aSeesB = awA.getStates().has(awB.clientID);
    drawUserRow(width / 2 + 30, panelTop + 26, '#e25c5c', aSeesB ? '小柏 (B)' : '小柏 (B)——已移除', aSeesB);
    const metaBInA = awA.meta.get(awB.clientID);
    const silenceElapsed = metaBInA ? now - metaBInA.lastUpdated : 0;
    drawMeter(
      width / 2 + 44,
      panelTop + 46,
      panelWidth - 28,
      silenceElapsed / outdatedTimeout,
      '#d97706',
      `沉默计时 ${Math.floor(silenceElapsed / 1000)}s / 30s 超时移除`,
    );

    // 中间的箭头代表 awareness 中继;断开时变灰变虚线。
    const midY = (panelTop + panelBottom) / 2;
    g.strokeStyle = relayOn ? '#4f7cff' : '#cbd5e1';
    g.lineWidth = 2;
    g.setLineDash(relayOn ? [] : [5, 4]);
    g.beginPath();
    g.moveTo(width / 2 - 22, midY);
    g.lineTo(width / 2 + 14, midY);
    g.stroke();
    g.setLineDash([]);
    g.lineWidth = 1;
    if (relayOn) {
      g.fillStyle = '#4f7cff';
      g.beginPath();
      g.moveTo(width / 2 + 22, midY);
      g.lineTo(width / 2 + 12, midY - 5);
      g.lineTo(width / 2 + 12, midY + 5);
      g.closePath();
      g.fill();
    }
    g.font = '11px ui-sans-serif, system-ui, sans-serif';
    g.fillStyle = relayOn ? '#4f7cff' : '#94a3b8';
    g.textAlign = 'center';
    g.fillText(relayOn ? 'awareness update' : '中继断开', width / 2, midY - 10);

    // 底部状态行:当前局面的直接结论。
    g.font = '600 13px ui-sans-serif, system-ui, sans-serif';
    if (!aSeesB) {
      g.fillStyle = '#d97706';
      g.fillText(
        relayOn
          ? 'B 已被 A 超时移除 —— 保持中继开启,B 的下一次心跳会把它带回来'
          : 'B 已被 A 超时移除,且中继断开 —— 重开中继后由心跳恢复',
        width / 2,
        height - 26,
      );
    } else if (!relayOn) {
      g.fillStyle = '#d97706';
      g.fillText('中继已断开:B 的心跳与更新到不了 A,沉默计时将持续累积', width / 2, height - 26);
    } else {
      g.fillStyle = '#059669';
      g.fillText('心跳每 15 秒自动续期,维持 A 眼中的「在线」', width / 2, height - 26);
    }
    g.textAlign = 'left';

    emit(snapshot());
  }

  function snapshot(): HeartbeatTimeoutSnapshot {
    const now = Date.now();
    const metaB = awB.meta.get(awB.clientID);
    const heartbeatIn = metaB
      ? Math.max(0, Math.ceil((outdatedTimeout / 2 - (now - metaB.lastUpdated)) / 1000))
      : 0;
    return {
      aSeesB: awA.getStates().has(awB.clientID) ? '是' : '否(已超时移除)',
      heartbeats: `${heartbeats} 次`,
      timeoutsA: `${timeoutsA} 次`,
      updatesChangesA: `${updatesA} / ${changesA}`,
      nextHeartbeat: `约 ${heartbeatIn} 秒后`,
      lastEventA,
    };
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  // 倒计时读数需要持续刷新;离屏或页面隐藏时渲染循环自动暂停。
  let accumulated = 0;
  const loop = createRenderLoop(canvas, (delta: number) => {
    accumulated += delta;
    if (accumulated >= 0.25) {
      accumulated = 0;
      draw();
    }
  });
  loop.renderOnce();

  return {
    update(options) {
      applyOptions(options);
    },
    dispose() {
      loop.dispose();
      resizeObserver.disconnect();
      awA.destroy();
      awB.destroy();
      docA.destroy();
      docB.destroy();
    },
  };
}
