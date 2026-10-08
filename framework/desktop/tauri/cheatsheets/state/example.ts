/**
 * 范例介绍:模拟 Tauri 的托管状态——状态表按类型各存一份,命令经注入的 State<'_, T>
 *   以借用方式访问,可变部分包在容器里,锁的占用与释放全程可见。
 * 输入:演示命令(increment / add-item / wrong-type / slow-job)。
 * 主要操作:切换命令即重放一次调用:前端 invoke → 按类型查找状态槽 → 拿锁(锁行点亮)
 *   → 修改(数值闪动)→ 释放 → Promise 结算;状态值跨场景持续累积,不会重置。
 * 预期结果:increment / add-item 修改同一份 Mutex<AppState> 并 resolve 新值;wrong-type
 *   因命令参数类型与注册类型不符被 reject("state not managed…"),状态不变;slow-job
 *   中 start_job 跨 await 持有 async_runtime::Mutex<JobQueue> 的锁,enqueue 排队等待,
 *   锁释放后才获锁——而 Mutex<AppState> 的锁全程空闲,两个槽互不阻塞。
 * 阅读主线:托管状态按类型共享——一个类型一份、同一时刻只允许一个持锁者,类型对不上就查不到。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type CommandVariant =
  | 'increment'
  | 'add-item'
  | 'wrong-type'
  | 'slow-job';

export interface ExampleArgs {
  command: CommandVariant;
}

export interface ExampleSnapshot {
  /** 读数:本次演示的前端调用。 */
  callLabel: string;
  /** 读数:Promise 结算结果。 */
  resultLabel: string;
  /** 读数:AppState 的当前值(跨场景累积)。 */
  appStateLabel: string;
  /** 读数:Mutex<AppState> 的锁占用。 */
  appStateLockLabel: string;
  /** 读数:async_runtime::Mutex<JobQueue> 的锁占用。 */
  jobLockLabel: string;
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
const CANVAS_H = 430;

/* 布局:左列为前端面板与两个类型槽,右列为命令执行卡。 */
const LEFT_X = 24;
const LEFT_W = 280;
const RIGHT_X = 330;
const RIGHT_W = 346;

const FRONT_Y = 20;
const FRONT_H = 88;
const SLOTS_TITLE_Y = 132;
const SLOT1_Y = 144;
const SLOT_H = 100;
const SLOT2_Y = 256;

const LIST_TITLE_Y = 132;
const CARD1_Y = 144;

/* 动画时间线(毫秒):各阶段起点。 */
const TL = {
  invoke: 0,
  lookup: 280,
  locked: 560,
  mutate: 700,
  release: 940,
  resolve: 1120,
  total: 1350,
};
const TL_FAIL = {
  invoke: 0,
  lookup: 320,
  reject: 760,
  total: 1000,
};
const TL_JOB = {
  invoke: 0, // invoke('start_job')
  locked: 320, // start_job 拿到 JobQueue 的锁
  awaiting: 620, // 跨 await:写文件中,锁仍被持有
  invoke2: 900, // invoke('enqueue') 到达,开始排队
  release: 1560, // start_job 释放并 resolve
  locked2: 1680, // enqueue 获锁
  mutate2: 1820, // jobs += 1
  release2: 2000, // enqueue 释放
  resolve: 2140, // 两条调用全部结算
  total: 2300,
};

type StepStatus = 'done' | 'current' | 'todo' | 'fail';

interface StepDef {
  text: string;
  at: number;
  fail?: boolean;
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

  let current: ExampleArgs = { command: 'increment' };
  // 共享状态跨场景持续累积:两次演示之间它一直存活,这正是本课的主题。
  const state = { counter: 0, items: 0, jobs: 0 };
  let startedAt = 0;
  let rafId = 0;
  let settleTimer = 0;
  let mutateTimers: number[] = [];

  function clearTimers(): void {
    if (rafId) {
      window.cancelAnimationFrame(rafId);
      rafId = 0;
    }
    if (settleTimer) {
      window.clearTimeout(settleTimer);
      settleTimer = 0;
    }
    mutateTimers.forEach((id) => window.clearTimeout(id));
    mutateTimers = [];
  }

  function roundRect(x: number, y: number, w: number, h: number, r: number): void {
    const radius = Math.min(r, w / 2, h / 2);
    drawingContext.beginPath();
    drawingContext.moveTo(x + radius, y);
    drawingContext.arcTo(x + w, y, x + w, y + h, radius);
    drawingContext.arcTo(x + w, y + h, x, y + h, radius);
    drawingContext.arcTo(x, y + h, x, y, radius);
    drawingContext.arcTo(x, y, x + w, y, radius);
    drawingContext.closePath();
  }

