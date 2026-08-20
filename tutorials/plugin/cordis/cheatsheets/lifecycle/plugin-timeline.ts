/**
 * 范例介绍：把一个带完整钩子的插件放进浏览器，读者通过 Controls 走完
 * 注册 → 更新配置（重载）→ 抛错（失败路径）→ 销毁的完整时序，
 * 每一步都记录为按时间排序的事件日志（状态迁移、钩子运行、内部事件、调用点）。
 * 输入：Controls 的「加载插件」「心跳间隔（config.interval）」「插件体抛错」。
 * 操作：开关控制 root.plugin() / fiber.dispose()；间隔或抛错开关变化时调用
 *      fiber.update()（rc.8 核心对相同配置也整段重启）；抛错在下一轮插件体运行时生效。
 * 预期结果：日志呈现注册的 PENDING→LOADING→ACTIVE、重载的 UNLOADING→LOADING→ACTIVE、
 *          销毁的 UNLOADING→DISPOSED，以及 LOADING 中抛错后的 UNLOADING→FAILED；
 *          uid 除重新注册外保持不变，FAILED 实例仍可销毁或经 update 复活。
 * 阅读主线：watched 插件（钩子面）→ setLoaded / scheduleUpdate（调用面）→ pushLog → paint。
 */
import { Context, type Fiber, type Plugin } from 'cordis';

import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

// fiber.state 的取值 0–5 对应 PENDING/LOADING/ACTIVE/FAILED/DISPOSED/UNLOADING。
// FiberState 是 const enum，跨包值导入有 bundler 兼容风险，这里用本地标签映射
const STATE_NAMES = ['PENDING', 'LOADING', 'ACTIVE', 'FAILED', 'DISPOSED', 'UNLOADING'];
const STATE_COLORS = ['#f59e0b', '#f59e0b', '#4f7cff', '#ef4444', '#94a3b8', '#f59e0b'];

// 日志行的来源：状态迁移（internal/status）、插件钩子、注册表事件（internal/plugin）、调用方 API
type LogKind = 'status' | 'hook' | 'event' | 'call';

interface LogEntry {
  at: number;
  kind: LogKind;
  state?: number;
  text: string;
}

export interface TimelineOptions {
  loaded: boolean;
  interval: number;
  fail: boolean;
}

export interface TimelineSnapshot {
  state: string;
  uid: string;
  bodyRuns: number;
  disposerRuns: number;
  beats: number;
}

export interface TimelineInstance {
  update(options: TimelineOptions): void;
  dispose(): void;
}

