/**
 * 范例介绍：把 @cordisjs/plugin-timer 的四个方法（本目录 timer-source.ts 的逐字副本）装进
 * 浏览器，读者通过 Controls 观察四个方法的时序与撤销语义——心跳 interval 的周期重建、
 * 一次性 timeout 到点即从记账树消失、throttle 的「立即 + 尾随」、debounce 的「安静后一次」。
 * 输入：Controls 的「加载插件」「心跳周期」「节流窗口 / 防抖延迟」「连发次数」「触发连发」「自动触发流」。
 * 操作：加载开关控制 root.plugin(demoPlugin)；周期 / 窗口变化时用 disposer 撤销旧句柄再重建
 *      （这正是「返回 disposer / wrapper.dispose」的用法）；连发开关一次性同步触发两个包装函数 N 次；
 *      自动触发流保持每 120ms 同时触发两者（间隔小于窗口时 debounce 永远等不到安静）。
 * 预期结果：插件加载 2s 后日志出现「ctx.timeout 到点」且 effect 标签里的 'ctx.timeout()' 消失；
 *          连发 6 次时 throttle 立即执行 1 次、窗口结束时尾随执行 1 次（携带最后一次参数），
 *          debounce 在最后一次触发后的窗口时长时执行 1 次；自动触发流下 throttle 约每窗口执行一次、
 *          debounce 持续不执行，关闭流后 debounce 补执行一次；关闭「加载插件」后全部定时器撤销。
 * 阅读主线：demoPlugin（inject: ['timer'] 与四个方法的注册点）→ rebuild（disposer / .dispose 的重建用法）→
 *          burst / setStream（调用面）→ pushLog → paint。
 */
import { Context, type Fiber } from 'cordis';

import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';
import { TimerService } from './timer-source';

// fiber.state 的取值 0–5 对应 PENDING/LOADING/ACTIVE/FAILED/DISPOSED/UNLOADING
// （与 effects 课一致：const enum 跨包值导入有 bundler 兼容风险，用本地标签映射）
const STATE_NAMES = ['PENDING', 'LOADING', 'ACTIVE', 'FAILED', 'DISPOSED', 'UNLOADING'];
const STATE_COLORS = ['#f59e0b', '#f59e0b', '#4f7cff', '#ef4444', '#94a3b8', '#f59e0b'];

type LogKind = 'call' | 'throttle' | 'debounce' | 'error';

interface LogEntry {
  at: number;
  kind: LogKind;
  text: string;
}

export interface TimerLabOptions {
  loaded: boolean;
  heartbeatMs: number;
  windowMs: number;
  burstCount: number;
  fireBurst: boolean;
  stream: boolean;
}

export interface TimerLabSnapshot {
  state: string;
  uid: string;
  beats: number;
  heartbeatMs: number;
  throttleFires: number;
  debounceFires: number;
  effects: string;
}

export interface TimerLabInstance {
  update(options: TimerLabOptions): void;
  dispose(): void;
}

