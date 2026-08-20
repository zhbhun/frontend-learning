/**
 * 范例介绍：把一个注册了全部 effect 形态的插件放进浏览器，读者通过 Controls
 * 注册 / 销毁插件、手动提前撤销两种形态、让数组形态的 disposer 抛错，
 * 在日志流里观察每种形态的收集入账与 LIFO 撤销顺序。
 * 输入：Controls 的「加载插件」「撤销心跳（函数形态）」「撤销渐进收集（异步迭代器）」「disposer 抛错」。
 * 操作：加载开关控制 root.plugin() / fiber.dispose()；两个撤销开关各手动调用一次对应
 *      disposer（开关只触发动作，关闭不恢复——重新加载插件后先关再开可再次触发）；
 *      抛错开关让数组 [1] 的 disposer 在下一次撤销时抛错（无需重载插件）。
 * 预期结果：注册后「已收集待撤销」逐个入账（Promise 形态 20ms 后、异步迭代器每 900ms 一个）；
 *          销毁时日志按 LIFO 撤销（插件体返回的清理最先，异步形态比同步形态晚一个微任务）；
 *          手动提前撤销立即生效且销毁时不重复；disposer 抛错只中断同组后续并经
 *          ctx.logger.error 进日志，「已收集待撤销」因此不归零，插件仍正常 DISPOSED。
 * 阅读主线：registered 插件（五种形态）→ makeDisposer（入账/执行计数）→
 *          setLoaded / disposeEarly（调用面）→ pushLog → paint。
 */
import { Context, type Fiber } from 'cordis';

import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

// fiber.state 的取值 0–5 对应 PENDING/LOADING/ACTIVE/FAILED/DISPOSED/UNLOADING。
// FiberState 是 const enum，跨包值导入有 bundler 兼容风险，这里用本地标签映射
const STATE_NAMES = ['PENDING', 'LOADING', 'ACTIVE', 'FAILED', 'DISPOSED', 'UNLOADING'];
const STATE_COLORS = ['#f59e0b', '#f59e0b', '#4f7cff', '#ef4444', '#94a3b8', '#f59e0b'];

// 日志行的来源：effect 体的注册与运行、异步收集、撤销执行、调用方 API、logger.error
type LogKind = 'register' | 'collect' | 'dispose' | 'call' | 'error';

interface LogEntry {
  at: number;
  kind: LogKind;
  text: string;
}

export interface FormsOptions {
  loaded: boolean;
  disposeHeartbeat: boolean;
  disposeStream: boolean;
  failDisposer: boolean;
}

export interface FormsSnapshot {
  state: string;
  uid: string;
  beats: number;
  pending: number;
  disposed: number;
  effects: string;
}

export interface FormsInstance {
  update(options: FormsOptions): void;
  dispose(): void;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function createEffectForms(
  canvas: HTMLCanvasElement,
  emit: (snapshot: FormsSnapshot) => void,
): FormsInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  const startedAt = performance.now();
  const log: LogEntry[] = [];
  const counters = { beats: 0, pending: 0, disposed: 0 };

  const root = new Context();
  let fiber: Fiber | undefined;
  let options: FormsOptions = {
    loaded: true,
    disposeHeartbeat: false,
    disposeStream: false,
    failDisposer: false,
  };
  // 两种形态的 disposer 句柄：ctx.effect 的返回值，手动提前撤销时调用
  let disposeHeartbeat: (() => unknown) | undefined;
  let disposeStream: (() => unknown) | undefined;
  // 串行执行注册 / 撤销 / 销毁，避免快速切换 Controls 时操作相互竞争
  let chain: Promise<void> = Promise.resolve();

  function pushLog(entry: Omit<LogEntry, 'at'>) {
    log.push({ ...entry, at: Math.round(performance.now() - startedAt) });
    paint();
  }

