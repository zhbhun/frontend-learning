/**
 * 范例介绍：按 v4 源码语义模拟 HocuspocusProvider 的连接状态机与事件时序。
 * 模拟语义：真实部署的传输层是 WebSocket 服务器，文档页内无法稳定复现；
 * 这里用计时器扮演网络与服务器。status 的三个取值与发出时机、synced 的
 * unsyncedChanges 计数时机、重连退避基数（1000ms 起、×2、封顶 30000ms）与
 * destroy 的清理顺序均按 v4 的 HocuspocusProvider(.Websocket) 源码复刻，
 * 事件名称与先后顺序与真实 provider 一致，时间值为示意。
 * 场景一（lifecycle）：连接 → 初始同步 → 服务器离线（断开 + 退避重连，离线越久
 * 间隔越长）→ 服务器恢复（重连成功、重新 synced）。
 * 场景二（destroy-timing）：对比「连接进行中 destroy」与「synced 之后 destroy」，
 * 随后脚本让服务器离线一次，验证销毁后的 provider 不再产生任何事件。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

/** 连接状态：取值与 v4 源码 WebSocketStatus 一致，另加 destroyed 作为终态展示。 */
export type SimStatus = 'connecting' | 'connected' | 'disconnected' | 'destroyed';

/** destroy 的时机选择。 */
export type DestroyChoice = 'immediately' | 'after-synced';

/** 演示场景。 */
export type SimScenario = 'lifecycle' | 'destroy-timing';

export interface ProviderSimOptions {
  scenario: SimScenario;
  /** lifecycle 场景：服务器是否可达。 */
  serverOnline: boolean;
  /** destroy-timing 场景：destroy 发生在什么时候。 */
  destroyWhen: DestroyChoice;
}

export interface SimEvent {
  /** 相对模拟开始的秒数。 */
  t: number;
  text: string;
  tone: 'status' | 'sync' | 'destroy' | 'info';
}

export interface ProviderSimSnapshot {
  status: SimStatus;
  synced: boolean;
  unsyncedChanges: number;
  /** 累计安排的重连次数（初次连接不计入）。 */
  reconnects: number;
  awareness: '广播中' | '已移除';
  serverOnline: boolean;
  destroyWhen: DestroyChoice | null;
  /** destroy 后新出现的 status 事件条数（v4 语义下恒为 0）。 */
  statusEventsAfterDestroy: number | null;
  events: SimEvent[];
}

export interface ProviderSimInstance {
  update(options: ProviderSimOptions): void;
  dispose(): void;
}

/** 重连退避：与 v4 连接层默认值一致（delay 1000、factor 2、封顶 maxDelay 30000）。 */
const RECONNECT_BASE_DELAY = 1000;
const RECONNECT_FACTOR = 2;
const RECONNECT_MAX_DELAY = 30000;

/** 模拟的握手与初始同步耗时：仅用于拉开时序，真实网络值不同。 */
const HANDSHAKE_MS = 300;
const SYNC_MS = 300;
/** 时间线上最多保留的事件条数。 */
const MAX_EVENTS = 40;

