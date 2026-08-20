/**
 * 范例介绍：在浏览器里构建一棵上下文树（root + 会话 A + A 的子插件 bridge + 会话 B），
 * 通过开关销毁/重建某个会话，观察副作用与监听器的作用域归属和兄弟作用域的隔离。
 * 输入：Controls 的「会话 A」「会话 B」开关；点击画布向根上下文分发一次 ping 事件。
 * 操作：开关切换时调用 root.plugin() 注册会话插件，或 fiber.dispose() 销毁；
 *      点击画布时 root.emit('ping')，各作用域的监听器按归属响应。
 * 预期结果：销毁会话 A 后，A 与其子插件 bridge 的监听器、心跳定时器全部撤销，
 *          会话 B 与根作用域不受影响；重新开启后以新的 uid 完整恢复行为。
 * 阅读主线：sessionA / sessionB / bridge 三个插件 → setEnabled → paint。
 */
import { Context, type Fiber } from 'cordis';

import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

// 声明本范例用到的自定义事件名，让 ctx.on / ctx.emit 获得类型检查
declare module 'cordis' {
  interface Events {
    ping(): void;
  }
}

// fiber.state 的取值 0–5 对应 PENDING/LOADING/ACTIVE/FAILED/DISPOSED/UNLOADING，
// 这里映射为中文标签与颜色，用于树节点的状态徽章
const STATE_LABELS = ['等待依赖', '启用中', '运行中', '失败', '已销毁', '停用中'];
const STATE_COLORS = ['#f59e0b', '#f59e0b', '#4f7cff', '#ef4444', '#94a3b8', '#f59e0b'];

export interface TreeOptions {
  sessionA: boolean;
  sessionB: boolean;
}

export interface TreeSnapshot {
  listeners: string;
  timers: string;
  lastPing: string;
}

export interface TreeInstance {
  update(options: TreeOptions): void;
  dispose(): void;
}

export function createContextTree(
  canvas: HTMLCanvasElement,
  emit: (snapshot: TreeSnapshot) => void,
): TreeInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  // 各作用域的计数读数：根监听器、两个会话（ping 命中 + 心跳）、bridge 监听器
  const stats = {
    root: { pings: 0 },
    sessionA: { pings: 0, beats: 0 },
    sessionB: { pings: 0, beats: 0 },
    bridge: { pings: 0 },
  };
  // 最近一次 ping 事件被哪些作用域响应——销毁后不再出现，就是隔离的证据
  let lastResponders: string[] = [];

  const root = new Context();
  // 持有各会话最近一次注册的 Fiber（销毁后仍保留引用，用于展示「已销毁」状态）
  const fibers: { a?: Fiber; b?: Fiber; bridge?: Fiber } = {};
  const enabled = { a: false, b: false };
  // 串行执行注册与销毁，避免快速切换开关时两者竞争
  let chain: Promise<void> = Promise.resolve();

  function startSession(
    ctx: Context,
    counters: { pings: number; beats: number },
    label: string,
  ) {
    // 监听器注册在会话自己的派生上下文上——归属会话的 fiber
    ctx.on('ping', () => {
      counters.pings += 1;
      lastResponders.push(label);
      paint();
    });
    // 心跳定时器是会话作用域内的副作用，销毁时由框架自动清除
    ctx.effect(() => {
      const timer = setInterval(() => {
        counters.beats += 1;
        paint();
      }, 2000);
      return () => clearInterval(timer);
    }, `${label} 心跳定时器`);
  }

  // 会话 A：内部再注册一个子插件，构成第三层——销毁 A 时 bridge 级联销毁
  function sessionA(ctx: Context) {
    startSession(ctx, stats.sessionA, 'sessionA');
    fibers.bridge = ctx.plugin(bridge);
  }

  function sessionB(ctx: Context) {
    startSession(ctx, stats.sessionB, 'sessionB');
  }

  function bridge(ctx: Context) {
    ctx.on('ping', () => {
      stats.bridge.pings += 1;
      lastResponders.push('bridge');
      paint();
    });
  }

  // 根作用域自己的监听器：无论会话开关如何，它始终响应
  root.on('ping', () => {
    stats.root.pings += 1;
    lastResponders.push('root');
    paint();
  });
  // 监听内部事件，让树随真实状态变化实时重绘（fiber 注册/移除与状态迁移）
  root.on('internal/plugin', () => paint());
  root.on('internal/status', () => paint());

  function handleClick() {
    // 无论各作用域是否存在都分发事件：谁还在响应，由「最近 ping 响应」回答
    lastResponders = [];
    root.emit('ping');
    paint();
  }

  function activeCount(...candidates: Array<Fiber | undefined>): number {
    return candidates.filter((fiber) => fiber?.state === 2).length;
  }

  function paint() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(280, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 16px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('一棵上下文树：关闭开关即销毁对应作用域', 48, 48);

    const nodeWidth = Math.min(176, Math.max(130, width * 0.34));
    const compact = width < 560;
    const centerA = width * 0.27;
    const centerB = width * 0.73;
    const rootTop = 78;
    const sessionTop = 156;
    const bridgeTop = 232;

    // 连线：root → 会话 A / 会话 B，会话 A → bridge（子作用域已销毁时画虚线）
    drawLink(drawingContext, width / 2, rootTop + 46, centerA, sessionTop, fibers.a);
    drawLink(drawingContext, width / 2, rootTop + 46, centerB, sessionTop, fibers.b);
    drawLink(drawingContext, centerA, sessionTop + 46, centerA, bridgeTop, fibers.bridge);

    drawNode(drawingContext, width / 2 - nodeWidth / 2, rootTop, nodeWidth, {
      title: 'root',
      uid: 0,
      state: root.fiber.state,
      detail: `uid 0·ping ${stats.root.pings}`,
      compact,
    });
    drawNode(drawingContext, centerA - nodeWidth / 2, sessionTop, nodeWidth, {
      title: 'sessionA',
      uid: fibers.a?.uid,
      state: fibers.a?.state,
      detail: fibers.a
        ? `uid ${fibers.a.uid}·ping ${stats.sessionA.pings}·beat ${stats.sessionA.beats}`
        : '尚未注册',
      compact,
    });
    drawNode(drawingContext, centerA - nodeWidth / 2, bridgeTop, nodeWidth, {
      title: 'bridge',
      // 已销毁的 fiber 会把 uid 置 null——节点上原样呈现这一事实
      uid: fibers.bridge?.uid,
      state: fibers.bridge?.state,
      detail: fibers.bridge
        ? `uid ${fibers.bridge.uid}·ping ${stats.bridge.pings}`
        : '尚未注册',
      compact,
    });
    drawNode(drawingContext, centerB - nodeWidth / 2, sessionTop, nodeWidth, {
      title: 'sessionB',
      uid: fibers.b?.uid,
      state: fibers.b?.state,
      detail: fibers.b
        ? `uid ${fibers.b.uid}·ping ${stats.sessionB.pings}·beat ${stats.sessionB.beats}`
        : '尚未注册',
      compact,
    });

    // 读数汇总：监听器共 4 个（root + sessionA + bridge + sessionB），心跳共 2 个
    const aliveListeners = 1 + activeCount(fibers.a, fibers.bridge, fibers.b);
    const aliveTimers = activeCount(fibers.a, fibers.b);

    emit({
      listeners: `${aliveListeners}/4`,
      timers: `${aliveTimers}/2`,
      lastPing: lastResponders.length ? lastResponders.join('、') : '—',
    });
  }

  function setEnabled(key: 'a' | 'b', next: boolean) {
    if (next === enabled[key]) {
      return;
    }
    enabled[key] = next;
    chain = chain.then(async () => {
      if (next) {
        fibers[key] = root.plugin(key === 'a' ? sessionA : sessionB);
        await fibers[key];
      } else {
        await fibers[key]?.dispose();
      }
      paint();
    });
  }

  canvas.addEventListener('click', handleClick);
  const resizeObserver = createResizeObserver(canvas, paint);
  setEnabled('a', true);
  setEnabled('b', true);
  paint();

  return {
    update(options) {
      setEnabled('a', options.sessionA);
      setEnabled('b', options.sessionB);
    },
    dispose() {
      canvas.removeEventListener('click', handleClick);
      resizeObserver.disconnect();
      // 根 fiber 的 dispose 回收全部副作用、清空注册表，等效回到 new Context()
      chain = chain.then(async () => {
        await root.fiber.dispose();
      });
    },
  };
}