export function createPluginTimeline(
  canvas: HTMLCanvasElement,
  emit: (snapshot: TimelineSnapshot) => void,
): TimelineInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  const startedAt = performance.now();
  const log: LogEntry[] = [];
  const counters = { bodyRuns: 0, disposerRuns: 0, beats: 0 };

  const root = new Context();
  let fiber: Fiber | undefined;
  let options: TimelineOptions = { loaded: true, interval: 1000, fail: false };
  // 串行执行注册 / 更新 / 销毁，避免快速切换 Controls 时操作相互竞争
  let chain: Promise<void> = Promise.resolve();

  function pushLog(entry: Omit<LogEntry, 'at'>) {
    log.push({ ...entry, at: Math.round(performance.now() - startedAt) });
    paint();
  }

  function describe(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  // 观察者：注册表视角的两类内部事件，全部写入日志
  root.on('internal/plugin', (target) => {
    if (target.name !== 'watched') return;
    pushLog({
      kind: 'event',
      state: target.state,
      text:
        target.uid === null
          ? 'internal/plugin：实例移除（uid=null）'
          : `internal/plugin：实例注册（uid=${target.uid}）`,
    });
  });
  root.on('internal/status', (target, old) => {
    if (target.name !== 'watched') return;
    pushLog({
      kind: 'status',
      state: target.state,
      text: `${STATE_NAMES[old]} → ${STATE_NAMES[target.state]}`,
    });
  });

  // 被观察的插件：一个插件体 + 两种来源的清理函数，覆盖启用 / 停用两面的钩子
  // 无静态 Config 时配置原样透传，类型上用 Plugin.Function 声明 output 形态
  const watched: Plugin.Function<{ interval: number }> = (ctx: Context) => {
    counters.bodyRuns += 1;
    pushLog({
      kind: 'hook',
      state: ctx.fiber.state,
      text: `插件体运行 config=${JSON.stringify(ctx.fiber.config)}（state=${STATE_NAMES[ctx.fiber.state]}）`,
    });
    // 清理函数来源一：ctx.effect 返回的撤销函数（先于抛错注册，
    // 失败路径里它会被回收——「已收集副作用先回收再 FAILED」的证据）
    ctx.effect(() => {
      const timer = setInterval(() => {
        counters.beats += 1;
        paint();
      }, ctx.fiber.config.interval);
      pushLog({ kind: 'hook', text: `心跳定时器启动（${ctx.fiber.config.interval}ms）` });
      return () => {
        counters.disposerRuns += 1;
        clearInterval(timer);
        pushLog({ kind: 'hook', text: '心跳定时器撤销（ctx.effect 清理）' });
      };
    }, '心跳定时器');
    if (options.fail) {
      pushLog({ kind: 'hook', state: ctx.fiber.state, text: '插件体抛出 Error(\'演示错误\')' });
      throw new Error('演示错误');
    }
    // 清理函数来源二：插件体直接返回的函数（箭头函数插件才会被收集，见 2.1）
    return () => {
      counters.disposerRuns += 1;
      pushLog({ kind: 'hook', text: '插件体返回的清理运行' });
    };
  };

  // 串行执行调用面操作；任何一步异常都记录为日志，不让 chain 卡死
  function enqueue(operation: () => Promise<void>) {
    chain = chain.then(operation).catch((error: unknown) => {
      pushLog({ kind: 'call', text: `调用异常：${describe(error)}` });
    });
  }

  function setLoaded(next: boolean) {
    enqueue(async () => {
      if (next) {
        const current = root.plugin(watched, { interval: options.interval });
        fiber = current;
        try {
          await current;
          pushLog({
            kind: 'call',
            state: current.state,
            text: `await fiber 就绪（state=${STATE_NAMES[current.state]}）`,
          });
        } catch (error) {
          pushLog({
            kind: 'call',
            state: current.state,
            text: `await fiber 拒绝：${describe(error)}（state=${STATE_NAMES[current.state]}）`,
          });
        }
      } else {
        const current = fiber;
        if (!current) return;
        await current.dispose();
        pushLog({
          kind: 'call',
          state: current.state,
          text: `await dispose 完成（state=${STATE_NAMES[current.state]}）`,
        });
      }
    });
  }

  // 已加载时，间隔或抛错开关的任何变化都经 fiber.update 整段重载；
  // 抛错开关由此在下一轮插件体运行时生效
  function scheduleUpdate() {
    enqueue(async () => {
      const current = fiber;
      // 实例已销毁（uid 为 null）时不再更新——update 会触发 assertActive 保护
      if (!current || current.uid === null) return;
      pushLog({
        kind: 'call',
        text: `fiber.update({interval:${options.interval}})`,
      });
      current.update({ interval: options.interval });
      try {
        await current;
        pushLog({
          kind: 'call',
          state: current.state,
          text: `await fiber 就绪（state=${STATE_NAMES[current.state]}）`,
        });
      } catch (error) {
        pushLog({
          kind: 'call',
          state: current.state,
          text: `await fiber 拒绝：${describe(error)}（state=${STATE_NAMES[current.state]}）`,
        });
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
    drawingContext.fillText('一个插件实例的完整时序', 48, 68);

    // 当前状态行：状态徽章 + uid + 加载轮次
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
      `watched 插件 · uid=${fiber ? String(fiber.uid) : '—'} · 第 ${counters.bodyRuns} 轮插件体`,
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
      const marker = { status: '●', hook: '○', call: '→', event: '◆' }[entry.kind];
      const color = entry.state === undefined ? '#94a3b8' : STATE_COLORS[entry.state];

      drawingContext.textAlign = 'right';
      drawingContext.fillStyle = '#94a3b8';
      drawingContext.fillText(`+${entry.at}ms`, 106, y);
      drawingContext.textAlign = 'left';

      drawingContext.fillStyle = color;
      drawingContext.fillText(marker, 120, y);

      drawingContext.fillStyle = entry.kind === 'status' ? color : '#334155';
      drawingContext.font =
        entry.kind === 'status'
          ? '600 12px ui-monospace, SFMono-Regular, Menlo, monospace'
          : '12px ui-monospace, SFMono-Regular, Menlo, monospace';
      drawingContext.fillText(entry.text, 138, y, width - 138 - 48);
      drawingContext.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    });

    if (omitted > 0) {
      drawingContext.fillStyle = '#94a3b8';
      drawingContext.fillText(`…… 更早的 ${omitted} 条已折叠`, 48, top - 8);
    }

    emit({
      state: fiber && state !== undefined ? STATE_NAMES[state] : '未注册',
      uid: fiber ? String(fiber.uid) : '—',
      bodyRuns: counters.bodyRuns,
      disposerRuns: counters.disposerRuns,
      beats: counters.beats,
    });
  }

  const resizeObserver = createResizeObserver(canvas, paint);
  pushLog({ kind: 'event', text: '观察者就绪：internal/plugin / internal/status' });
  setLoaded(true);
  paint();

  return {
    update(next) {
      const prev = options;
      options = next;
      if (next.loaded !== prev.loaded) {
        setLoaded(next.loaded);
      } else if (next.interval !== prev.interval || next.fail !== prev.fail) {
        scheduleUpdate();
      }
    },
    dispose() {
      resizeObserver.disconnect();
      // 根 fiber 的 dispose 回收全部副作用、清空注册表（含心跳定时器）
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
