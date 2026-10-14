/**
 * 范例介绍：按 v4 源码语义模拟 stateless 消息在「两个客户端 + 服务器」之间的路由。
 * 模拟语义：真实部署的传输层是 WebSocket 服务器，文档页内没有真实连接；这里用
 * 内存对象扮演服务器与网络，只复刻路由语义，不伪造真实连接。路由规则按 v4 源码
 * （packages/server/src/Document.ts 的 broadcast、Connection.ts 的 sendStateless、
 * MessageReceiver.ts 的 Stateless 分支）复刻：广播遍历文档全部连接（含发送者）、
 * 单播只发给目标连接、filter 回调逐连接过滤。
 * 输入：发送者（A / B）与服务器 onStateless 钩子里的回应方式（四种下发）。
 * 操作：调整控件后自动重播一次「上行 → 钩子 → 下发 → 下行」完整往返。
 * 预期：广播（含回显）时 A、B 都收到；单播只有发送者收到；filter 排除发送者时
 * 只有对方收到；不回应时没人收到（fire-and-forget，无补发）。
 * 阅读主线：看时间线中每条消息的方向标注与 A / B 的接收计数。
 */
import { createRenderLoop } from '../../assets/canvas-runtime.js';

/** 谁发送上行消息。 */
export type SendBy = 'a' | 'b';

/** 服务器 onStateless 钩子里的回应方式，对应四种真实下发写法。 */
export type RespondWith =
  | 'broadcast' // document.broadcastStateless(payload)：广播给全部连接，含发送者
  | 'broadcast-filter' // document.broadcastStateless(payload, filter)：filter 排除发送者
  | 'unicast' // connection.sendStateless(payload)：单播回发送者
  | 'none'; // 钩子不回应

export interface RoutingOptions {
  sendBy: SendBy;
  respondWith: RespondWith;
}

export interface RoutingEvent {
  /** 相对本轮播放开始的秒数。 */
  t: number;
  text: string;
  tone: 'up' | 'server' | 'down' | 'info';
}

export interface RoutingSnapshot {
  sendBy: SendBy;
  respondWith: RespondWith;
  /** 客户端 A 累计收到的 stateless 消息条数。 */
  receivedA: number;
  /** 客户端 B 累计收到的 stateless 消息条数。 */
  receivedB: number;
  events: RoutingEvent[];
}

export interface RoutingInstance {
  update(options: RoutingOptions): void;
  dispose(): void;
}

/** 演示用的固定 payload：按正文约定的 JSON 结构（type 字段路由）。 */
const PAYLOAD = '{"type":"notify","text":"有人提到了你"}';

/** 每轮播放中各跳的相对时刻（秒）：仅用于拉开时序，真实网络值不同。 */
const T_HOOK = 0.5;
const T_DISPATCH = 1.1;
const T_RECEIVE = 1.7;

/** 时间线上最多保留的事件条数。 */
const MAX_EVENTS = 14;

/** 客户端节点的绘制常量。 */
const NODE_W = 132;
const NODE_H = 44;

