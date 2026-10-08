/**
 * 范例介绍:模拟 store 插件的落盘时机——内存 KV 表与磁盘 store.json 是两个状态,
 *   autoSave 策略决定磁盘何时追上内存。
 * 输入:autoSave 策略(100ms 真实默认 / 1200ms 放慢演示 / false 关闭)、
 *   演示操作(set / save / delete / 优雅退出 / 强杀)。
 * 主要操作:切换操作即重放一条时间线:修改内存 → 防抖倒计时,或 save() / 退出触发写盘 →
 *   (退出场景)重启后从磁盘加载;进程状态与两块面板全程同步。
 * 预期结果:默认 / 1200ms 下,修改在防抖结束后落盘,save() 立即写盘并取消挂起的防抖;
 *   false 下磁盘一直停在旧值,直到 save() 或优雅退出;强杀发生在防抖窗口内时,窗口内的
 *   修改丢失(默认 100ms 的窗口很小,通常早已落盘)。
 * 阅读主线:内存与磁盘之间隔着一个落盘时机——autoSave 缩小窗口,save() 与优雅退出
 *   闭合窗口,强杀丢掉窗口内的数据。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type SaveMode = '100' | '1200' | 'false';

export type StoreAction = 'set' | 'save' | 'delete' | 'exit-graceful' | 'kill';

export interface ExampleArgs {
  mode: SaveMode;
  action: StoreAction;
}

export interface ExampleSnapshot {
  /** 读数:autoSave 策略。 */
  modeLabel: string;
  /** 读数:内存 store 的当前键值。 */
  memoryLabel: string;
  /** 读数:磁盘 store.json 的同步状态。 */
  diskLabel: string;
  /** 读数:磁盘文件内容(JSON 文本)。 */
  jsonLabel: string;
}

const MUTATE = 150;

interface StepDef {
  text: string;
  at: number;
  fail?: boolean;
}

interface Script {
  /** 内存变更时刻。 */
  mutateAt: number;
  /** 写盘时刻;null = 本场景不写盘。 */
  flushAt: number | null;
  /** 进程退出时刻。 */
  exitAt: number | null;
  /** 重启并从磁盘加载的时刻。 */
  relaunchAt: number | null;
  total: number;
  steps: StepDef[];
}