  function panel(
    x: number,
    y: number,
    w: number,
    h: number,
    borderColor: string,
  ): void {
    drawingContext.fillStyle = BOX_BG;
    roundRect(x, y, w, h, 6);
    drawingContext.fill();
    drawingContext.strokeStyle = borderColor;
    drawingContext.stroke();
  }

  function label(
    x: number,
    y: number,
    text: string,
    options: { color?: string; mono?: boolean; weight?: number; size?: number },
  ): void {
    drawingContext.fillStyle = options.color ?? TEXT;
    const size = options.size ?? 11;
    const family = options.mono
      ? 'ui-monospace, SFMono-Regular, Menlo, monospace'
      : 'ui-sans-serif, system-ui, sans-serif';
    drawingContext.font = `${options.weight ?? 400} ${size}px ${family}`;
    drawingContext.fillText(text, x, y);
  }

  /* 步骤行:圆点标记状态(完成 / 当前 / 未到 / 失败),文字随状态着色。 */
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

  function drawStepList(
    x: number,
    y: number,
    steps: StepDef[],
    done: boolean,
    phase: (at: number) => boolean,
    lineHeight = 28,
  ): void {
    steps.forEach((step, index) => {
      const rowY = y + index * lineHeight;
      const status: StepStatus = step.fail
        ? phase(step.at)
          ? 'fail'
          : 'todo'
        : done
          ? 'done'
          : phase(step.at)
            ? 'current'
            : 'todo';
      stepRow(x, rowY, step.text, status);
    });
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

    const command = current.command;
    const isJob = command === 'slow-job';
    const isFail = command === 'wrong-type';
    const tl = isFail ? TL_FAIL : isJob ? TL_JOB : TL;
    const elapsed = startedAt === 0 ? tl.total : performance.now() - startedAt;
    const done = startedAt === 0 || elapsed >= tl.total;
    const phase = (at: number) => startedAt === 0 || elapsed >= at;
    const flash = (from: number, span = 260) =>
      startedAt !== 0 && elapsed >= from && elapsed < from + span;

    /* 左列:前端面板。 */
    const invokeLines: Record<CommandVariant, string> = {
      increment: "await invoke('increment')",
      'add-item': "await invoke('add_item', {…})",
      'wrong-type': "await invoke('increment')",
      'slow-job': "invoke('start_job') + invoke('enqueue')",
    };
    panel(LEFT_X, FRONT_Y, LEFT_W, FRONT_H, BOX_BORDER);
    label(LEFT_X + 12, FRONT_Y + 22, '前端 React', { color: DIM });
    label(LEFT_X + 12, FRONT_Y + 46, invokeLines[command], { mono: true });

    // Promise 状态行:pending → resolve / rejected。
    let promiseText = 'Promise: pending…';
    let promiseColor: string = WAIT;
    if (isFail) {
      if (phase(TL_FAIL.reject)) {
        promiseText = 'rejected: state not managed…';
        promiseColor = FAIL;
      }
    } else if (isJob) {
      if (phase(TL_JOB.resolve)) {
        promiseText = '两条调用均已 resolve';
        promiseColor = OK;
      } else if (phase(TL_JOB.release)) {
        promiseText = 'start_job resolve · enqueue 等待';
        promiseColor = WAIT;
      }
    } else if (phase(TL.resolve)) {
      promiseText = `resolve(${command === 'add-item' ? state.items : state.counter})`;
      promiseColor = OK;
    }
    label(LEFT_X + 12, FRONT_Y + 70, promiseText, {
      color: promiseColor,
      mono: true,
      size: 10,
    });

    /* 左列:托管状态标题与两个类型槽。 */
    label(LEFT_X, SLOTS_TITLE_Y, 'Rust · 托管状态(按类型)', { color: DIM });

    // 槽 1:Mutex<AppState>——锁只在 increment / add-item 的临界区点亮。
    const appLockBusy =
      !isFail && !isJob && phase(TL.locked) && !phase(TL.release);
    const appLockText = appLockBusy
      ? `${command === 'add-item' ? 'add_item' : 'increment'} 持有`
      : '空闲';
    panel(
      LEFT_X,
      SLOT1_Y,
      LEFT_W,
      SLOT_H,
      appLockBusy ? ACCENT : BOX_BORDER,
    );
    label(LEFT_X + 12, SLOT1_Y + 22, 'Mutex<AppState>', {
      mono: true,
      weight: 600,
    });
    label(
      LEFT_X + 12,
      SLOT1_Y + 46,
      `counter: ${state.counter}    items: ${state.items}`,
      {
        mono: true,
        color: !isJob && !isFail && flash(TL.mutate) ? ACCENT : TEXT,
      },
    );
    label(LEFT_X + 12, SLOT1_Y + 74, '锁:', { color: DIM });
    label(LEFT_X + 40, SLOT1_Y + 74, appLockText, {
      color: appLockBusy ? ACCENT : PALE,
      weight: 600,
    });

    // 槽 2:async_runtime::Mutex<JobQueue>——只在 slow-job 场景有锁活动。
    const jobLockPhase: 'idle' | 'holds-await' | 'queued' | 'holds' = isJob
      ? phase(TL_JOB.locked2) && !phase(TL_JOB.release2)
        ? 'holds'
        : phase(TL_JOB.release) && !phase(TL_JOB.locked2)
          ? 'queued'
          : phase(TL_JOB.locked) && !phase(TL_JOB.release)
            ? 'holds-await'
            : 'idle'
      : 'idle';
    const jobLockText =
      jobLockPhase === 'holds-await'
        ? 'start_job 持有(await)'
        : jobLockPhase === 'queued'
          ? 'enqueue 排队中…'
          : jobLockPhase === 'holds'
            ? 'enqueue 持有'
            : '空闲';
    const jobLockColor =
      jobLockPhase === 'holds-await' || jobLockPhase === 'queued'
        ? WAIT
        : jobLockPhase === 'holds'
          ? ACCENT
          : PALE;
    panel(
      LEFT_X,
      SLOT2_Y,
      LEFT_W,
      SLOT_H,
      jobLockPhase === 'idle'
        ? BOX_BORDER
        : jobLockPhase === 'holds'
          ? ACCENT
          : WAIT,
    );
    label(LEFT_X + 12, SLOT2_Y + 22, 'async_runtime::Mutex<JobQueue>', {
      mono: true,
      weight: 600,
      size: 10.5,
    });
    label(LEFT_X + 12, SLOT2_Y + 46, `jobs: ${state.jobs}`, {
      mono: true,
      color: isJob && flash(TL_JOB.mutate2) ? ACCENT : TEXT,
    });
    label(LEFT_X + 12, SLOT2_Y + 74, '锁:', { color: DIM });
    label(LEFT_X + 40, SLOT2_Y + 74, jobLockText, {
      color: jobLockColor,
      weight: 600,
    });

    /* 右列:命令执行卡。 */
    label(RIGHT_X, LIST_TITLE_Y, '命令执行', { color: DIM });

    if (isJob) {
      drawJobCards(done, phase);
    } else {
      drawCommandCard(done, phase);
    }

    emit({
      callLabel: invokeLines[command],
      resultLabel: isFail
        ? phase(TL_FAIL.reject)
          ? 'rejected: state not managed…'
          : 'pending…'
        : isJob
          ? phase(TL_JOB.resolve)
            ? 'start_job · enqueue 均已 resolve'
            : phase(TL_JOB.release)
              ? 'start_job resolve · enqueue 等待锁'
              : 'pending…'
          : phase(TL.resolve)
            ? `resolve(${command === 'add-item' ? state.items : state.counter})`
            : 'pending…',
      appStateLabel: `counter: ${state.counter} · items: ${state.items}`,
      appStateLockLabel: appLockText,
      jobLockLabel: jobLockText,
    });
  }

