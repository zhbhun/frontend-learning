/**
 * 范例介绍：在真实根上下文上注册一对「提供者 → 消费者」插件，观察依赖注入的时序——
 * 注册顺序无关的激活、提供者离场后消费者回滚等待、服务实现替换后的回滚重载。
 * 输入（Controls）：order（注册顺序：消费者先 / 提供者先）、impl（服务实现 alpha / beta）、
 * providerAlive（提供者在场）；点击画布向根上下文分发一次 'probe' 事件。
 * 操作：order 变化时销毁全部实例按新顺序重建；providerAlive 变化时注册或销毁提供者；
 * impl 变化时销毁旧提供者并注册新实现（同名服务、不同插件函数）。
 * 预期结果：无论注册顺序，消费者都以 PENDING → LOADING → ACTIVE 收尾；
 * 提供者离场后消费者回 PENDING、probe 无响应、注册表仍保留该实例；
 * 实现切换触发「回滚 + 重载」两组时间线记录，读到的服务版本随之切换。
 * 阅读主线：consumer / clockAlpha / clockBeta 定义 → update() 的三个分支 → paint() 时间线。
 */
import { Context, type Fiber, type Plugin } from 'cordis';

import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

// 声明本范例用到的自定义事件与服务名，让 ctx.on / ctx.emit / ctx.clock 获得类型检查
declare module 'cordis' {
  interface Events {
    probe(): void;
  }
  interface Context {
    clock: { version: string };
  }
}

/** Controls 提供的读者输入 */
export interface DependencyTimelineArgs {
  order: 'consumer-first' | 'provider-first';
  impl: 'alpha' | 'beta';
  providerAlive: boolean;
}

/** 供读数与绘图消费的运行时快照 */
export interface DependencyTimelineSnapshot {
  orderLabel: string;
  implLabel: string;
  providerState: string;
  consumerState: string;
  hasConsumer: boolean;
  probes: number;
  serviceVersion: string;
  timeline: string[];
}

export interface DependencyTimelineInstance {
  update(args: DependencyTimelineArgs): void;
  dispose(): void;
}

// 与 cordis 导出的 FiberState 数值一一对应（4.0.0-rc.8：0-5）。
// 不直接引用 FiberState 是因为它是 const enum，按数值镜像更稳妥。
const STATE_LABELS: Record<number, string> = {
  0: 'PENDING',
  1: 'LOADING',
  2: 'ACTIVE',
  3: 'FAILED',
  4: 'DISPOSED',
  5: 'UNLOADING',
};

const TIMELINE_LIMIT = 8;
const TIMELINE_ROW = 20;