function drawLink(
  target: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  child: Fiber | undefined,
) {
  target.strokeStyle = child?.state === 2 ? '#94a3b8' : '#cbd5e1';
  target.lineWidth = 1.5;
  // 子作用域不存在或已销毁时用虚线表示「这层派生关系已撤销」
  target.setLineDash(child?.state === 2 ? [] : [4, 3]);
  target.beginPath();
  target.moveTo(fromX, fromY);
  target.lineTo(toX, toY);
  target.stroke();
  target.setLineDash([]);
}

function drawNode(
  target: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  info: {
    title: string;
    uid: number | null | undefined;
    state: number | undefined;
    detail: string;
    compact: boolean;
  },
) {
  const height = 46;
  const state = info.state ?? 4;
  const alive = state === 2;

  target.fillStyle = alive ? '#ffffff' : '#f1f5f9';
  target.strokeStyle = STATE_COLORS[state] ?? '#94a3b8';
  target.lineWidth = 1.5;
  target.setLineDash(alive ? [] : [4, 3]);
  roundRect(target, x, y, width, height, 8);
  target.fill();
  target.stroke();
  target.setLineDash([]);

  target.fillStyle = alive ? '#172033' : '#64748b';
  target.font = '600 13px ui-sans-serif, system-ui, sans-serif';
  target.fillText(info.title, x + 12, y + 19);

  target.fillStyle = STATE_COLORS[state] ?? '#94a3b8';
  target.font = '600 11px ui-sans-serif, system-ui, sans-serif';
  target.textAlign = 'right';
  target.fillText(
    info.state === undefined ? '未注册' : STATE_LABELS[state],
    x + width - 12,
    y + 19,
  );
  target.textAlign = 'left';

  target.fillStyle = alive ? '#475569' : '#94a3b8';
  target.font = `${info.compact ? 10 : 11}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  target.fillText(info.detail, x + 12, y + 37);
}

function roundRect(
  target: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  target.beginPath();
  target.moveTo(x + radius, y);
  target.arcTo(x + width, y, x + width, y + height, radius);
  target.arcTo(x + width, y + height, x, y + height, radius);
  target.arcTo(x, y + height, x, y, radius);
  target.arcTo(x, y, x + width, y, radius);
  target.closePath();
}