export function createTimerLab(
  canvas: HTMLCanvasElement,
  emit: (snapshot: TimerLabSnapshot) => void,
): TimerLabInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  const startedAt = performance.now();
  const log: LogEntry[] = [];
  const counters = { beats: 0, throttleFires: 0, debounceFires: 0 };

  const root = new Context();
  let fiber: Fiber | undefined;
  let pluginCtx: Context | undefined;
  let options: TimerLabOptions = {
    loaded: true,
    heartbeatMs: 600,
    windowMs: 800,
    burstCount: 6,
    fireBurst: false,
    stream: false,
  };
  // ctx.interval 返回的 disposer 与 throttle / debounce 包装函数句柄：重建时先撤销旧的
  let disposeHeartbeat: (() => void) | undefined;
  let throttled: ((...args: any[]) => void) & { dispose(): void } | undefined;
  let debounced: ((...args: any[]) => void) & { dispose(): void } | undefined;
  // 自动触发流是演示装置（不属于教学内容），用普通 setInterval 驱动，dispose 时清理
  let streamTimer: number | undefined;
  let streamSeq = 0;
  // 串行执行注册 / 重建 / 销毁，避免快速切换 Controls 时操作相互竞争
  let chain: Promise<void> = Promise.resolve();

  function pushLog(entry: Omit<LogEntry, 'at'>) {
    log.push({ ...entry, at: Math.round(performance.now() - startedAt) });
    paint();
  }

  function describe(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  // 周期 / 窗口变化时的重建：先调用旧句柄的撤销（disposer 或 wrapper.dispose），再注册新的
  function rebuild(reason: string) {
    const ctx = pluginCtx;
    if (!ctx) return;
    disposeHeartbeat?.();
    throttled?.dispose();
    debounced?.dispose();

    disposeHeartbeat = ctx.interval(() => {
      counters.beats += 1;
      paint();
    }, options.heartbeatMs);
    throttled = ctx.throttle((n: number) => {
      counters.throttleFires += 1;
      pushLog({ kind: 'throttle', text: `throttle 执行 #${counters.throttleFires}（触发参数 #${n}）` });
    }, options.windowMs);
    debounced = ctx.debounce(() => {
      counters.debounceFires += 1;
      pushLog({ kind: 'debounce', text: `debounce 执行 #${counters.debounceFires}（触发停止 ${options.windowMs}ms 后）` });
    }, options.windowMs);
    pushLog({ kind: 'call', text: `重建定时器（${reason}）：周期 ${options.heartbeatMs}ms / 窗口 ${options.windowMs}ms` });
  }

  // 演示的插件：插件体内消费 timer 服务必须声明 inject（fiber 内的服务访问被追踪）
  const demoPlugin = {
    inject: ['timer'],
    apply(ctx: Context) {
      pluginCtx = ctx;
      pushLog({ kind: 'call', text: '插件体运行：注册一次性 timeout（2000ms）' });
      // 一次性延时：到点时该 effect 先自我撤销再执行回调——记账树里随即消失
      ctx.timeout(() => {
        pushLog({ kind: 'call', text: 'ctx.timeout 到点（"ctx.timeout()" 已从记账树移除）' });
      }, 2000);
      rebuild('插件加载');
    },
  };

  function enqueue(operation: () => Promise<void>) {
    chain = chain.then(operation).catch((error: unknown) => {
      pushLog({ kind: 'error', text: `调用异常：${describe(error)}` });
    });
  }

  function stopStream() {
    if (streamTimer !== undefined) {
      clearInterval(streamTimer);
      streamTimer = undefined;
      pushLog({ kind: 'call', text: '自动触发流关闭' });
    }
  }

  function setStream(on: boolean) {
    if (on) {
      if (streamTimer !== undefined) return;
      streamTimer = window.setInterval(() => {
        streamSeq += 1;
        throttled?.(streamSeq);
        debounced?.(streamSeq);
      }, 120);
      pushLog({ kind: 'call', text: '自动触发流开启：每 120ms 同时触发 throttle 与 debounce' });
    } else {
      stopStream();
    }
  }

  function setLoaded(next: boolean) {
    enqueue(async () => {
      if (next) {
        counters.beats = 0;
        counters.throttleFires = 0;
        counters.debounceFires = 0;
        disposeHeartbeat = undefined;
        throttled = undefined;
        debounced = undefined;
        const current = root.plugin(demoPlugin);
        fiber = current;
        await current;
        pushLog({ kind: 'call', text: `await fiber 就绪（state=${STATE_NAMES[current.state]}）` });
      } else {
        stopStream();
        const current = fiber;
        if (!current) return;
        pluginCtx = undefined;
        await current.dispose();
        pushLog({
          kind: 'call',
          text: `dispose 完成（state=${STATE_NAMES[current.state]}）——interval 与包装函数的 effect 全部撤销`,
        });
      }
    });
  }

  function paint() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(360, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 16px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('ctx.timer 四个方法的时序与撤销', 48, 68);

    // 当前状态行：状态徽章 + uid + 计数
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
      `demoPlugin · uid=${fiber ? String(fiber.uid) : '—'}` +
        ` · 心跳 ${counters.beats} · 节流执行 ${counters.throttleFires} · 防抖执行 ${counters.debounceFires}`,
      48 + badgeWidth + 12,
      101,
    );

    // 事件日志：按时间排序，底部为共享读数层预留空间，超出的旧条目折叠为一行提示
    const lineGap = 21;
    const top = 138;
    const maxLines = Math.max(4, Math.floor((height - top - 108) / lineGap));
    const visible = log.slice(-maxLines);
    const omitted = log.length - visible.length;

    drawingContext.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    visible.forEach((entry, index) => {
      const y = top + index * lineGap;
      const marker = { call: '○', throttle: '◆', debounce: '◇', error: '✗' }[entry.kind];
      const color =
        entry.kind === 'throttle' ? '#4f7cff'
          : entry.kind === 'debounce' ? '#10b981'
            : entry.kind === 'error' ? '#ef4444' : '#94a3b8';

      drawingContext.textAlign = 'right';
      drawingContext.fillStyle = '#94a3b8';
      drawingContext.fillText(`+${entry.at}ms`, 106, y);
      drawingContext.textAlign = 'left';

      drawingContext.fillStyle = color;
      drawingContext.fillText(marker, 120, y);

      drawingContext.fillStyle = entry.kind === 'call' ? '#334155' : color;
      if (entry.kind !== 'call') {
        drawingContext.font = '600 12px ui-monospace, SFMono-Regular, Menlo, monospace';
      }
      drawingContext.fillText(entry.text, 138, y, width - 138 - 48);
      drawingContext.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    });

    if (omitted > 0) {
      drawingContext.fillStyle = '#94a3b8';
      drawingContext.fillText(`…… 更早的 ${omitted} 条已折叠`, 48, top - 8);
    }

    // getEffects 读数：插件记账树当前标签（一次性 timeout 到点后即消失）
    const labels = fiber
      ?.getEffects()
      .map((meta) => meta.label)
      .join('、');

    emit({
      state: fiber && state !== undefined ? STATE_NAMES[state] : '未注册',
      uid: fiber ? String(fiber.uid) : '—',
      beats: counters.beats,
      heartbeatMs: options.heartbeatMs,
      throttleFires: counters.throttleFires,
      debounceFires: counters.debounceFires,
      effects: labels || '（空）',
    });
  }

  const resizeObserver = createResizeObserver(canvas, paint);

  // 装载顺序：先加载 timer 服务（mixin 生效），再加载消费它的演示插件
  enqueue(async () => {
    await root.plugin(TimerService);
    pushLog({ kind: 'call', text: 'TimerService 已加载：ctx.timeout / interval / throttle / debounce 已混入' });
  });
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
      if (!next.loaded) return;
      if (
        next.heartbeatMs !== prev.heartbeatMs ||
        next.windowMs !== prev.windowMs
      ) {
        rebuild(
          next.heartbeatMs !== prev.heartbeatMs ? '心跳周期变化' : '窗口 / 延迟变化',
        );
        return;
      }
      if (next.fireBurst && !prev.fireBurst) {
        const count = next.burstCount;
        pushLog({ kind: 'call', text: `连发 ×${count}：同一时刻触发 throttle 与 debounce` });
        for (let index = 1; index <= count; index++) {
          throttled?.(index);
          debounced?.(index);
        }
        return;
      }
      if (next.stream !== prev.stream) {
        setStream(next.stream);
      }
    },
    dispose() {
      resizeObserver.disconnect();
      stopStream();
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