export function createDependencyTimeline(
  canvas: HTMLCanvasElement,
  emit: (snapshot: DependencyTimelineSnapshot) => void,
): DependencyTimelineInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  const root = new Context();
  const t0 = performance.now();
  const timeline: string[] = [];
  const stats = { probes: 0, version: '—' };

  function stateOf(fiber: Fiber | null): string {
    if (!fiber) return '—';
    return STATE_LABELS[fiber.state] ?? String(fiber.state);
  }

  // 时间线的原始素材全部来自框架自身的内部事件，而不是演示代码的猜测
  function mark(text: string) {
    const elapsed = Math.round(performance.now() - t0);
    timeline.push(`+${elapsed}ms ${text}`);
    if (timeline.length > TIMELINE_LIMIT) {
      timeline.splice(0, timeline.length - TIMELINE_LIMIT);
    }
    paint();
  }

  // 消费者：声明必需依赖 clock；插件体只在依赖就绪后运行，回滚时副作用全部撤销
  const consumer: Plugin.Function = (ctx) => {
    // probe 监听器由框架托管：消费者回滚时自动撤销，失活期间点击画布将无响应
    ctx.on('probe', () => {
      stats.probes += 1;
      stats.version = ctx.clock.version;
      paint();
    });
    ctx.effect(() => {
      stats.probes = 0;
      stats.version = ctx.clock.version;
      mark(`consumer 插件体运行，读到 clock = ${ctx.clock.version}`);
      return () => {
        stats.version = '—';
        mark('consumer 插件体回滚，副作用全部撤销');
      };
    });
  };
  consumer.inject = ['clock'];

  // 两个实现版本是两个不同的插件函数：同名服务、不同运行时，
  // 切换时消费者看到的「提供该服务的 fiber」变了，因此回滚后重载
  const clockAlpha: Plugin.Function = (ctx) => {
    ctx.provide('clock', { version: 'alpha' });
  };

  const clockBeta: Plugin.Function = (ctx) => {
    ctx.provide('clock', { version: 'beta' });
  };

  const IMPLEMENTATIONS: Record<
    DependencyTimelineArgs['impl'],
    { label: string; plugin: Plugin.Function }
  > = {
    alpha: { label: 'alpha', plugin: clockAlpha },
    beta: { label: 'beta', plugin: clockBeta },
  };

  let consumerFiber: Fiber | null = null;
  let providerFiber: Fiber | null = null;
  let applied: {
    order: DependencyTimelineArgs['order'];
    impl: DependencyTimelineArgs['impl'];
    providerAlive: boolean;
  } | null = null;
  // 串行执行注册与销毁，避免快速切换控件时两者竞争
  let queue: Promise<void> = Promise.resolve();

  root.on('internal/plugin', (fiber) => {
    if (fiber.name === 'root') return;
    mark(fiber.uid === null ? `${fiber.name} 销毁` : `${fiber.name} 注册`);
  });

  root.on('internal/status', (fiber, oldValue) => {
    if (fiber.name === 'root') return;
    mark(`${fiber.name}: ${STATE_LABELS[oldValue] ?? oldValue} → ${stateOf(fiber)}`);
  });

  root.on('internal/service', (name, value) => {
    if (name !== 'clock') return;
    // 撤销时会先以旧值触发一次，再以 undefined 触发一次（4.0.0-rc.8 行为）
    mark(`service clock = ${value?.version ?? 'undefined'}`);
  });

  function snapshot(): DependencyTimelineSnapshot {
    return {
      orderLabel:
        applied?.order === 'provider-first' ? '提供者先' : '消费者先',
      implLabel: applied ? IMPLEMENTATIONS[applied.impl].label : '—',
      providerState: stateOf(providerFiber),
      consumerState: stateOf(consumerFiber),
      hasConsumer: root.registry.has(consumer),
      probes: stats.probes,
      serviceVersion: stats.version,
      timeline: [...timeline],
    };
  }

  function paint() {
    const data = snapshot();
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(420, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 18px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('一条服务依赖的时间线', 48, 52);

    // 状态徽章：提供者与消费者的 fiber 状态直接来自真实注册表
    const badges = [
      { label: `提供者 ${data.providerState}`, active: data.providerState === 'ACTIVE' },
      { label: `消费者 ${data.consumerState}`, active: data.consumerState === 'ACTIVE' },
    ];
    let badgeX = 48;
    for (const badge of badges) {
      drawingContext.font = '600 11px ui-sans-serif, system-ui, sans-serif';
      const badgeWidth = drawingContext.measureText(badge.label).width + 20;
      drawingContext.fillStyle = badge.active ? '#4f7cff' : '#94a3b8';
      roundRect(drawingContext, badgeX, 72, badgeWidth, 24, 12);
      drawingContext.fill();
      drawingContext.fillStyle = '#ffffff';
      drawingContext.fillText(badge.label, badgeX + 10, 88);
      badgeX += badgeWidth + 12;
    }

    drawingContext.fillStyle = '#475569';
    drawingContext.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText(
      `clock = ${data.serviceVersion} · probe 响应 ${data.probes} · registry.has(consumer) = ${data.hasConsumer}`,
      48,
      124,
    );

    // 时间线：自上而下按时间排列，超出部分从顶部滚出
    drawingContext.strokeStyle = '#e2e8f0';
    drawingContext.lineWidth = 1;
    roundRect(drawingContext, 48, 136, width - 96, 26 + TIMELINE_LIMIT * TIMELINE_ROW, 8);
    drawingContext.stroke();

    data.timeline.forEach((entry, index) => {
      const top = 160 + index * TIMELINE_ROW;
      const separator = entry.indexOf(' ');
      const stamp = entry.slice(0, separator);
      const text = entry.slice(separator + 1);
      drawingContext.fillStyle = '#94a3b8';
      drawingContext.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
      drawingContext.fillText(stamp, 68, top);
      drawingContext.fillStyle = '#475569';
      drawingContext.fillText(text, 140, top);
    });

    // 右下角提示（左下角被读数面板占据）
    drawingContext.fillStyle = '#94a3b8';
    drawingContext.font = '13px ui-sans-serif, system-ui, sans-serif';
    const hint = '点击画布 → 消费者存活时响应一次 probe 事件';
    drawingContext.fillText(hint, width - 48 - drawingContext.measureText(hint).width, height - 20);

    emit(data);
  }

  async function teardown() {
    if (consumerFiber) {
      await consumerFiber.dispose();
      consumerFiber = null;
    }
    if (providerFiber) {
      await providerFiber.dispose();
      providerFiber = null;
    }
  }

  function registerProvider(target: DependencyTimelineArgs['impl']) {
    // await 提供者等待其自身的装载完成；消费者则不必等待依赖（见正文 await 语义）
    providerFiber = root.plugin(IMPLEMENTATIONS[target].plugin);
    return Promise.resolve(providerFiber);
  }

  function update(args: DependencyTimelineArgs) {
    if (
      applied &&
      applied.order === args.order &&
      applied.impl === args.impl &&
      applied.providerAlive === args.providerAlive
    ) {
      return;
    }
    const target = { ...args };
    queue = queue.then(async () => {
      if (!applied || applied.order !== target.order) {
        // 注册顺序变化：销毁全部实例，按新顺序重建（首帧没有可销毁的对象）
        if (applied) {
          const first =
            target.order === 'provider-first' ? '提供者' : '消费者';
          await teardown();
          mark(`全部销毁，按「${first}先」重排`);
        }
        if (target.providerAlive && target.order === 'provider-first') {
          await registerProvider(target.impl);
          consumerFiber = root.plugin(consumer);
        } else {
          consumerFiber = root.plugin(consumer);
          if (target.providerAlive) await registerProvider(target.impl);
        }
      } else if (applied.impl !== target.impl && target.providerAlive) {
        // 实现切换：销毁旧提供者，注册新实现——同名服务换了提供者
        if (providerFiber) {
          await providerFiber.dispose();
          providerFiber = null;
        }
        await registerProvider(target.impl);
      } else if (applied.providerAlive !== target.providerAlive) {
        // 提供者离场 / 回到现场：消费者不销毁，只随依赖回滚或重载
        if (target.providerAlive) {
          await registerProvider(target.impl);
        } else if (providerFiber) {
          await providerFiber.dispose();
          providerFiber = null;
        }
      }
      applied = target;
      paint();
    });
  }

  function handleClick() {
    // 无论消费者是否存活都分发事件：有没有响应，由「probe 响应」读数回答
    root.emit('probe');
  }

  canvas.addEventListener('click', handleClick);
  const resizeObserver = createResizeObserver(canvas, paint);

  return {
    update,
    dispose() {
      canvas.removeEventListener('click', handleClick);
      resizeObserver.disconnect();
      queue = queue.then(teardown);
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
