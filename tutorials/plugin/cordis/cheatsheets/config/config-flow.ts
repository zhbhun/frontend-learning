/**
 * 范例介绍：把「定义 → 校验 → 到达」放进真实 cordis 运行——插件 bell 用手写的
 * Standard Schema 声明 Config，每次 Controls 变化都重新走一遍 ctx.plugin(bell, config)，
 * 观察校验产物、fiber 状态与插件内实际收到的配置。
 * 输入（Controls）：greeting（文本）、volume（1-10，schema 只接受 1-5）、
 * variant（输入变体：合法透传 / greeting 换成数字 / 附加 schema 外字段）；
 * 点击画布向根上下文分发一次 'ring' 事件。
 * 操作：variant 决定第二参的原始形态；greeting 清空演示默认值收敛；
 * volume 超范围与类型冒充演示 issues 与 ValidationError。
 * 预期结果：合法时 value 收敛后到达 apply（默认值填充、未声明字段被裁剪），
 * fiber.state 为 2、ring 有响应；非法时显示 ValidationError 原文、fiber.state 停在 0、
 * apply 从未执行、ring 无响应，但实例仍占用注册表。
 * 阅读主线：bellSchema → bell 插件体 → buildInput() → update() 的注册分支 → paint()。
 */
import { Context, type Fiber, type Plugin } from 'cordis';
import type { StandardSchemaV1 } from '@standard-schema/spec';

import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

// 声明本范例用到的自定义事件名，让 ctx.on / ctx.emit 获得类型检查
declare module 'cordis' {
  interface Events {
    ring(): void;
  }
}

/** Controls 提供的读者输入 */
export interface ConfigFlowArgs {
  greeting: string;
  volume: number;
  variant: 'plain' | 'bad-type' | 'extra-field';
}

/** 校验后到达插件体的配置形态（schema 的 output） */
export interface BellConfig {
  greeting: string;
  volume: number;
}

/** 供读数与绘图消费的运行时快照 */
export interface ConfigFlowSnapshot {
  inputJson: string;
  verdict: string;
  stateLabel: string;
  reachedJson: string;
  registryLabel: string;
  rings: number;
}

