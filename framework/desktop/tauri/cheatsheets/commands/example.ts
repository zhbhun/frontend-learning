/**
 * 范例介绍:演示一次 invoke 往返中每一段的形态(前端调用 → IPC 参数 → Rust 命令 → IPC 响应 → Promise)。
 * 输入:要观察的命令(基本参数 / 命名转换 / rename_all / 异步 / Result 错误 / 自定义错误六种形态)。
 * 主要操作:顶部画出注册后的 generate_handler! 路由表(当前命令高亮),下方按往返顺序画出五段;
 *   fib 为异步命令,Promise 先 pending 约 0.9 秒再兑现,其余命令直接给出结果。
 * 预期结果:每段文本与所选命令一一对应;错误形态的命令,IPC 响应就是序列化后的 Err,
 *   Promise 行变为 rejected;fib 的读数显示执行位置在 async_runtime 独立任务。
 * 阅读主线:命令是一次跨语言函数调用——两端靠命令名与参数键对齐,靠 serde 序列化传值,
 *   Err 序列化后直接作为 Promise 的拒绝原因。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type CommandVariant =
  | 'add'
  | 'greet'
  | 'read_config'
  | 'fib'
  | 'divide'
  | 'read_note';

export interface ExampleArgs {
  variant: CommandVariant;
}

export interface ExampleSnapshot {
  /** 读数:命令形态标签。 */
  label: string;
  /** 读数:Rust 侧执行位置。 */
  execution: string;
  /** 读数:Promise 状态。 */
  promiseState: string;
  /** 读数:resolve 值或 reject 原因。 */
  promiseValue: string;
}

type SettledKind = 'fulfilled' | 'rejected';

interface Preset {
  label: string;
  invokeLine: string;
  payload: string;
  payloadNote?: string;
  rustLines: string[];
  response: string;
  promise: string;
  kind: SettledKind;
  execution: string;
  promiseValue: string;
}

const SYNC_EXECUTION = '主线程(同步命令)';

/* 六条演示命令各自的往返形态(对应正文各小节的核对点)。 */
const COMMANDS: Record<CommandVariant, Preset> = {
  add: {
    label: '基本参数与返回值',
    invokeLine: "await invoke<number>('add', { left: 2, right: 3 })",
    payload: '{"left":2,"right":3}',
    rustLines: ['#[tauri::command]', 'fn add(left: i32, right: i32) -> i32'],
    response: '5',
    promise: 'fulfilled → 5',
    kind: 'fulfilled',
    execution: SYNC_EXECUTION,
    promiseValue: '5',
  },
  greet: {
    label: '参数命名自动转换',
    invokeLine: "await invoke<string>('greet', { userName: 'Ada' })",
    payload: '{"userName":"Ada"}',
    payloadNote: '键 userName 自动匹配形参 user_name',
    rustLines: ['#[tauri::command]', 'fn greet(user_name: &str) -> String'],
    response: '"Hello, Ada!"',
    promise: 'fulfilled → "Hello, Ada!"',
    kind: 'fulfilled',
    execution: SYNC_EXECUTION,
    promiseValue: '"Hello, Ada!"',
  },
  read_config: {
    label: 'rename_all = "snake_case"',
    invokeLine:
      "await invoke<string>('read_config', { config_path: './app.toml' })",
    payload: '{"config_path":"./app.toml"}',
    payloadNote: '键按原样匹配 snake_case 形参,不做转换',
    rustLines: [
      '#[tauri::command(rename_all = "snake_case")]',
      'fn read_config(config_path: String) -> String',
    ],
    response: '"port = 8080"',
    promise: 'fulfilled → "port = 8080"',
    kind: 'fulfilled',
    execution: SYNC_EXECUTION,
    promiseValue: '"port = 8080"',
  },
  fib: {
    label: '异步命令',
    invokeLine: "await invoke<number>('fib', { n: 30 })",
    payload: '{"n":30}',
    rustLines: ['#[tauri::command]', 'async fn fib(n: u32) -> u64'],
    response: '832040',
    promise: 'fulfilled → 832040',
    kind: 'fulfilled',
    execution: 'async_runtime 独立任务(不阻塞主线程)',
    promiseValue: '832040',
  },
  divide: {
    label: 'Result 错误 → reject',
    invokeLine:
      "await invoke<number>('divide', { dividend: 10, divisor: 0 })",
    payload: '{"dividend":10,"divisor":0}',
    rustLines: [
      '#[tauri::command]',
      'fn divide(dividend: f64, divisor: f64) -> Result<f64, String>',
    ],
    response: '"除数不能为 0"',
    promise: 'rejected → "除数不能为 0"',
    kind: 'rejected',
    execution: SYNC_EXECUTION,
    promiseValue: '"除数不能为 0"',
  },
  read_note: {
    label: '自定义错误类型',
    invokeLine:
      "await invoke<string>('read_note', { path: 'notes/todo.txt' })",
    payload: '{"path":"notes/todo.txt"}',
    rustLines: [
      '#[derive(thiserror::Error, serde::Serialize)]',
      '#[serde(tag = "kind", content = "message")]',
      'enum ReadNoteError { Io(String), Utf8(String) }',
      '#[tauri::command]',
      'fn read_note(path: String) -> Result<String, ReadNoteError>',
    ],
    response: '{"kind":"io","message":"文件不存在"}',
    promise: "rejected → { kind: 'io', message: '文件不存在' }",
    kind: 'rejected',
    execution: SYNC_EXECUTION,
    promiseValue: "{ kind: 'io', message: '文件不存在' }",
  },
};