export function createStatelessRouting(
  canvas: HTMLCanvasElement,
  emit: (snapshot: RoutingSnapshot) => void,
): RoutingInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let options: RoutingOptions = { sendBy: 'a', respondWith: 'broadcast' };
  let startTime = performance.now();
  let events: RoutingEvent[] = [];
  let receivedA = 0;
  let receivedB = 0;
  /** 当前高亮的消息跳与出现时刻：1.2 秒内渐隐，用于指示「这一步正在发生」。 */
  let activeHop: 'up' | 'down-a' | 'down-b' | null = null;
  let activeHopAt = 0;
  /** 收到消息时客户端框闪烁。 */
  let flashA = 0;
  let flashB = 0;

  const timers = new Set<number>();
  const renderLoop = createRenderLoop(canvas, () => draw());

  function seconds(): number {
    return (performance.now() - startTime) / 1000;
  }

  function timer(ms: number, fn: () => void): void {
    const id = window.setTimeout(() => {
      timers.delete(id);
      fn();
    }, ms);
    timers.add(id);
  }

  function clearTimers(): void {
    timers.forEach((id) => window.clearTimeout(id));
    timers.clear();
  }

  function log(text: string, tone: RoutingEvent['tone']): void {
    events.push({ t: seconds(), text, tone });
    if (events.length > MAX_EVENTS) {
      events = events.slice(events.length - MAX_EVENTS);
    }
    emitSnapshot();
  }

  function snapshot(): RoutingSnapshot {
    return {
      sendBy: options.sendBy,
      respondWith: options.respondWith,
      receivedA,
      receivedB,
      events,
    };
  }

  function emitSnapshot(): void {
    emit(snapshot());
  }

  // ---- 模拟的传输层：只复刻路由语义，不含编解码与网络 ----

  /** 客户端上行：对应 provider.sendStateless(payload)。 */
  function providerSendStateless(sender: SendBy, payload: string): void {
    log(
      `${sender.toUpperCase()}  provider.sendStateless('${compact(payload)}')`,
      'up',
    );
    highlight('up');
    // 真实实现经 WebSocket 帧上行，服务器按消息里的 documentName 找到文档后，
    // 在 MessageReceiver 的 Stateless 分支触发 onStateless 钩子。
    timer(T_HOOK * 1000, () => onStatelessHook(sender, payload));
  }

  /** 服务端 onStateless 钩子：本课示例按控件选择执行一种下发。 */
  function onStatelessHook(sender: SendBy, _payload: string): void {
    log('服务器  onStateless 钩子触发（{ connection, document, payload }）', 'server');

    timer((T_DISPATCH - T_HOOK) * 1000, () => {
      if (options.respondWith === 'broadcast') {
        // 对应 document.broadcastStateless(payload)：遍历全部连接，含发送者
        log('服务器  document.broadcastStateless(payload) → 全部连接（含发送者）', 'server');
        dispatchDown('a');
        dispatchDown('b');
      } else if (options.respondWith === 'broadcast-filter') {
        // 对应 document.broadcastStateless(payload, filter)，filter 排除发送者
        log('服务器  broadcastStateless(payload, filter)，filter 排除发送者', 'server');
        const others: SendBy[] = options.sendBy === 'a' ? ['b'] : ['a'];
        others.forEach(dispatchDown);
      } else if (options.respondWith === 'unicast') {
        // 对应 connection.sendStateless(payload)：只发给触发钩子的那条连接
        log('服务器  connection.sendStateless(payload) → 仅发送者的连接', 'server');
        dispatchDown(sender);
      } else {
        log('服务器  钩子不回应：没有任何下行（无确认、无补发）', 'info');
      }
    });
  }

  /** 服务器下行：对应各 provider 收到 MessageType.Stateless 帧。 */
  function dispatchDown(target: SendBy): void {
    timer((T_RECEIVE - T_DISPATCH) * 1000, () => {
      if (target === 'a') {
        receivedA += 1;
        flashA = seconds();
      } else {
        receivedB += 1;
        flashB = seconds();
      }
      log(`${target.toUpperCase()}  触发 onStateless 事件（{ payload }）`, 'down');
      highlight(target === 'a' ? 'down-a' : 'down-b');
    });
  }

  function highlight(hop: 'up' | 'down-a' | 'down-b'): void {
    activeHop = hop;
    activeHopAt = seconds();
  }

  function compact(text: string): string {
    return text.length > 26 ? `${text.slice(0, 25)}…` : text;
  }

  // ---- 绘制 ----

  function nodeBox(
    x: number,
    y: number,
    label: string,
    sub: string,
    hot: number,
  ): void {
    const now = seconds();
    const glowing = now - hot < 0.8;
    drawingContext.fillStyle = glowing ? '#4f7cff' : '#e2e8f0';
    drawingContext.fillRect(x, y, NODE_W, NODE_H);
    drawingContext.strokeStyle = glowing ? '#4f7cff' : '#94a3b8';
    drawingContext.lineWidth = 1.5;
    drawingContext.strokeRect(x, y, NODE_W, NODE_H);

    drawingContext.fillStyle = glowing ? '#ffffff' : '#172033';
    drawingContext.font = '600 14px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(label, x + 12, y + 19);
    drawingContext.fillStyle = glowing ? '#dbe4ff' : '#64748b';
    drawingContext.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText(sub, x + 12, y + 35);
  }

  function arrow(
    from: [number, number],
    to: [number, number],
    color: string,
  ): void {
    drawingContext.strokeStyle = color;
    drawingContext.fillStyle = color;
    drawingContext.lineWidth = 2;
    drawingContext.beginPath();
    drawingContext.moveTo(from[0], from[1]);
    drawingContext.lineTo(to[0], to[1]);
    drawingContext.stroke();

    const angle = Math.atan2(to[1] - from[1], to[0] - from[0]);
    drawingContext.beginPath();
    drawingContext.moveTo(to[0], to[1]);
    drawingContext.lineTo(
      to[0] - 8 * Math.cos(angle - Math.PI / 6),
      to[1] - 8 * Math.sin(angle - Math.PI / 6),
    );
    drawingContext.lineTo(
      to[0] - 8 * Math.cos(angle + Math.PI / 6),
      to[1] - 8 * Math.sin(angle + Math.PI / 6),
    );
    drawingContext.closePath();
    drawingContext.fill();
  }

  function hopColor(active: boolean): string {
    if (!active) {
      return '#cbd5e1';
    }
    const age = seconds() - activeHopAt;
    const alpha = Math.max(0, 1 - age / 1.2);
    return alpha <= 0 ? '#cbd5e1' : `rgba(79, 124, 255, ${0.25 + 0.75 * alpha})`;
  }

  function draw(): void {
    const size = readSize();
    drawingContext.clearRect(0, 0, size.width, size.height);

    const aY = 18;
    const bY = 84;
    const serverX = size.width - NODE_W - 16;
    const serverY = (aY + bY + NODE_H) / 2 - NODE_H / 2;

    // 拓扑：两个客户端节点 + 服务器节点，三条消息路径
    nodeBox(16, aY, '客户端 A', options.sendBy === 'a' ? '发送中' : 'provider', flashA);
    nodeBox(16, bY, '客户端 B', options.sendBy === 'b' ? '发送中' : 'provider', flashB);
    nodeBox(serverX, serverY, 'Hocuspocus 服务器', 'onStateless 钩子', -10);

    const aRight = 16 + NODE_W;
    const bRight = 16 + NODE_W;
    const serverLeft = serverX;
    const midAY = aY + NODE_H / 2;
    const midBY = bY + NODE_H / 2;
    const serverMidY = serverY + NODE_H / 2;

    arrow([aRight, midAY - 6], [serverLeft, serverMidY - 4], hopColor(activeHop === 'up'));
    arrow([serverLeft, serverMidY + 4], [aRight, midAY + 6], hopColor(activeHop === 'down-a'));
    arrow([serverLeft, serverMidY + 12], [bRight, midBY], hopColor(activeHop === 'down-b'));

    drawingContext.fillStyle = '#64748b';
    drawingContext.font = '11px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('上行 Stateless(5)', (aRight + serverLeft) / 2 - 44, midAY - 14);
    drawingContext.fillText('下行', (aRight + serverLeft) / 2 - 12, serverMidY + 34);

    // 时间线
    const listTop = bY + NODE_H + 26;
    drawingContext.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    events.forEach((event, index) => {
      const y = listTop + index * 18;
      if (y > size.height - 6) {
        return;
      }
      drawingContext.fillStyle = '#94a3b8';
      drawingContext.fillText(`${event.t.toFixed(1)}s`, 16, y);
      drawingContext.fillStyle =
        event.tone === 'up'
          ? '#b45309'
          : event.tone === 'server'
            ? '#6d28d9'
            : event.tone === 'down'
              ? '#1d4ed8'
              : '#64748b';
      drawingContext.fillText(event.text, 58, y);
    });
  }

  function readSize(): { width: number; height: number } {
    const target = canvas.parentElement ?? canvas;
    const width = Math.max(320, Math.floor(target.clientWidth ?? 640));
    const height = Math.max(240, Math.floor(target.clientHeight ?? 360));
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    return { width, height };
  }

  // ---- 播放控制 ----

  function replay(): void {
    clearTimers();
    startTime = performance.now();
    events = [];
    receivedA = 0;
    receivedB = 0;
    activeHop = null;
    flashA = 0;
    flashB = 0;
    emitSnapshot();
    providerSendStateless(options.sendBy, PAYLOAD);
  }

  replay();

  return {
    update(next: RoutingOptions) {
      const changed =
        next.sendBy !== options.sendBy || next.respondWith !== options.respondWith;
      options = { ...next };
      if (changed) {
        replay();
      }
    },
    dispose() {
      clearTimers();
      renderLoop.dispose();
    },
  };
}
