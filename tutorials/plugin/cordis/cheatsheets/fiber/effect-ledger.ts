/**
 * 范例介绍：把一个插件 fiber 的 effect 记账树放进浏览器。
 * 输入：Controls 的「加载插件」「定时器 effect」「pulse 监听器」「资源组（嵌套组合）」。
 * 操作：加载开关走 root.plugin() / fiber.dispose()；其余开关在存活实例上动态注册或
 *      手动撤销对应 effect；点击画布发出 pulse 事件。
 * 预期结果：左侧实时呈现 fiber.getEffects() 的记账树（label 与嵌套 children），
 *          手动撤销让对应节点离账；关闭加载后整棵树按 LIFO 清空并在日志留下执行顺序；
 *          插件体 return 的清理会执行但不出现在树上。
 * 阅读主线：booked 插件（记账内容）→ registerXxx / revokeXxx（动态注册与撤销）
 *          → paint（左树右日志）。
 */
import { Context, type Fiber } from 'cordis';

import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

// 类型化事件声明合并：本范例的事件契约（与 intro 课的 ping 同款写法）
declare module 'cordis' {
  interface Events {
    pulse(): void;
  }
}

// fiber.state 的取值 0–5 对应 PENDING/LOADING/ACTIVE/FAILED/DISPOSED/UNLOADING。
// FiberState 是 const enum，跨包值导入有 bundler 兼容风险，这里用本地标签映射
const STATE_NAMES = ['PENDING', 'LOADING', 'ACTIVE', 'FAILED', 'DISPOSED', 'UNLOADING'];
const STATE_COLORS = ['#f59e0b', '#f59e0b', '#4f7cff', '#ef4444', '#94a3b8', '#f59e0b'];

// 日志行的来源：入账 / 撤销执行 / 调用面 / 插件钩子
type LogKind = 'reg' | 'undo' | 'call' | 'hook';

interface LogEntry {
  at: number;
  kind: LogKind;
  text: string;
}

export interface LedgerOptions {
  loaded: boolean;
  timer: boolean;
  listener: boolean;
  group: boolean;
}

export interface LedgerSnapshot {
  state: string;
  uid: string;
  topLevel: number;
  treeNodes: number;
  beats: number;
  pulses: number;
}

export interface LedgerInstance {
  update(options: LedgerOptions): void;
  dispose(): void;
}