function buildScript(action: StoreAction, mode: SaveMode): Script {
  const debounce = mode === 'false' ? null : Number(mode);

  switch (action) {
    case 'set':
    case 'delete': {
      const call = action === 'set' ? "set('theme', 'dark')" : "delete('theme')";
      const steps: StepDef[] = [
        { text: `store.${call}`, at: 0 },
        { text: '内存已更新,磁盘未动', at: MUTATE },
      ];
      if (debounce === null) {
        steps.push({ text: 'autoSave: false —— 不自动写盘', at: MUTATE + 150 });
        steps.push({ text: '等待 save() 或优雅退出', at: MUTATE + 300 });
        return {
          mutateAt: MUTATE,
          flushAt: null,
          exitAt: null,
          relaunchAt: null,
          total: MUTATE + 700,
          steps,
        };
      }
      const flushAt = MUTATE + debounce;
      steps.push({ text: `防抖 ${debounce}ms 计时中…`, at: MUTATE });
      steps.push({ text: '防抖结束 → 写入 store.json', at: flushAt });
      steps.push({ text: '内存与磁盘一致', at: flushAt + 150 });
      return {
        mutateAt: MUTATE,
        flushAt,
        exitAt: null,
        relaunchAt: null,
        total: flushAt + 450,
        steps,
      };
    }
    case 'save': {
      const flushAt = MUTATE + 250;
      return {
        mutateAt: MUTATE,
        flushAt,
        exitAt: null,
        relaunchAt: null,
        total: flushAt + 500,
        steps: [
          { text: "set('theme', 'dark') 后紧跟 save()", at: 0 },
          { text: '内存已更新,磁盘未动', at: MUTATE },
          { text: 'save() 立即写盘,取消挂起的防抖', at: flushAt },
          { text: '内存与磁盘一致', at: flushAt + 150 },
        ],
      };
    }
    case 'exit-graceful': {
      // autoSave 开着且防抖能在退出前到点时,写盘走防抖;否则靠退出前的兜底保存。
      const autoFlush =
        debounce !== null && MUTATE + debounce < 500 ? MUTATE + debounce : null;
      const steps: StepDef[] = [
        { text: "set('theme', 'dark')(假设未及防抖)", at: 0 },
        { text: '内存已更新', at: MUTATE },
      ];
      if (autoFlush) {
        steps.push({ text: `防抖 ${debounce}ms 到点,已写入`, at: autoFlush });
      }
      steps.push({ text: '优雅退出:退出前保存全部 store', at: 500 });
      steps.push({ text: '重新启动:从 store.json 加载', at: 900 });
      steps.push({ text: '数据完好', at: 1100 });
      return {
        mutateAt: MUTATE,
        flushAt: autoFlush ?? 500,
        exitAt: 500,
        relaunchAt: 900,
        total: 1400,
        steps,
      };
    }
    case 'kill': {
      const flushAt = debounce === null ? null : MUTATE + debounce;
      const lost = flushAt === null || flushAt > 450;
      const steps: StepDef[] = [
        { text: "set('theme', 'dark')(假设未及防抖)", at: 0 },
        { text: '内存已更新', at: MUTATE },
        { text: '强杀进程:没有落盘机会', at: 450, fail: lost },
      ];
      if (flushAt !== null && !lost) {
        steps.push({
          text: `防抖 ${debounce}ms 到点,已写入(赶在强杀前)`,
          at: flushAt,
        });
      }
      steps.push({ text: '重新启动:从 store.json 加载', at: 900 });
      steps.push(
        lost
          ? { text: '防抖窗口内的修改丢失', at: 1100, fail: true }
          : { text: '默认 100ms 早已落盘,数据保住', at: 1100 },
      );
      return {
        mutateAt: MUTATE,
        flushAt: lost ? null : flushAt,
        exitAt: 450,
        relaunchAt: 900,
        total: 1500,
        steps,
      };
    }
  }
}

const TEXT = '#172033';
const DIM = '#64748b';
const PALE = '#94a3b8';
const ACCENT = '#4f7cff';
const OK = '#15803d';
const FAIL = '#b91c1c';
const WAIT = '#b45309';
const BOX_BG = '#ffffff';
const BOX_BORDER = '#dbe3f0';

const CANVAS_W = 700;
const CANVAS_H = 440;

const LEFT_X = 24;
const LEFT_W = 300;
const RIGHT_X = 348;
const RIGHT_W = 328;
const PANEL_Y = 20;
const PANEL_H = 216;
const TIMELINE_Y = 268;

type StepStatus = 'done' | 'current' | 'todo' | 'fail';

function roundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + w, y, x + w, y + h, radius);
  context.arcTo(x + w, y + h, x, y + h, radius);
  context.arcTo(x, y + h, x, y, radius);
  context.arcTo(x, y, x + w, y, radius);
  context.closePath();
}

export interface ExampleInstance {
  update(options: ExampleArgs): void;
  dispose(): void;
}

