/**
 * 范例介绍：在真实根上下文上注册与销毁插件，观察三件事——
 * 三种插件形态的等价性、同一插件重复注册产生的多实例、注册表读数的变化。
 * 输入（Controls）：form（插件形态：函数 / 类 / 对象）与 count（实例数量 0-3）；
 * 点击画布向根上下文分发一次 'knock' 事件。
 * 操作：形态变化时先销毁全部实例再按新形态注册；数量变化时按 LIFO 增减实例；
 * 每个实例各自注册一个心跳 effect 和一个 knock 监听器。
 * 预期结果：三种形态都进入 ACTIVE；实例增加时 uid 递增、registry.size 保持 1、
 * 活动实例同步增加；减到 0 时 registry.size 归 0；各实例的心跳与 knock 计数相互独立。
 * 阅读主线：heartbeatBody → 三种形态定义 → update() 的增减分支 → paint()。
 */
import { Context, type Fiber, type Plugin } from 'cordis';

import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

// 声明本范例用到的自定义事件名，让 ctx.on / ctx.emit 获得类型检查
declare module 'cordis' {
  interface Events {
    knock(): void;
  }
}

/** Controls 提供的读者输入 */
export interface PluginRegistryArgs {
  form: 'function' | 'class' | 'object';
  count: number;
}

/** 插件收到的配置类型（本范例只透传；配置的读取与校验见 2.6） */
export interface HeartbeatConfig {
  label?: string;
}

/** 供读数与绘图消费的运行时快照 */
export interface PluginRegistrySnapshot {
  formLabel: string;
  registrySize: number;
  runtimeName: string;
  instances: Array<{ uid: number; state: string; ticks: number; knocks: number }>;
  ticks: number;
  knocks: number;
}

export interface PluginRegistryInstance {
  update(args: PluginRegistryArgs): void;
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

type FormKey = PluginRegistryArgs['form'];

export function createPluginRegistry(
  canvas: HTMLCanvasElement,
  emit: (snapshot: PluginRegistrySnapshot) => void,
): PluginRegistryInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  const root = new Context();
  const stats = new Map<number, { ticks: number; knocks: number }>();

  function stat(uid: number) {
    let entry = stats.get(uid);
    if (!entry) {
      entry = { ticks: 0, knocks: 0 };
      stats.set(uid, entry);
    }
    return entry;
  }

  // 三种形态共用的插件体：注册一个每秒心跳的 effect 和一个 knock 监听器。
  // 关键仍然是不保存任何清理函数——撤销由框架在实例销毁时自动执行。
  function heartbeatBody(ctx: Context) {
    // ctx.fiber 指向当前实例；每次注册都得到新的 uid，它是实例的身份证
    const uid = ctx.fiber.uid ?? 0;
    ctx.on('knock', () => {
      stat(uid).knocks += 1;
      paint();
    });
    ctx.effect(() => {
      const timer = setInterval(() => {
        stat(uid).ticks += 1;
        paint();
      }, 1000);
      return () => clearInterval(timer);
    });
  }

  // 形态一：函数。写成箭头函数以保证 apply 语义（原因见正文「函数形态的调用方式」）
  const heartbeat: Plugin.Function<HeartbeatConfig> = (ctx) => {
    heartbeatBody(ctx);
  };

  // 形态二：类。构造函数即插件体，插件名就是类名
  class Heartbeat {
    constructor(ctx: Context, config?: HeartbeatConfig) {
      heartbeatBody(ctx);
    }
  }

  // 形态三：对象。apply 属性即插件体，插件名来自 name 属性
  const heartbeatObject: Plugin.Object<HeartbeatConfig> = {
    name: 'heartbeat-object',
    apply(ctx: Context, config?: HeartbeatConfig) {
      heartbeatBody(ctx);
    },
  };

  const FORMS: Record<FormKey, { label: string; plugin: Plugin<HeartbeatConfig> }> = {
    function: { label: '函数形态', plugin: heartbeat },
    class: { label: '类形态', plugin: Heartbeat },
    object: { label: '对象形态', plugin: heartbeatObject },
  };

  let fibers: Fiber[] = [];
  let activeForm: FormKey | null = null;
  let pending: { form: FormKey | null; count: number } = { form: null, count: 0 };
  // 串行执行注册与销毁，避免快速切换控件时两者竞争
  let queue: Promise<void> = Promise.resolve();