export function createEffectLedger(
  canvas: HTMLCanvasElement,
  emit: (snapshot: LedgerSnapshot) => void,
): LedgerInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  const startedAt = performance.now();
  const log: LogEntry[] = [];
  const counters = { beats: 0, pulses: 0 };

  const root = new Context();
  let fiber: Fiber | undefined;
  let hostCtx: Context | undefined;
  // 每类 effect 保存注册返回的 wrapper（AsyncDisposable），手动撤销就是调用它
  const wrappers: {
    timer?: () => any;
    listener?: () => any;
    group?: () => any;
  } = {};
  let options: LedgerOptions = { loaded: true, timer: true, listener: true, group: true };
  // 串行执行注册 / 撤销 / 销毁，避免快速切换 Controls 时操作相互竞争
  let chain: Promise<void> = Promise.resolve();

  function pushLog(entry: Omit<LogEntry, 'at'>) {
    log.push({ ...entry, at: Math.round(performance.now() - startedAt) });
    paint();
  }

  // 记账树读数：getEffects() 返回 { label, children }[]，children 是被外层
  // effect 收编的嵌套注册（所有权转移，见正文「记账树」）
  function countNodes(nodes: { children: unknown[] }[]): number {
    return nodes.reduce((sum, node) => sum + 1 + countNodes(node.children as never), 0);
  }

  // ---- 四类记账内容：三种 ctx.effect / ctx.on + 插件体 return 的清理 ----

  function registerTimer() {
    if (!hostCtx || wrappers.timer) return;
    wrappers.timer = hostCtx.effect(() => {
      const timer = setInterval(() => {
        counters.beats += 1;
        paint();
      }, 1000);
      pushLog({ kind: 'reg', text: '入账：定时器（body 同步执行完即入账）' });
      return () => {
        clearInterval(timer);
        pushLog({ kind: 'undo', text: '撤销：定时器' });
      };
    }, '定时器');
  }

  function registerListener() {
    if (!hostCtx || wrappers.listener) return;
    // ctx.on 本身就是 effect 注册：label 由框架自动生成为 ctx.on("pulse")
    wrappers.listener = hostCtx.on('pulse', () => {
      counters.pulses += 1;
      paint();
    });
    pushLog({ kind: 'reg', text: '入账：ctx.on("pulse")（框架自动起的 label）' });
  }

  function registerGroup() {
    if (!hostCtx || wrappers.group) return;
    // 生成器体是惰性执行的闭包，外层 guard 的窄化传不进去，先捕获为局部常量
    const ctx = hostCtx;
    // 嵌套组合：子 effect 的 wrapper 被 yield 交给外层收集，
    // 从 fiber 账本转移到外层的局部列表，label 成为 children
    wrappers.group = ctx.effect(function* () {
      yield ctx.effect(() => {
        pushLog({ kind: 'reg', text: '入账：资源A（成为资源组的 child）' });
        return () => pushLog({ kind: 'undo', text: '撤销：资源A' });
      }, '资源A');
      yield ctx.effect(() => {
        pushLog({ kind: 'reg', text: '入账：资源B（成为资源组的 child）' });
        return () => pushLog({ kind: 'undo', text: '撤销：资源B' });
      }, '资源B');
      pushLog({ kind: 'reg', text: '入账：资源组（顶层条目，带 2 个 children）' });
    }, '资源组');
  }

  const registrations = {
    timer: { register: registerTimer, label: '定时器' },
    listener: { register: registerListener, label: 'pulse 监听器' },
    group: { register: registerGroup, label: '资源组' },
  } as const;

  // 被观察的插件：箭头函数形态——插件体 return 的清理函数会被收集入账，
  // 但它不经过 effect()，没有 label 元数据，所以不出现在 getEffects() 树上
  const booked = (ctx: Context) => {
    pushLog({
      kind: 'hook',
      text: `插件体运行（state=${STATE_NAMES[ctx.fiber.state]}），记账开始生长`,
    });
    hostCtx = ctx;
    if (options.timer) registerTimer();
    if (options.listener) registerListener();
    if (options.group) registerGroup();
    return () => pushLog({ kind: 'undo', text: '撤销：插件体 return 的清理（不在树上）' });
  };

  function enqueue(operation: () => Promise<unknown>) {
    chain = chain
      .then(operation)
      .then(() => undefined)
      .catch((error: unknown) => {
        pushLog({
          kind: 'call',
          text: `调用异常：${error instanceof Error ? error.message : String(error)}`,
        });
      });
  }

  function setLoaded(next: boolean) {
    enqueue(async () => {
      if (next) {
        const current = root.plugin(booked);
        fiber = current;
        try {
          await current;
          pushLog({
            kind: 'call',
            text: `await fiber 就绪（uid=${current.uid}，state=${STATE_NAMES[current.state]}）`,
          });
        } catch (error) {
          pushLog({
            kind: 'call',
            text: `await fiber 拒绝：${error instanceof Error ? error.message : String(error)}`,
          });
        }
      } else {
        const current = fiber;
        if (!current) return;
        pushLog({ kind: 'call', text: 'fiber.dispose()：账本逆序清空开始' });
        await current.dispose();
        pushLog({
          kind: 'call',
          text: `dispose 完成（state=${STATE_NAMES[current.state]}，getEffects() 为空）`,
        });
        fiber = undefined;
        hostCtx = undefined;
        wrappers.timer = undefined;
        wrappers.listener = undefined;
        wrappers.group = undefined;
      }
    });
  }

  // 存活实例上动态注册（ACTIVE 后注册同样入账，卸载时一并撤销）
  // 或手动撤销（调用注册返回的 wrapper——从账本摘除，卸载时不再执行）
  function syncEffect(key: 'timer' | 'listener' | 'group', enabled: boolean) {
    enqueue(async () => {
      if (!fiber || fiber.uid === null) return;
      if (enabled) {
        registrations[key].register();
      } else if (wrappers[key]) {
        pushLog({ kind: 'call', text: `手动撤销：${registrations[key].label}（调用注册返回值）` });
        await wrappers[key]!();
        pushLog({ kind: 'call', text: `${registrations[key].label} 已离账（再次调用是 no-op）` });
        wrappers[key] = undefined;
      }
    });
  }

  // 点击画布发出 pulse 事件：监听器在账上才会计数（事件本身是树全局的，见 2.2）
  function onClick() {
    root.emit('pulse');
  }
  canvas.addEventListener('click', onClick);

  function paint() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(340, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 16px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('fiber.getEffects()：一棵生长与清空的记账树', 48, 40);

    // 状态徽章 + 实例信息行
    const state = fiber?.state;
    const badgeText = fiber && state !== undefined ? STATE_NAMES[state] : '未注册';
    const badgeColor = fiber && state !== undefined ? STATE_COLORS[state] : '#94a3b8';
    drawingContext.font = '600 12px ui-monospace, SFMono-Regular, Menlo, monospace';
    const badgeWidth = drawingContext.measureText(badgeText).width + 20;
    roundRect(drawingContext, 48, 56, badgeWidth, 22, 11);
    drawingContext.strokeStyle = badgeColor;
    drawingContext.lineWidth = 1.5;
    drawingContext.stroke();
    drawingContext.fillStyle = badgeColor;
    drawingContext.fillText(badgeText, 58, 71);

    const tree = fiber ? fiber.getEffects() : [];
    const treeNodes = countNodes(tree);
    drawingContext.fillStyle = '#475569';
    drawingContext.fillText(
      `booked 插件 · uid=${fiber ? String(fiber.uid) : '—'} · 顶层 ${tree.length} 项 / 共 ${treeNodes} 节点`,
      48 + badgeWidth + 12,
      71,
    );

    // 左侧：记账树（label 节点，children 缩进）
    const treeTop = 96;
    const treeWidth = Math.min(300, Math.max(190, width * 0.42));
    drawTree(tree, 48, treeTop, treeWidth);

    // 右侧：入账 / 撤销日志
    const logLeft = 48 + treeWidth + 24;
    const logWidth = width - logLeft - 48;
    drawingContext.fillStyle = '#94a3b8';
    drawingContext.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('入账 / 撤销日志（时间序）', logLeft, treeTop + 2);

    const lineGap = 19;
    const top = treeTop + 22;
    const maxLines = Math.max(4, Math.floor((height - top - 16) / lineGap));
    const visible = log.slice(-maxLines);
    const omitted = log.length - visible.length;

    drawingContext.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    visible.forEach((entry, index) => {
      const y = top + index * lineGap;
      const marker = { reg: '＋', undo: '×', call: '→', hook: '○' }[entry.kind];
      const color = { reg: '#4f7cff', undo: '#ef4444', call: '#0ea5e9', hook: '#94a3b8' }[entry.kind];

      drawingContext.textAlign = 'right';
      drawingContext.fillStyle = '#94a3b8';
      drawingContext.fillText(`+${entry.at}ms`, logLeft + 56, y);
      drawingContext.textAlign = 'left';

      drawingContext.fillStyle = color;
      drawingContext.fillText(marker, logLeft + 66, y);

      drawingContext.fillStyle = '#334155';
      drawingContext.fillText(entry.text, logLeft + 84, y, logWidth - 84);
    });

    if (omitted > 0) {
      drawingContext.fillStyle = '#94a3b8';
      drawingContext.fillText(`…… 更早的 ${omitted} 条已折叠`, logLeft, top - 6);
    }

    emit({
      state: fiber && state !== undefined ? STATE_NAMES[state] : '未注册',
      uid: fiber ? String(fiber.uid) : '—',
      topLevel: tree.length,
      treeNodes,
      beats: counters.beats,
      pulses: counters.pulses,
    });
  }

  function drawTree(
    nodes: { label: string; children: unknown[] }[],
    left: number,
    top: number,
    width: number,
  ) {
    drawingContext.fillStyle = '#94a3b8';
    drawingContext.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('记账树（label / children）', left, top + 2);

    let y = top + 24;
    const walk = (list: { label: string; children: unknown[] }[], depth: number) => {
      for (const node of list) {
        const x = left + depth * 20;
        const boxWidth = width - depth * 20;
        roundRect(drawingContext, x, y, boxWidth, 24, 6);
        drawingContext.strokeStyle = depth === 0 ? '#4f7cff' : '#94a3b8';
        drawingContext.lineWidth = 1.25;
        drawingContext.stroke();
        if (depth > 0) {
          drawingContext.strokeStyle = '#cbd5e1';
          drawingContext.beginPath();
          drawingContext.moveTo(x - 10, y + 12);
          drawingContext.lineTo(x, y + 12);
          drawingContext.stroke();
        }
        drawingContext.fillStyle = depth === 0 ? '#1e293b' : '#475569';
        drawingContext.font =
          depth === 0
            ? '600 11px ui-monospace, SFMono-Regular, Menlo, monospace'
            : '11px ui-monospace, SFMono-Regular, Menlo, monospace';
        drawingContext.fillText(node.label, x + 10, y + 16, boxWidth - 20);
        drawingContext.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
        y += 30;
        walk(node.children as never, depth + 1);
      }
    };
    walk(nodes, 0);

    if (nodes.length === 0) {
      drawingContext.fillStyle = '#94a3b8';
      drawingContext.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
      drawingContext.fillText('（空：未注册或已清空）', left, y + 4);
    }
  }

  const resizeObserver = createResizeObserver(canvas, paint);
  pushLog({ kind: 'hook', text: '实例就绪：等待插件注册' });
  setLoaded(true);
  paint();

  return {
    update(next) {
      const prev = options;
      options = next;
      if (next.loaded !== prev.loaded) {
        setLoaded(next.loaded);
        return;
      }
      for (const key of ['timer', 'listener', 'group'] as const) {
        if (next[key] !== prev[key]) {
          syncEffect(key, next[key]);
        }
      }
    },
    dispose() {
      resizeObserver.disconnect();
      canvas.removeEventListener('click', onClick);
      // 根 fiber 的 dispose 回收全部副作用、清空注册表（含定时器与监听器）
      enqueue(async () => {
        await root.fiber.dispose();
      });
    },
  };
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