export function createExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ExampleSnapshot) => void,
): ExampleInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: ExampleArgs = { mode: '1200', action: 'set' };
  // 内存与磁盘跨场景持续存在:上次场景结束时两边是什么,这次就从什么开始。
  let memory: Record<string, unknown> = { theme: 'light' };
  let disk = '{"theme":"light"}';
  let processState: 'running' | 'exited' | 'relaunched' = 'running';
  let lastMutateAt = 0;

  let script = buildScript(current.action, current.mode);
  let startedAt = 0;
  let rafId = 0;
  let settleTimer = 0;
  let timers: number[] = [];

  function clearTimers(): void {
    if (rafId) {
      window.cancelAnimationFrame(rafId);
      rafId = 0;
    }
    if (settleTimer) {
      window.clearTimeout(settleTimer);
      settleTimer = 0;
    }
    timers.forEach((id) => window.clearTimeout(id));
    timers = [];
  }

  function panel(x: number, y: number, w: number, h: number): void {
    drawingContext.fillStyle = BOX_BG;
    roundRect(drawingContext, x, y, w, h, 6);
    drawingContext.fill();
    drawingContext.strokeStyle = BOX_BORDER;
    drawingContext.stroke();
  }

  function label(
    x: number,
    y: number,
    text: string,
    options: {
      color?: string;
      mono?: boolean;
      weight?: number;
      size?: number;
    } = {},
  ): void {
    drawingContext.fillStyle = options.color ?? TEXT;
    const size = options.size ?? 11;
    const family = options.mono
      ? 'ui-monospace, SFMono-Regular, Menlo, monospace'
      : 'ui-sans-serif, system-ui, sans-serif';
    drawingContext.font = `${options.weight ?? 400} ${size}px ${family}`;
    drawingContext.fillText(text, x, y);
  }

  function chip(x: number, y: number, text: string, color: string): void {
    drawingContext.fillStyle = color;
    drawingContext.font =
      '600 10.5px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(`● ${text}`, x, y);
  }

  function stepRow(x: number, y: number, text: string, status: StepStatus): void {
    const color =
      status === 'done'
        ? OK
        : status === 'current'
          ? ACCENT
          : status === 'fail'
            ? FAIL
            : PALE;
    const textColor = status === 'todo' ? PALE : status === 'fail' ? FAIL : TEXT;
    drawingContext.fillStyle = color;
    drawingContext.beginPath();
    drawingContext.arc(x + 6, y - 3, 4, 0, Math.PI * 2);
    drawingContext.fill();
    drawingContext.fillStyle = textColor;
    drawingContext.font = '11px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(text, x + 20, y);
  }

  function memoryJson(): string {
    return JSON.stringify(memory);
  }

  function draw(): void {
    const size = readCanvasSize(canvas);
    const width = Math.max(CANVAS_W, size.width);
    const height = Math.max(CANVAS_H, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);
    drawingContext.textAlign = 'left';

    const elapsed = startedAt === 0 ? script.total : performance.now() - startedAt;
    const phase = (at: number) => startedAt === 0 || elapsed >= at;
    const pending = memoryJson() !== disk;
    const flash = lastMutateAt > 0 && performance.now() - lastMutateAt < 400;

    /* 左列:进程与内存。 */
    panel(LEFT_X, PANEL_Y, LEFT_W, PANEL_H);
    label(LEFT_X + 12, PANEL_Y + 22, '进程与内存 store', { color: DIM, weight: 600 });
    const processText =
      processState === 'running'
        ? '运行中'
        : processState === 'exited'
          ? '已退出(未再启动)'
          : '已重启,内存来自磁盘';
    chip(
      LEFT_X + 12,
      PANEL_Y + 46,
      processText,
      processState === 'exited' ? FAIL : OK,
    );
    const keys = Object.keys(memory);
    if (keys.length === 0) {
      label(LEFT_X + 12, PANEL_Y + 84, '(空)', { color: PALE, mono: true });
    }
    keys.forEach((key, index) => {
      label(LEFT_X + 12, PANEL_Y + 84 + index * 22, `${key}: ${String(memory[key])}`, {
        mono: true,
        size: 12,
        color: flash && pending ? ACCENT : TEXT,
        weight: flash && pending ? 600 : 400,
      });
    });
    if (pending) {
      chip(LEFT_X + 12, PANEL_Y + PANEL_H - 18, '有未落盘修改', WAIT);
    } else {
      label(LEFT_X + 12, PANEL_Y + PANEL_H - 18, '内存与磁盘一致', { color: PALE });
    }

    /* 右列:磁盘 store.json。 */
    panel(RIGHT_X, PANEL_Y, RIGHT_W, PANEL_H);
    label(RIGHT_X + 12, PANEL_Y + 22, '磁盘 · appDataDir/store.json', {
      color: DIM,
      weight: 600,
    });
    let diskLabel = '已落盘';
    let diskColor = OK;
    if (pending) {
      if (script.flushAt !== null && !phase(script.flushAt)) {
        const remain = Math.max(0, Math.ceil(script.flushAt - elapsed));
        diskLabel = `防抖中 · 剩 ${remain}ms`;
        diskColor = WAIT;
      } else {
        diskLabel =
          current.mode === 'false' ? '未落盘(autoSave: false)' : '未落盘';
        diskColor = FAIL;
      }
    }
    chip(RIGHT_X + 12, PANEL_Y + 46, diskLabel, diskColor);
    label(RIGHT_X + 12, PANEL_Y + 84, disk, { mono: true, size: 12 });
    label(RIGHT_X + 12, PANEL_Y + 112, 'autoSave 策略决定这一行何时更新', {
      color: PALE,
      size: 10,
    });
    label(
      RIGHT_X + 12,
      PANEL_Y + PANEL_H - 18,
      current.mode === 'false'
        ? 'autoSave: false —— 只等 save() 或优雅退出'
        : `autoSave: ${current.mode === '100' ? '100(真实默认)' : '1200(放慢演示)'}ms 防抖`,
      { color: PALE, size: 10 },
    );

    /* 底部:时间线步骤。 */
    label(LEFT_X, TIMELINE_Y, '时间线', { color: DIM, weight: 600 });
    const finished = startedAt === 0 || elapsed >= script.total;
    script.steps.forEach((step, index) => {
      const reached = phase(step.at);
      const status: StepStatus = step.fail
        ? reached
          ? 'fail'
          : 'todo'
        : !reached
          ? 'todo'
          : finished
            ? 'done'
            : index === script.steps.length - 1 ||
                elapsed < (script.steps[index + 1]?.at ?? Infinity)
              ? 'current'
              : 'done';
      stepRow(LEFT_X + 8, TIMELINE_Y + 24 + index * 24, step.text, status);
    });

    label(RIGHT_X, height - 18, '演示放慢:1200ms(真实默认 100ms)', {
      color: PALE,
      size: 10,
    });

    emit({
      modeLabel:
        current.mode === 'false'
          ? 'false(关闭)'
          : `${current.mode}ms 防抖${current.mode === '100' ? '(默认)' : '(放慢演示)'}`,
      memoryLabel:
        keys.length === 0
          ? '(空)'
          : keys.map((key) => `${key}: ${String(memory[key])}`).join(' · '),
      diskLabel,
      jsonLabel: disk,
    });
  }

  function tick(): void {
    const elapsed = performance.now() - startedAt;
    draw();
    if (elapsed >= script.total) {
      rafId = 0;
      return;
    }
    rafId = window.requestAnimationFrame(tick);
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options) {
      clearTimers();
      current = options;
      script = buildScript(current.action, current.mode);

      // 按时间线调度真实状态变更:改内存 → 写盘 → 退出 → 重启加载。
      timers.push(
        window.setTimeout(() => {
          if (current.action === 'set') {
            memory = { ...memory, theme: 'dark' };
          } else if (current.action === 'delete') {
            const next = { ...memory };
            delete next.theme;
            memory = next;
          }
          lastMutateAt = performance.now();
          draw();
        }, script.mutateAt),
      );
      if (script.flushAt !== null) {
        const flushAt = script.flushAt;
        timers.push(
          window.setTimeout(() => {
            disk = memoryJson();
            draw();
          }, flushAt),
        );
      }
      if (script.exitAt !== null) {
        timers.push(
          window.setTimeout(() => {
            processState = 'exited';
            draw();
          }, script.exitAt),
        );
      }
      if (script.relaunchAt !== null) {
        timers.push(
          window.setTimeout(() => {
            memory = JSON.parse(disk) as Record<string, unknown>;
            processState = 'relaunched';
            draw();
          }, script.relaunchAt),
        );
      }

      startedAt = performance.now();
      draw();
      rafId = window.requestAnimationFrame(tick);
      // 兜底:动画结束后再刷新一次读数,避免节流吞掉最终结算。
      settleTimer = window.setTimeout(() => draw(), script.total + 150);
    },
    dispose() {
      clearTimers();
      resizeObserver.disconnect();
    },
  };
}