export function createProviderSim(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ProviderSimSnapshot) => void,
): ProviderSimInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let options: ProviderSimOptions = {
    scenario: 'lifecycle',
    serverOnline: true,
    destroyWhen: 'immediately',
  };
  let startTime = performance.now();
  let events: SimEvent[] = [];
  let status: SimStatus = 'disconnected';
  let synced = false;
  let unsyncedChanges = 0;
  let reconnects = 0;
  let awarenessOnline = false;
  let destroyedAt: number | null = null;
  /** 模拟时钟句柄：sim 属于 provider 自身（destroy 会清空），script 属于演示脚本。 */
  const simTimers = new Set<number>();
  const scriptTimers = new Set<number>();

  function seconds(): number {
    return (performance.now() - startTime) / 1000;
  }

  function timer(
    set: Set<number>,
    ms: number,
    fn: () => void,
  ): void {
    const id = window.setTimeout(() => {
      set.delete(id);
      fn();
    }, ms);
    set.add(id);
  }

  function clearTimers(set: Set<number>): void {
    set.forEach((id) => window.clearTimeout(id));
    set.clear();
  }

  function snapshot(): ProviderSimSnapshot {
    const destroyedTime = destroyedAt;
    const statusEventsAfterDestroy =
      destroyedTime === null
        ? null
        : events.filter((event) => event.tone === 'status' && event.t >= destroyedTime)
            .length;

    return {
      status,
      synced,
      unsyncedChanges,
      reconnects,
      awareness: awarenessOnline ? '广播中' : '已移除',
      serverOnline: options.serverOnline,
      destroyWhen: options.scenario === 'destroy-timing' ? options.destroyWhen : null,
      statusEventsAfterDestroy,
      events: events.slice(-12),
    };
  }

  function log(text: string, tone: SimEvent['tone']): void {
    events.push({ t: seconds(), text, tone });
    if (events.length > MAX_EVENTS) {
      events.shift();
    }
    draw();
    emit(snapshot());
  }

  // ---------- 模拟的 provider + 连接层：事件顺序按 v4 源码 ----------

  /** 连接层：每次连接尝试开始都发出 status: connecting（createWebSocketConnection 行为）。 */
  function startConnection(attempt: number): void {
    if (destroyedAt !== null) {
      return;
    }
    status = 'connecting';
    log(`status: connecting（第 ${attempt} 次连接尝试）`, 'status');
    timer(simTimers, HANDSHAKE_MS, () => {
      if (destroyedAt !== null) {
        return;
      }
      if (!options.serverOnline) {
        log('连接失败：服务器不可达', 'info');
        scheduleReconnect(attempt + 1);
        return;
      }
      status = 'connected';
      log('status: connected（socket 已打开）', 'status');
      startSync();
    });
  }

  /** 连接层：按退避计划重连，delay 1000ms 起、×factor、封顶 30000ms。 */
  function scheduleReconnect(nextAttempt: number): void {
    if (destroyedAt !== null) {
      return;
    }
    const delay = Math.min(
      RECONNECT_BASE_DELAY * RECONNECT_FACTOR ** (nextAttempt - 2),
      RECONNECT_MAX_DELAY,
    );
    reconnects = nextAttempt - 1;
    log(`按退避计划 ${delay}ms 后重连（第 ${reconnects} 次重连）`, 'info');
    timer(simTimers, delay, () => startConnection(nextAttempt));
  }

  /** 连接层：socket 关闭触发 disconnected；provider 的 synced 静默回到 false。 */
  function onSocketClose(): void {
    if (destroyedAt !== null) {
      return;
    }
    status = 'disconnected';
    log('status: disconnected（连接关闭）', 'status');
    if (synced) {
      synced = false;
      log('synced 属性回到 false（不触发事件）', 'sync');
    }
  }

  /** provider：startSync 把 unsyncedChanges 重置为 1 并发出 sync step 1。 */
  function startSync(): void {
    unsyncedChanges = 1;
    log('unsyncedChanges: 1（发送 sync step 1）', 'sync');
    timer(simTimers, SYNC_MS, () => {
      if (destroyedAt !== null) {
        return;
      }
      unsyncedChanges = 0;
      if (!synced) {
        // 计数归零使 synced 变为 true，且只在状态变化时触发一次事件
        synced = true;
        log('synced 事件：初始同步完成', 'sync');
      } else {
        log('sync step 2 应答：无缺失内容', 'sync');
      }
    });
  }

  /** provider：清理顺序按 v4 HocuspocusProvider.destroy() 源码。 */
  function runDestroy(reason: string): void {
    log(`destroy 事件触发（${reason}）`, 'destroy');
    clearTimers(simTimers);
    destroyedAt = seconds();
    status = 'destroyed';
    awarenessOnline = false;
    log('本地 awareness 状态移除并销毁', 'destroy');
    log('冲刷待发 update，解绑 document 监听与全部事件监听', 'destroy');
    log('自建 HocuspocusProviderWebsocket 一并销毁（重连定时器清空）', 'destroy');
    log('销毁完成：此后不再有任何事件', 'destroy');
  }

  // ---------- 两个场景 ----------

  function buildLifecycle(): void {
    log('new HocuspocusProvider({ url, name })', 'info');
    awarenessOnline = true;
    log('awareness 就绪（本地状态随消息流广播）', 'info');
    startConnection(1);
  }

  function applyLifecycle(previous: ProviderSimOptions): void {
    if (previous.serverOnline && !options.serverOnline) {
      if (status === 'connected') {
        log('服务器离线：socket 被关闭', 'info');
        onSocketClose();
        scheduleReconnect(2);
      }
      // connecting 阶段下线：当前尝试会在握手超时后走失败分支
    }
    // 恢复在线无需动作：等待中的重连计时器自然成功
  }

  function buildDestroyTiming(): void {
    log('new HocuspocusProvider({ url, name })', 'info');
    awarenessOnline = true;
    startConnection(1);
    if (options.destroyWhen === 'immediately') {
      timer(scriptTimers, 30, () => {
        runDestroy('组件卸载：连接进行中销毁');
      });
    } else {
      timer(scriptTimers, HANDSHAKE_MS + SYNC_MS + 60, () => {
        if (destroyedAt === null && synced) {
          runDestroy('初始同步完成后销毁');
        }
      });
    }
    // 销毁后让服务器离线一次：真实场景会触发 disconnected 与重连，
    // 销毁过的 provider 对此毫无反应——对比时间线上是否出现新事件。
    timer(scriptTimers, HANDSHAKE_MS + SYNC_MS + 1400, () => {
      log('服务器此刻离线（观察销毁前后的事件差异）', 'info');
    });
  }

  function rebuild(): void {
    clearTimers(simTimers);
    clearTimers(scriptTimers);
    startTime = performance.now();
    events = [];
    status = 'disconnected';
    synced = false;
    unsyncedChanges = 0;
    reconnects = 0;
    awarenessOnline = false;
    destroyedAt = null;

    if (options.scenario === 'lifecycle') {
      buildLifecycle();
    } else {
      buildDestroyTiming();
    }
  }

  // ---------- 以下为绘制外壳：事件触发时重绘的说明性时间线，无动画循环 ----------

  const TONE_COLORS: Record<SimEvent['tone'], string> = {
    status: '#3b5bdb',
    sync: '#166534',
    destroy: '#b91c1c',
    info: '#64748b',
  };

  const FONT_TITLE = '600 13px ui-sans-serif, system-ui, sans-serif';
  const FONT_ROW = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
  const FONT_LABEL = '12px ui-sans-serif, system-ui, sans-serif';

  function draw(): void {
    const size = readCanvasSize(canvas);
    const width = Math.max(360, size.width);
    const height = Math.max(280, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const panelX = width * 0.34;
    const panelY = 14;
    const panelWidth = width - panelX - 16;
    const rowHeight = 22;
    const maxRows = Math.max(3, Math.floor((height - panelY - 46) / rowHeight));
    const visible = events.slice(-maxRows);

    drawingContext.fillStyle = '#172033';
    drawingContext.font = FONT_TITLE;
    drawingContext.fillText('事件时间线（模拟时钟）', panelX, panelY + 14);

    drawingContext.font = FONT_ROW;
    visible.forEach((event, index) => {
      const y = panelY + 38 + index * rowHeight;
      drawingContext.fillStyle = '#94a3b8';
      drawingContext.fillText(`t+${event.t.toFixed(1)}s`, panelX, y);
      drawingContext.fillStyle = TONE_COLORS[event.tone];
      drawingContext.beginPath();
      drawingContext.arc(panelX + 58, y - 4, 3, 0, Math.PI * 2);
      drawingContext.fill();
      drawingContext.fillText(event.text, panelX + 70, y);
    });

    if (events.length > visible.length) {
      drawingContext.fillStyle = '#94a3b8';
      drawingContext.font = FONT_LABEL;
      drawingContext.fillText(`（仅显示最近 ${visible.length} 条）`, panelX, panelY + 32);
    }

    // 左侧：当前状态摘要（读数之外的图形化对照）
    const summaryX = 18;
    const summaryLines: Array<[string, string]> = [
      ['status', status],
      ['synced', String(synced)],
      ['unsyncedChanges', String(unsyncedChanges)],
      ['服务器', options.serverOnline ? '在线' : '离线'],
    ];
    drawingContext.font = FONT_TITLE;
    drawingContext.fillStyle = '#172033';
    drawingContext.fillText('当前状态', summaryX, panelY + 14);
    drawingContext.font = FONT_ROW;
    summaryLines.forEach(([label, value], index) => {
      const y = panelY + 38 + index * rowHeight;
      drawingContext.fillStyle = '#64748b';
      drawingContext.fillText(label, summaryX, y);
      drawingContext.fillStyle = status === 'connected' && label === 'status' ? '#166534' : '#172033';
      drawingContext.fillText(value, summaryX + 118, y);
    });
    if (destroyedAt !== null) {
      drawingContext.font = FONT_LABEL;
      drawingContext.fillStyle = '#b91c1c';
      drawingContext.fillText(
        `已销毁（t+${destroyedAt.toFixed(1)}s 起）`,
        summaryX,
        panelY + 38 + summaryLines.length * rowHeight,
      );
    }

    const footer = destroyedAt !== null
      ? 'destroy 之后不再有 status / synced 事件'
      : '拖动上方开关，观察事件顺序';
    drawingContext.font = FONT_LABEL;
    drawingContext.fillStyle = '#64748b';
    drawingContext.fillText(footer, 18, height - 16);
  }

  const resizeObserver = createResizeObserver(canvas, () => draw());

  rebuild();

  return {
    update(next) {
      const needsRebuild =
        next.scenario !== options.scenario ||
        (next.scenario === 'destroy-timing' && next.destroyWhen !== options.destroyWhen);
      const previous: ProviderSimOptions = { ...options };
      options = { ...next };

      if (needsRebuild) {
        rebuild();
        return;
      }
      if (options.scenario === 'lifecycle') {
        applyLifecycle(previous);
      }
      draw();
      emit(snapshot());
    },
    dispose() {
      clearTimers(simTimers);
      clearTimers(scriptTimers);
      resizeObserver.disconnect();
    },
  };
}