  /* increment / add-item / wrong-type 的单命令卡。 */
  function drawCommandCard(done: boolean, phase: (at: number) => boolean): void {
    const command = current.command;
    const isFail = command === 'wrong-type';
    const rejectVisible = isFail && phase(TL_FAIL.reject);

    panel(RIGHT_X, CARD1_Y, RIGHT_W, 216, rejectVisible ? FAIL : BOX_BORDER);
    label(
      RIGHT_X + 12,
      CARD1_Y + 24,
      command === 'add-item' ? 'add_item' : 'increment',
      { weight: 600, size: 12 },
    );
    label(
      RIGHT_X + 12,
      CARD1_Y + 42,
      isFail
        ? "state: State<'_, AppState>   ← 类型不符"
        : "state: State<'_, Mutex<AppState>>",
      { mono: true, size: 10, color: isFail ? FAIL : TEXT },
    );

    const steps: StepDef[] = isFail
      ? [
          { text: '接收 invoke,State 由 Tauri 注入', at: TL_FAIL.invoke },
          {
            text: '按类型查找 AppState → 状态表中没有',
            at: TL_FAIL.lookup,
            fail: true,
          },
          {
            text: 'reject:state not managed for field…',
            at: TL_FAIL.reject,
            fail: true,
          },
          { text: '状态表不受影响,其余命令照常', at: TL_FAIL.reject },
        ]
      : [
          { text: '接收 invoke,State 由 Tauri 注入', at: TL.invoke },
          { text: '按类型查找 Mutex<AppState>', at: TL.lookup },
          { text: 'lock() 拿锁(独占)', at: TL.locked },
          {
            text:
              command === 'add-item'
                ? 'items.push(…),guard 出作用域释放'
                : 'counter += 1,guard 出作用域释放',
            at: TL.mutate,
          },
          { text: 'resolve(新值)', at: TL.resolve },
        ];

    drawStepList(RIGHT_X + 16, CARD1_Y + 76, steps, done, phase);
  }