export interface ConfigFlowInstance {
  update(args: ConfigFlowArgs): void;
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

// 手写的 Standard Schema V1：默认值收敛（greeting / volume）、类型与范围校验，
// 并且只输出声明过的两个字段——字段裁剪是 schema 自己的行为，cordis 只取 result.value。
const bellSchema: StandardSchemaV1<unknown, BellConfig> = {
  '~standard': {
    version: 1,
    vendor: 'cordis-cheatsheet',
    validate(value) {
      if (typeof value !== 'object' || value === null) {
        return { issues: [{ message: 'expected an object' }] };
      }
      const source = value as Record<string, unknown>;
      const issues: StandardSchemaV1.Issue[] = [];

      let greeting = 'hello'; // 默认值：缺省或空串都视为未提供
      if (source.greeting !== undefined) {
        if (typeof source.greeting !== 'string') {
          issues.push({ message: 'expected string', path: ['greeting'] });
        } else if (source.greeting) {
          greeting = source.greeting;
        }
      }

      let volume = 3; // 默认值 3：缺省视为未提供
      if (source.volume !== undefined) {
        if (typeof source.volume !== 'number') {
          issues.push({ message: 'expected number', path: ['volume'] });
        } else {
          volume = source.volume;
        }
      }
      if (!Number.isInteger(volume) || volume < 1 || volume > 5) {
        issues.push({ message: 'expected integer 1-5', path: ['volume'] });
      }

      if (issues.length) return { issues };
      return { value: { greeting, volume } };
    },
  },
};

/** 一次注册尝试的完整记录：输入、校验产物与到达情况全部来自真实 cordis 运行 */
interface Attempt {
  input: Record<string, unknown>;
  ok: boolean;
  value?: BellConfig;
  errorName?: string;
  errorMessage?: string;
  state: number;
  reachedJson: string;
  registryLabel: string;
}

export function createConfigFlow(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ConfigFlowSnapshot) => void,
): ConfigFlowInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  const root = new Context();

  let attempt: Attempt | null = null;
  let rings = 0;
  let fiber: Fiber | null = null;
  let pending: ConfigFlowArgs | null = null;
  // 串行执行注册与销毁，避免快速切换控件时两者竞争
  let queue: Promise<void> = Promise.resolve();

  // 插件体（箭头函数，保证返回值被收集为 disposer）：把到达的 config 记录下来，
  // 并注册一个 ring 监听器——校验失败时这两件事都不会发生，读数随之给出「未到达」的证据
  const bell: Plugin.Function<BellConfig> = (ctx, config) => {
    if (attempt) {
      attempt.reachedJson = JSON.stringify(config);
    }
    ctx.on('ring', () => {
      rings += 1;
      paint();
    });
  };
  bell.Config = bellSchema;

  function buildInput(args: ConfigFlowArgs): Record<string, unknown> {
    switch (args.variant) {
      case 'bad-type':
        // 用数字冒充 greeting：制造带 path 的类型 issue
        return { greeting: 12345, volume: args.volume };
      case 'extra-field':
        // 附加 schema 未声明的字段：观察 value 的裁剪
        return {
          greeting: args.greeting,
          volume: args.volume,
          debug: 'schema 外字段',
        };
      default:
        return { greeting: args.greeting, volume: args.volume };
    }
  }

  function snapshot(): ConfigFlowSnapshot {
    return {
      inputJson: attempt ? JSON.stringify(attempt.input) : '—',
      verdict: !attempt
        ? '—'
        : attempt.ok
          ? '通过 → value 已收敛'
          : `失败 → ${attempt.errorName}`,
      stateLabel: attempt
        ? `${attempt.state} ${STATE_LABELS[attempt.state] ?? ''}`.trim()
        : '—',
      reachedJson: attempt?.reachedJson ?? '—',
      registryLabel: attempt?.registryLabel ?? '—',
      rings,
    };
  }

  function paint() {
    const data = snapshot();
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(460, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 18px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('配置的旅程：定义 → 校验 → 到达', 48, 40);

    // 两栏布局：左栏是输入与校验，右栏是 schema 摘要与到达；底部留给共享读数浮层
    const gap = 16;
    const leftWidth = Math.floor((width - 96 - gap) * 0.56);
    const rightX = 48 + leftWidth + gap;
    const rightWidth = width - 96 - gap - leftWidth;

    // 第一行左：原始输入
    drawPanel(48, 56, leftWidth, 92, '#e2e8f0');
    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 13px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('① 输入 · ctx.plugin(bell, config) 的第二参', 64, 76);
    drawingContext.fillStyle = '#475569';
    drawingContext.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawWrapped(data.inputJson, 64, 96, leftWidth - 32, 3);

    // 第一行右：schema 摘要（定义侧）
    drawPanel(rightX, 56, rightWidth, 92, '#e2e8f0');
    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 13px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('bell.Config · 手写 Standard Schema', rightX + 16, 76);
    drawingContext.fillStyle = '#475569';
    drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('greeting: 非空 string；缺省 / 空串 → "hello"', rightX + 16, 96);
    drawingContext.fillText('volume: 整数 1-5；缺省 → 3', rightX + 16, 114);
    drawingContext.fillText('未声明的字段不进入 value', rightX + 16, 132);

    // 两行之间的校验入口
    drawingContext.fillStyle = '#4f7cff';
    drawingContext.font = '600 13px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('↓ resolveConfig（fiber.ts）：透传或同步 validate 一次', 48, 166);

    // 第二行左：校验产物
    if (!attempt) {
      drawPanel(48, 176, leftWidth, 126, '#e2e8f0');
      drawingContext.fillStyle = '#94a3b8';
      drawingContext.font = '13px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText('调整 Controls 后开始第一次注册', 64, 200);
    } else if (attempt.ok) {
      drawPanel(48, 176, leftWidth, 126, '#16a34a');
      drawingContext.fillStyle = '#16a34a';
      drawingContext.font = '600 13px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText('② 校验 · validate → { value }（通过）', 64, 198);
      drawingContext.fillStyle = '#172033';
      drawingContext.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
      drawWrapped(JSON.stringify(attempt.value), 64, 220, leftWidth - 32, 2);
      drawingContext.fillStyle = '#475569';
      drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
      describeConvergence().slice(0, 2).forEach((line, index) => {
        drawingContext.fillText(line, 64, 258 + index * 18);
      });
    } else {
      drawPanel(48, 176, leftWidth, 126, '#dc2626');
      drawingContext.fillStyle = '#dc2626';
      drawingContext.font = '600 13px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText('② 校验 · validate → { issues } → ValidationError', 64, 198);
      drawingContext.fillStyle = '#b91c1c';
      drawingContext.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
      drawWrapped(attempt.errorMessage ?? '', 64, 220, leftWidth - 32, 4);
    }

    // 第二行右：到达情况
    drawPanel(rightX, 176, rightWidth, 126, '#e2e8f0');
    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 13px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('③ 到达 · fiber.config → apply(ctx, config)', rightX + 16, 198);
    if (attempt && attempt.ok) {
      const badge = stateBadge(attempt.state);
      drawBadge(badge, rightX + 16, 212, '#4f7cff');
      drawingContext.fillStyle = '#172033';
      drawingContext.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
      drawWrapped(`apply 收到 ${attempt.reachedJson}`, rightX + 16, 258, rightWidth - 32, 2);
      drawingContext.fillStyle = '#475569';
      drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText(`已响应 ring ×${rings}`, rightX + 16, 294);
      // 方块数量直观呈现「插件拿到的是收敛后的 volume」
      const squares = attempt.value?.volume ?? 0;
      for (let index = 0; index < squares; index += 1) {
        drawingContext.fillStyle = '#4f7cff';
        drawingContext.fillRect(rightX + rightWidth - 30 - index * 20, 282, 14, 14);
      }
    } else if (attempt) {
      const badge = stateBadge(attempt.state);
      drawBadge(badge, rightX + 16, 212, '#94a3b8');
      drawingContext.fillStyle = '#475569';
      drawingContext.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
      drawingContext.fillText('fiber.config = undefined', rightX + 16, 258);
      drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText('插件体从未执行，ring 监听器不存在', rightX + 16, 278);
      drawingContext.fillText(
        `registry.has(bell) = ${attempt.registryLabel}——实例仍占用注册表`,
        rightX + 16,
        296,
      );
    } else {
      drawingContext.fillStyle = '#94a3b8';
      drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText('—', rightX + 16, 258);
    }

    emit(data);
  }

  /** 对比输入与 value，用一行文字说清这次校验收敛了什么 */
  function describeConvergence(): string[] {
    if (!attempt || !attempt.ok || !attempt.value) {
      return [];
    }
    const notes: string[] = [];
    const keys = new Set([
      ...Object.keys(attempt.input),
      ...Object.keys(attempt.value),
    ]);
    for (const key of keys) {
      if (!(key in attempt.value)) {
        notes.push(`${key}：输入有、value 无（schema 未声明 → 被裁剪）`);
      } else if (
        attempt.input[key] !== attempt.value[key as keyof BellConfig]
      ) {
        notes.push(
          `${key}：${JSON.stringify(attempt.input[key])} → ${JSON.stringify(
            attempt.value[key as keyof BellConfig],
          )}`,
        );
      }
    }
    if (!notes.length) {
      notes.push('value 与输入一致');
    }
    return notes;
  }

  function stateBadge(state: number) {
    return `${state} ${STATE_LABELS[state] ?? ''}`.trim();
  }

  function drawWrapped(
    text: string,
    x: number,
    firstY: number,
    maxWidth: number,
    maxLines: number,
  ) {
    // ValidationError 的 message 本身就是多行文本：先按换行拆开，再逐行折行
    const lines = text
      .split('\n')
      .flatMap((line) => wrapText(drawingContext, line, maxWidth, maxLines))
      .slice(0, maxLines);
    lines.forEach((line, index) => {
      drawingContext.fillText(line, x, firstY + index * 18);
    });
  }

  function drawPanel(
    x: number,
    y: number,
    panelWidth: number,
    panelHeight: number,
    color: string,
  ) {
    drawingContext.strokeStyle = color;
    drawingContext.lineWidth = 1;
    roundRect(drawingContext, x, y, panelWidth, panelHeight, 8);
    drawingContext.stroke();
  }

  function drawBadge(text: string, x: number, y: number, color: string) {
    drawingContext.font = '600 11px ui-sans-serif, system-ui, sans-serif';
    const width = drawingContext.measureText(text).width + 20;
    drawingContext.fillStyle = color;
    roundRect(drawingContext, x, y, width, 22, 11);
    drawingContext.fill();
    drawingContext.fillStyle = '#ffffff';
    drawingContext.fillText(text, x + 10, y + 15);
    return width;
  }

  function update(args: ConfigFlowArgs) {
    if (
      pending &&
      pending.greeting === args.greeting &&
      pending.volume === args.volume &&
      pending.variant === args.variant
    ) {
      return;
    }
    pending = { ...args };
    const next = pending;
    queue = queue.then(async () => {
      // 先释放上一次的实例——校验失败的实例同样占用注册表，也需要 dispose
      if (fiber) {
        await fiber.dispose();
        fiber = null;
      }
      rings = 0;
      const input = buildInput(next);
      const record: Attempt = {
        input,
        ok: false,
        state: 0,
        reachedJson: '未到达',
        registryLabel: '—',
      };
      attempt = record;
      // 配置来自 Controls，本质是未校验的 unknown；类型上按插件要求断言后再交给注册表
      const registered = root.plugin(bell, input as unknown as BellConfig);
      fiber = registered;
      try {
        await registered; // 校验失败时这里以 ValidationError 拒绝
        record.ok = true;
        record.value = registered.config;
      } catch (error) {
        record.errorName = (error as Error).name;
        record.errorMessage = (error as Error).message;
      }
      record.state = registered.state;
      record.registryLabel = String(root.registry.has(bell));
      paint();
    });
  }

  function handleClick() {
    // 无论校验是否通过都分发事件：监听器是否存在，由「已响应 ring」读数回答
    root.emit('ring');
  }

  canvas.addEventListener('click', handleClick);
  const resizeObserver = createResizeObserver(canvas, paint);

  return {
    update,
    dispose() {
      canvas.removeEventListener('click', handleClick);
      resizeObserver.disconnect();
      queue = queue.then(async () => {
        if (fiber) {
          await fiber.dispose();
          fiber = null;
        }
      });
    },
  };
}

function wrapText(
  target: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const lines: string[] = [];
  let current = '';
  for (const char of text) {
    if (current && target.measureText(current + char).width > maxWidth) {
      lines.push(current);
      current = char;
    } else {
      current += char;
    }
  }
  if (current) {
    lines.push(current);
  }
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = lines[maxLines - 1].slice(0, -1) + '…';
  }
  return lines;
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