const VARIANTS = Object.keys(COMMANDS) as CommandVariant[];

const TEXT = '#172033';
const DIM = '#64748b';
const PALE = '#cbd5e1';
const ACCENT = '#4f7cff';
const OK = '#15803d';
const ERR = '#b91c1c';
const PENDING = '#b45309';
const BOX_BG = '#ffffff';
const BOX_BORDER = '#dbe3f0';

const PENDING_MS = 900;
const LABEL_X = 24;
const BOX_X = 110;
const BOX_MIN_H = 26;
const LINE_H = 14;
const GAP = 18;

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

  let current: CommandVariant = 'add';
  let pendingUntil: number | null = null;
  let rafId = 0;
  let settleTimerId = 0;

  function cancelTimers(): void {
    if (rafId) {
      window.cancelAnimationFrame(rafId);
      rafId = 0;
    }
    if (settleTimerId) {
      window.clearTimeout(settleTimerId);
      settleTimerId = 0;
    }
  }

  function draw(): void {
    const size = readCanvasSize(canvas);
    const width = Math.max(700, size.width);
    const height = Math.max(400, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);
    drawingContext.textAlign = 'left';

    const preset = COMMANDS[current];
    const pending =
      current === 'fib' &&
      pendingUntil !== null &&
      performance.now() < pendingUntil;
    const boxW = width - BOX_X - 24;

    // 顶部:注册后的路由表。前端按命令名在这里找到函数,当前命令高亮。
    drawingContext.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    let headerX = LABEL_X;
    const segments: { text: string; color: string }[] = [
      { text: 'generate_handler![', color: DIM },
    ];
    VARIANTS.forEach((name, index) => {
      if (index > 0) {
        segments.push({ text: ', ', color: DIM });
      }
      segments.push({ text: name, color: name === current ? ACCENT : DIM });
    });
    segments.push({ text: ']', color: DIM });
    segments.forEach((segment) => {
      drawingContext.fillStyle = segment.color;
      drawingContext.fillText(segment.text, headerX, 20);
      headerX += drawingContext.measureText(segment.text).width;
    });

    // 五段往返:每段 = 左侧标签 + 右侧内容框,段间用向下箭头衔接。
    interface Stage {
      label: string;
      lines: { text: string; color: string }[];
      note?: string;
      isPromise?: boolean;
    }

    const promiseKind = pending ? 'pending' : preset.kind;
    const promiseColor =
      promiseKind === 'pending'
        ? PENDING
        : promiseKind === 'rejected'
          ? ERR
          : OK;

    const stages: Stage[] = [
      { label: '前端调用', lines: [{ text: preset.invokeLine, color: TEXT }] },
      {
        label: 'IPC 参数',
        lines: [{ text: preset.payload, color: TEXT }],
        note: preset.payloadNote,
      },
      {
        label: 'Rust 命令',
        lines: preset.rustLines.map((line) => ({
          text: line,
          color: line.startsWith('#[') ? DIM : TEXT,
        })),
      },
      {
        label: 'IPC 响应',
        lines: [
          pending
            ? { text: '…(任务完成后回传)', color: DIM }
            : { text: preset.response, color: TEXT },
        ],
      },
      {
        label: 'Promise',
        isPromise: true,
        lines: [
          pending
            ? { text: 'pending(耗时任务执行中…)', color: promiseColor }
            : { text: preset.promise, color: promiseColor },
        ],
      },
    ];

    let y = 36;
    let prevBottom = 0;
    stages.forEach((stage, index) => {
      const rows = stage.lines.length + (stage.note ? 1 : 0);
      const h = BOX_MIN_H + (rows - 1) * LINE_H;

      if (index > 0) {
        drawingContext.strokeStyle = PALE;
        drawingContext.beginPath();
        drawingContext.moveTo(70, prevBottom + 3);
        drawingContext.lineTo(70, y - 8);
        drawingContext.stroke();
        drawingContext.fillStyle = PALE;
        drawingContext.beginPath();
        drawingContext.moveTo(70, y - 2);
        drawingContext.lineTo(66.5, y - 9);
        drawingContext.lineTo(73.5, y - 9);
        drawingContext.closePath();
        drawingContext.fill();
      }

      drawingContext.fillStyle = BOX_BG;
      roundRect(drawingContext, BOX_X, y, boxW, h, 6);
      drawingContext.fill();
      drawingContext.strokeStyle = BOX_BORDER;
      drawingContext.stroke();

      drawingContext.fillStyle = DIM;
      drawingContext.font = '600 11px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText(stage.label, LABEL_X, y + h / 2 + 4);

      drawingContext.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
      let lineY = y + 17;
      stage.lines.forEach((line, lineIndex) => {
        if (line.text) {
          if (stage.isPromise && lineIndex === 0) {
            drawingContext.fillStyle = line.color;
            drawingContext.beginPath();
            drawingContext.arc(BOX_X + 20, lineY - 4, 4, 0, Math.PI * 2);
            drawingContext.fill();
          }
          const textX =
            stage.isPromise && lineIndex === 0 ? BOX_X + 32 : BOX_X + 12;
          drawingContext.fillStyle = line.color;
          drawingContext.fillText(line.text, textX, lineY);
        }
        lineY += LINE_H;
      });
      if (stage.note) {
        drawingContext.fillStyle = DIM;
        drawingContext.font = '11px ui-sans-serif, system-ui, sans-serif';
        drawingContext.fillText(stage.note, BOX_X + 12, lineY + 1);
      }

      prevBottom = y + h;
      y = prevBottom + GAP;
    });

    emit({
      label: preset.label,
      execution: preset.execution,
      promiseState: pending ? 'pending(执行中)' : preset.kind,
      promiseValue: pending ? '等待任务完成…' : preset.promiseValue,
    });
  }

  function tick(): void {
    if (pendingUntil === null) {
      rafId = 0;
      return;
    }
    if (performance.now() >= pendingUntil) {
      // 兑现帧;读数有 100ms 节流,稍后补一次绘制确保最终读数被刷新。
      pendingUntil = null;
      rafId = 0;
      draw();
      settleTimerId = window.setTimeout(() => {
        settleTimerId = 0;
        draw();
      }, 180);
      return;
    }
    draw();
    rafId = window.requestAnimationFrame(tick);
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options) {
      cancelTimers();
      current = options.variant;
      if (current === 'fib') {
        // 异步命令模拟:Promise 先 pending 一小段时间再兑现。
        pendingUntil = performance.now() + PENDING_MS;
        draw();
        rafId = window.requestAnimationFrame(tick);
      } else {
        pendingUntil = null;
        draw();
      }
    },
    dispose() {
      cancelTimers();
      resizeObserver.disconnect();
    },
  };
}