  /* slow-job 的双命令卡:start_job 持锁跨 await,enqueue 排队等待。 */
  function drawJobCards(done: boolean, phase: (at: number) => boolean): void {
    // 卡 A:start_job。
    panel(RIGHT_X, CARD1_Y, RIGHT_W, 132, BOX_BORDER);
    label(RIGHT_X + 12, CARD1_Y + 24, 'start_job(async)', {
      weight: 600,
      size: 12,
    });
    label(RIGHT_X + 12, CARD1_Y + 42, "state: State<'_, Mutex<JobQueue>>", {
      mono: true,
      size: 10,
    });
    const startSteps: StepDef[] = [
      { text: 'lock().await 拿锁', at: TL_JOB.locked },
      { text: 'await:写文件(锁一直被持有!)', at: TL_JOB.awaiting },
      { text: 'guard 出作用域,释放', at: TL_JOB.release },
      { text: 'resolve', at: TL_JOB.release },
    ];
    drawStepList(
      RIGHT_X + 16,
      CARD1_Y + 70,
      startSteps,
      done,
      phase,
      16,
    );

    // 卡 B:enqueue,先等待后获锁。
    const waiting = phase(TL_JOB.invoke2) && !phase(TL_JOB.locked2);
    panel(
      RIGHT_X,
      CARD1_Y + 148,
      RIGHT_W,
      132,
      waiting ? WAIT : phase(TL_JOB.locked2) ? ACCENT : BOX_BORDER,
    );
    label(RIGHT_X + 12, CARD1_Y + 172, 'enqueue(async)', {
      weight: 600,
      size: 12,
    });
    label(RIGHT_X + 12, CARD1_Y + 190, "state: State<'_, Mutex<JobQueue>>", {
      mono: true,
      size: 10,
    });
    const enqueueSteps: StepDef[] = [
      {
        text: waiting ? 'lock().await → 排队等待锁…' : 'lock().await 拿锁',
        at: TL_JOB.invoke2,
      },
      { text: 'jobs += 1', at: TL_JOB.mutate2 },
      { text: 'guard 出作用域,释放', at: TL_JOB.release2 },
      { text: 'resolve', at: TL_JOB.resolve },
    ];
    drawStepList(
      RIGHT_X + 16,
      CARD1_Y + 218,
      enqueueSteps,
      done,
      phase,
      16,
    );
  }

  function tick(): void {
    const elapsed = performance.now() - startedAt;
    if (elapsed >= TL_JOB.total) {
      rafId = 0;
      draw();
      return;
    }
    draw();
    rafId = window.requestAnimationFrame(tick);
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options) {
      clearTimers();
      current = options;
      // 切换命令 = 发起一次新调用:重放完整时间线,状态在上次结果之上继续变化。
      startedAt = performance.now();

      // 在 mutate 时刻应用状态修改(模拟锁内的写);wrong-type 被拒,不改任何状态。
      const command = options.command;
      if (command === 'increment' || command === 'add-item') {
        mutateTimers.push(
          window.setTimeout(() => {
            if (command === 'increment') {
              state.counter += 1;
            } else {
              state.items += 1;
            }
            draw();
          }, TL.mutate),
        );
      } else if (command === 'slow-job') {
        mutateTimers.push(
          window.setTimeout(() => {
            state.jobs += 1;
            draw();
          }, TL_JOB.mutate2),
        );
      }

      draw();
      rafId = window.requestAnimationFrame(tick);
      // 兜底:动画结束后再刷新一次读数,避免节流吞掉最终结算。
      settleTimer = window.setTimeout(() => draw(), TL_JOB.total + 150);
    },
    dispose() {
      clearTimers();
      resizeObserver.disconnect();
    },
  };
}