  function snapshot(): PluginRegistrySnapshot {
    const entry = activeForm ? FORMS[activeForm] : undefined;
    // 实例列表直接来自真实注册表（runtime.fibers），而不是演示代码自己维护的数组
    const runtime = entry ? root.registry.get(entry.plugin) : undefined;
    const instances = (runtime ? [...runtime.fibers] : []).map((fiber) => {
      const uid = fiber.uid ?? 0;
      return {
        uid,
        state: STATE_LABELS[fiber.state] ?? String(fiber.state),
        ticks: stat(uid).ticks,
        knocks: stat(uid).knocks,
      };
    });
    return {
      formLabel: entry?.label ?? '—',
      registrySize: root.registry.size,
      runtimeName: runtime?.name ?? '—',
      instances,
      ticks: instances.reduce((sum, item) => sum + item.ticks, 0),
      knocks: instances.reduce((sum, item) => sum + item.knocks, 0),
    };
  }

  function paint() {
    const data = snapshot();
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(320, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 18px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('一个注册表，多个插件实例', 48, 56);

    // 注册表面板：运行时数量、运行时名称、注册表实际使用的键
    const entry = activeForm ? FORMS[activeForm] : undefined;
    const runtime = entry ? root.registry.get(entry.plugin) : undefined;
    let keyText = '—';
    if (entry && runtime) {
      // registry.resolve 返回注册表的键：函数 / 类是插件本身，对象是它的 apply
      keyText = root.registry.resolve(entry.plugin) === entry.plugin
        ? '插件本身（函数 / 类）'
        : 'plugin.apply（对象）';
    }

    drawingContext.strokeStyle = '#e2e8f0';
    drawingContext.lineWidth = 1;
    roundRect(drawingContext, 48, 78, width - 96, 84, 8);
    drawingContext.stroke();
    drawingContext.font = '14px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillStyle = '#172033';
    drawingContext.fillText(`registry.size = ${data.registrySize}`, 68, 104);
    drawingContext.fillText(`runtime.name = ${data.runtimeName}`, 68, 128);
    drawingContext.fillStyle = '#475569';
    drawingContext.fillText(`registry 键 = ${keyText}`, 68, 152);

    // 实例行：#uid + 状态徽章 + 各自的心跳 / knock 计数
    if (data.instances.length) {
      data.instances.forEach((item, index) => {
        const top = 186 + index * 40;
        drawingContext.fillStyle = '#172033';
        drawingContext.font =
          '600 15px ui-monospace, SFMono-Regular, Menlo, monospace';
        drawingContext.fillText(`#${item.uid}`, 48, top + 16);

        drawingContext.font = '600 11px ui-sans-serif, system-ui, sans-serif';
        const badgeWidth = drawingContext.measureText(item.state).width + 20;
        drawingContext.fillStyle = item.state === 'ACTIVE' ? '#4f7cff' : '#94a3b8';
        roundRect(drawingContext, 96, top, badgeWidth, 24, 12);
        drawingContext.fill();
        drawingContext.fillStyle = '#ffffff';
        drawingContext.fillText(item.state, 106, top + 16);

        drawingContext.fillStyle = '#475569';
        drawingContext.font = '13px ui-sans-serif, system-ui, sans-serif';
        drawingContext.fillText(
          `心跳 ${item.ticks} · 敲门 ${item.knocks}`,
          96 + badgeWidth + 16,
          top + 16,
        );
      });
    } else {
      drawingContext.fillStyle = '#94a3b8';
      drawingContext.font = '13px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText('注册表为空——调大「实例数量」注册插件', 48, 196);
    }

    drawingContext.fillStyle = '#94a3b8';
    drawingContext.font = '13px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('点击画布 → 每个实例各自响应一次 knock 事件', 48, height - 24);

    emit(data);
  }

  function update(args: PluginRegistryArgs) {
    if (args.form === pending.form && args.count === pending.count) {
      return;
    }
    pending = { form: args.form, count: args.count };
    queue = queue.then(async () => {
      // 形态变化：销毁全部现有实例，再按新形态注册
      if (pending.form !== activeForm) {
        while (fibers.length) {
          const fiber = fibers.pop()!;
          await fiber.dispose();
        }
        activeForm = pending.form;
      }
      // 数量变化：多退少补；销毁总是从最后注册的实例开始（LIFO）
      while (fibers.length > pending.count) {
        const fiber = fibers.pop()!;
        await fiber.dispose();
      }
      while (activeForm !== null && fibers.length < pending.count) {
        fibers.push(await root.plugin(FORMS[activeForm].plugin, {}));
      }
      paint();
    });
  }

  function handleClick() {
    // 无论有没有实例都分发事件：监听器是否还在，由各实例的「敲门」读数回答
    root.emit('knock');
  }

  canvas.addEventListener('click', handleClick);
  const resizeObserver = createResizeObserver(canvas, paint);

  return {
    update,
    dispose() {
      canvas.removeEventListener('click', handleClick);
      resizeObserver.disconnect();
      queue = queue.then(async () => {
        while (fibers.length) {
          const fiber = fibers.pop()!;
          await fiber.dispose();
        }
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