  function describe(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  // 把撤销函数的「入账」与「执行」计入读数：入账 +1、执行 -1 并累计，
  // disposer 被跳过（同 effect 内前一个抛错）时 pending 不归零——泄漏证据
  function makeDisposer(text: string, hook?: () => void) {
    counters.pending += 1;
    return () => {
      counters.pending -= 1;
      counters.disposed += 1;
      try {
        hook?.();
      } finally {
        pushLog({ kind: 'dispose', text });
      }
    };
  }

  // 捕获框架在卸载路径记下的 error 级日志（默认只进内存缓冲，见 1.2），
  // 让「disposer 抛错只进 logger」在日志流里可见
  root.logger.exporter({
    export: (message) => {
      if (message.level !== 0) return;
      pushLog({ kind: 'error', text: `ctx.logger.error：${describe(message.args[0])}` });
    },
  });

  // 被观察的插件：一个插件体注册全部 effect 形态，再返回自己的清理函数
  const registered = (ctx: Context) => {
    pushLog({ kind: 'register', text: '插件体运行：依次注册五种 effect 形态' });

    // 形态一：函数——体同步运行，返回单个撤销函数
    disposeHeartbeat = ctx.effect(() => {
      pushLog({ kind: 'register', text: '函数形态：体同步运行，撤销函数立即入账' });
      const timer = setInterval(() => {
        counters.beats += 1;
        paint();
      }, 1000);
      return makeDisposer('函数形态撤销：心跳定时器已清除');
    }, '心跳定时器');

    // 形态二：同步集合（数组）——[1] 受「disposer 抛错」控制，撤销时按 LIFO 先运行
    ctx.effect(() => {
      pushLog({ kind: 'register', text: '数组形态：体同步运行，两个撤销函数入账（撤销时 [1] 先于 [0]）' });
      return [
        makeDisposer('数组 [0] 撤销'),
        makeDisposer('数组 [1] 撤销', () => {
          if (options.failDisposer) throw new Error('演示：disposer 抛错');
        }),
      ];
    }, '数组形态');

    // 形态三：同步集合（生成器）——体同步运行到完毕，yield 的每个撤销函数入账
    ctx.effect(function* () {
      pushLog({ kind: 'register', text: '生成器形态：体同步运行至完毕（惰性体被立即拉完）' });
      yield makeDisposer('生成器 d1 撤销');
      yield makeDisposer('生成器 d2 撤销');
    }, '生成器形态');

    // 形态四：Promise——注册返回时收集尚未完成，20ms 后撤销函数才入账
    ctx.effect(async () => {
      pushLog({ kind: 'register', text: 'Promise 形态：体开始，20ms 后才交出撤销函数' });
      await sleep(20);
      pushLog({ kind: 'collect', text: 'Promise 形态：撤销函数已入账' });
      return makeDisposer('Promise 形态撤销');
    }, 'Promise 形态');

    // 形态五：异步迭代器——每 900ms yield 一个撤销函数，渐进收集直到撤销
    disposeStream = ctx.effect(async function* () {
      pushLog({ kind: 'register', text: '异步迭代器形态：开始渐进收集（每 900ms 入账一个）' });
      for (let index = 1; ; index++) {
        await sleep(900);
        pushLog({ kind: 'collect', text: `异步迭代器形态：第 ${index} 个撤销函数入账` });
        yield makeDisposer(`异步迭代器 #${index} 撤销`);
      }
    }, '渐进收集');

    // 插件体直接返回的清理最后入账，因此撤销时最先运行（LIFO）
    return makeDisposer('插件体返回的清理');
  };

  // 串行执行调用面操作；任何一步异常都记录为日志，不让 chain 卡死
  function enqueue(operation: () => Promise<void>) {
    chain = chain.then(operation).catch((error: unknown) => {
      pushLog({ kind: 'error', text: `调用异常：${describe(error)}` });
    });
  }

  function setLoaded(next: boolean) {
    enqueue(async () => {
      if (next) {
        // 新实例从零开始计数；累计的已执行撤销保留在日志与总数里
        counters.beats = 0;
        counters.pending = 0;
        disposeHeartbeat = undefined;
        disposeStream = undefined;
        const current = root.plugin(registered);
        fiber = current;
        await current;
        pushLog({ kind: 'call', text: `await fiber 就绪（state=${STATE_NAMES[current.state]}）` });
      } else {
        const current = fiber;
        if (!current) return;
        await current.dispose();
        pushLog({
          kind: 'call',
          text: `await dispose 完成（state=${STATE_NAMES[current.state]}）`,
        });
      }
    });
  }

  // 手动提前撤销：函数形态立即生效；异步迭代器等待当前产出落定后回收至此
  function disposeEarly(which: 'heartbeat' | 'stream') {
    enqueue(async () => {
      if (which === 'heartbeat') {
        const dispose = disposeHeartbeat;
        if (!dispose) {
          pushLog({ kind: 'call', text: '心跳 disposer 不可用（未注册或已撤销）' });
          return;
        }
        disposeHeartbeat = undefined;
        pushLog({ kind: 'call', text: '手动调用 disposer()：函数形态立即撤销' });
        await Promise.resolve(dispose());
      } else {
        const dispose = disposeStream;
        if (!dispose) {
          pushLog({ kind: 'call', text: '渐进收集 disposer 不可用（未注册或已撤销）' });
          return;
        }
        disposeStream = undefined;
        pushLog({ kind: 'call', text: '手动调用 disposer()：等待异步迭代器当前产出落定…' });
        await Promise.resolve(dispose());
        pushLog({ kind: 'call', text: '手动撤销完成：回收至此已入账的撤销函数' });
      }
    });
  }

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
    drawingContext.fillText('一个插件的副作用记账与撤销', 48, 68);

    // 当前状态行：状态徽章 + uid + 记账读数
    const state = fiber?.state;
    const badgeText =
      fiber && state !== undefined ? STATE_NAMES[state] : '未注册';
    const badgeColor =
      fiber && state !== undefined ? STATE_COLORS[state] : '#94a3b8';
    drawingContext.font = '600 12px ui-monospace, SFMono-Regular, Menlo, monospace';
    const badgeWidth = drawingContext.measureText(badgeText).width + 20;
    roundRect(drawingContext, 48, 86, badgeWidth, 22, 11);
    drawingContext.strokeStyle = badgeColor;
    drawingContext.lineWidth = 1.5;
    drawingContext.stroke();
    drawingContext.fillStyle = badgeColor;
    drawingContext.fillText(badgeText, 58, 101);

    drawingContext.fillStyle = '#475569';
    drawingContext.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText(
      `registered 插件 · uid=${fiber ? String(fiber.uid) : '—'}` +
        ` · 待撤销 ${counters.pending} · 已撤销 ${counters.disposed}`,
      48 + badgeWidth + 12,
      101,
    );

    // 事件日志：按时间排序，底部为共享读数层预留空间，超出的旧条目折叠为一行提示
    const lineGap = 21;
    const top = 130;
    const maxLines = Math.max(4, Math.floor((height - top - 112) / lineGap));
    const visible = log.slice(-maxLines);
    const omitted = log.length - visible.length;

    drawingContext.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    visible.forEach((entry, index) => {
      const y = top + index * lineGap;
      const marker = { register: '○', collect: '◇', dispose: '●', call: '→', error: '✗' }[entry.kind];
      const color = entry.kind === 'dispose' ? '#4f7cff' : entry.kind === 'error' ? '#ef4444' : '#94a3b8';

      drawingContext.textAlign = 'right';
      drawingContext.fillStyle = '#94a3b8';
      drawingContext.fillText(`+${entry.at}ms`, 106, y);
      drawingContext.textAlign = 'left';

      drawingContext.fillStyle = color;
      drawingContext.fillText(marker, 120, y);

      drawingContext.fillStyle = entry.kind === 'error' ? color : '#334155';
      if (entry.kind === 'dispose' || entry.kind === 'error') {
        drawingContext.font = '600 12px ui-monospace, SFMono-Regular, Menlo, monospace';
      }
      drawingContext.fillText(entry.text, 138, y, width - 138 - 48);
      drawingContext.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    });

    if (omitted > 0) {
      drawingContext.fillStyle = '#94a3b8';
      drawingContext.fillText(`…… 更早的 ${omitted} 条已折叠`, 48, top - 8);
    }

    // getEffects 读数：fiber 当前记账树的标签（手动提前撤销后相应标签消失）
    const labels = fiber
      ?.getEffects()
      .map((meta) => meta.label)
      .join('、');

    emit({
      state: fiber && state !== undefined ? STATE_NAMES[state] : '未注册',
      uid: fiber ? String(fiber.uid) : '—',
      beats: counters.beats,
      pending: counters.pending,
      disposed: counters.disposed,
      effects: labels || '（空）',
    });
  }

  const resizeObserver = createResizeObserver(canvas, paint);
  pushLog({ kind: 'call', text: '观察者就绪：logger.exporter 已捕获 error 级日志' });
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
      if (next.loaded && next.disposeHeartbeat && !prev.disposeHeartbeat) {
        disposeEarly('heartbeat');
      } else if (next.loaded && next.disposeStream && !prev.disposeStream) {
        disposeEarly('stream');
      } else if (next.failDisposer !== prev.failDisposer) {
        pushLog({
          kind: 'call',
          text: next.failDisposer
            ? '「disposer 抛错」已开启：下一次撤销时数组 [1] 将抛错'
            : '「disposer 抛错」已关闭：数组 [1] 恢复正常撤销',
        });
      }
    },
    dispose() {
      resizeObserver.disconnect();
      // 根 fiber 的 dispose 回收全部副作用（含渐进收集的异步迭代器）
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
