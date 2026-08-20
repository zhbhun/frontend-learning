/**
 * 演示内容：Electrobun 的所有退出触发源汇聚到 Utils.quit() 的同一条停机序列，
 * 以及 before-quit 否决在序列中的判定位置与两个前提（用 Electrobun.events.on
 * 订阅、同步设置 response）。
 * 输入：退出触发源（Cmd+Q 系统退出 / 最后一个窗口关闭 / app.quit() /
 * process.exit()）、是否设 allow:false 否决、是否用 app.on 订阅（只收 payload）。
 * 操作：在 Controls 中切换触发源、开关否决、切换订阅方式。
 * 预期结果：触发源只改变序列前缀，公共停机序列不变；否决 + events.on 订阅时
 * 序列在判定步被截停、终点变为「应用继续运行」；否决 + app.on 订阅时 handler
 * 拿不到 event，否决失效，序列照常走到进程退出。
 * 阅读主线：quitSteps() 是唯一的判定逻辑（与 1.18.1 包内 Utils.ts 的 quit()
 * 对应），draw() 只负责把序列画出来。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type QuitTrigger = 'system' | 'last-window' | 'app-quit' | 'process-exit';

export interface QuitSequenceOptions {
  trigger: QuitTrigger;
  veto: boolean;
  viaAppOn: boolean;
}

export interface QuitSequenceSnapshot {
  trigger: string;
  beforeQuit: string;
  vetoResult: string;
  outcome: string;
}

export interface QuitSequenceInstance {
  update(options: QuitSequenceOptions): void;
  dispose(): void;
}

interface QuitStep {
  /** 步骤标题 */
  title: string;
  /** 执行内容说明 */
  line: string;
  /**
   * skipped：订阅缺失等导致的跳过；cancelled：否决生效后不再执行的停机步骤；
   * terminal：序列终点框
   */
  kind: 'trigger' | 'flow' | 'user' | 'gate' | 'builtin' | 'cancelled' | 'terminal';
}

const COLORS = {
  heading: '#172033',
  muted: '#475569',
  plainBorder: '#94a3b8',
  flow: '#4f7cff',
  builtin: '#7c5cbf',
  skipped: '#94a3b8',
  cancelled: '#b45309',
  ok: '#16794b',
  boxFill: '#ffffff',
  arrow: '#64748b',
};

const TRIGGER_LABELS: Record<QuitTrigger, string> = {
  system: 'Cmd+Q / 应用菜单退出',
  'last-window': '最后一个窗口关闭',
  'app-quit': 'app.quit() / Utils.quit()',
  'process-exit': 'process.exit()',
};

// 各触发源进入 quit() 的路径，与 1.18.1 包内接线一致：
// 系统退出走 setQuitRequestedHandler，最后一个窗口关闭走全局 close 的内置
// 清理（exitOnLastWindowClosed），process.exit() 被 Utils.ts 覆写后改道
function triggerStepOf(trigger: QuitTrigger): QuitStep {
  const lines: Record<QuitTrigger, string> = {
    system: '原生 quitRequested 回调 → quit()',
    'last-window': '全局 close 内置清理：窗口表已空 → quit()',
    'app-quit': '直接调用 quit()',
    'process-exit': 'process.exit 被框架覆写，未在退出中 → 改道 quit()',
  };
  return { title: TRIGGER_LABELS[trigger], line: lines[trigger], kind: 'trigger' };
}

// 唯一判定逻辑：触发源决定前缀，veto + viaAppOn 决定序列是否在判定步截停。
// 与 Utils.ts 的 quit() 对应：同步 emit before-quit → 立即检查
// responseWasSet && response?.allow === false → 否则进入原生停机。
function quitSteps(options: QuitSequenceOptions): {
  steps: QuitStep[];
  cancelled: boolean;
} {
  const { trigger, veto, viaAppOn } = options;
  const cancelled = veto && !viaAppOn;

  const steps: QuitStep[] = [
    triggerStepOf(trigger),
    {
      title: 'quit() 入口',
      line: 'isQuitting 防重入，标记退出中',
      kind: 'flow',
    },
    {
      title: '同步发出 before-quit',
      line: viaAppOn
        ? 'app.on 订阅：handler 收到 payload（{}），拿不到 event 与 response'
        : 'Electrobun.events.on 订阅：handler 收到 ElectrobunEvent',
      kind: 'user',
    },
    {
      title: '否决判定（同步）',
      line: veto
        ? viaAppOn
          ? 'handler 没有 event，response 未设置 → 否决无效，继续停机'
          : 'handler 已设 response = { allow: false } → 取消退出，isQuitting 复位'
        : 'response 未设置 → 继续停机',
      kind: 'gate',
    },
  ];

  const shutdown: QuitStep[] = [
    {
      title: '原生停机',
      line: 'stopEventLoop → 等待停机完成（源码上限 5000）→ forceExit(0)',
      kind: 'builtin',
    },
  ];

  const terminal: QuitStep = cancelled
    ? {
        title: '应用继续运行',
        line: '退出被取消，用户可处理未保存内容后再次退出',
        kind: 'terminal',
      }
    : {
        title: '进程退出',
        line: 'exit code 0',
        kind: 'terminal',
      };

  if (cancelled) {
    return {
      steps: [
        ...steps,
        ...shutdown.map((step) => ({ ...step, kind: 'cancelled' as const })),
        terminal,
      ],
      cancelled,
    };
  }
  return { steps: [...steps, ...shutdown, terminal], cancelled };
}

function stepColor(step: QuitStep): string {
  switch (step.kind) {
    case 'trigger':
      return COLORS.plainBorder;
    case 'flow':
      return COLORS.flow;
    case 'user':
      return COLORS.flow;
    case 'gate':
      return step.line.includes('取消退出') ? COLORS.cancelled : COLORS.flow;
    case 'builtin':
      return COLORS.builtin;
    case 'cancelled':
      return COLORS.skipped;
    case 'terminal':
      return step.title === '应用继续运行' ? COLORS.cancelled : COLORS.ok;
  }
}

export function createQuitSequence(
  canvas: HTMLCanvasElement,
  emit: (snapshot: QuitSequenceSnapshot) => void,
): QuitSequenceInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: QuitSequenceOptions = {
    trigger: 'system',
    veto: false,
    viaAppOn: false,
  };

  function drawBox(
    x: number,
    y: number,
    width: number,
    height: number,
    step: QuitStep,
    order: number,
  ) {
    const dimmed = step.kind === 'cancelled';
    const borderColor = stepColor(step);

    drawingContext.fillStyle = COLORS.boxFill;
    drawingContext.strokeStyle = borderColor;
    drawingContext.lineWidth = dimmed ? 1 : 1.5;
    drawingContext.setLineDash(dimmed ? [4, 3] : []);
    drawingContext.beginPath();
    drawingContext.roundRect(x, y, width, height, 8);
    drawingContext.fill();
    drawingContext.stroke();
    drawingContext.setLineDash([]);

    drawingContext.fillStyle = dimmed ? COLORS.skipped : borderColor;
    drawingContext.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(`${order}`, x + 12, y + 20);
    drawingContext.fillStyle = dimmed ? COLORS.skipped : COLORS.muted;
    drawingContext.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(step.title, x + 28, y + 20);

    drawingContext.fillStyle = dimmed ? COLORS.skipped : COLORS.heading;
    drawingContext.font = '11.5px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText(step.line, x + 12, y + 38);
  }

  function drawArrow(fromY: number, toY: number, centerX: number, cancelled: boolean) {
    drawingContext.strokeStyle = COLORS.arrow;
    drawingContext.fillStyle = COLORS.arrow;
    drawingContext.lineWidth = 1.5;
    drawingContext.setLineDash(cancelled ? [4, 3] : []);
    drawingContext.beginPath();
    drawingContext.moveTo(centerX, fromY);
    drawingContext.lineTo(centerX, toY - 5);
    drawingContext.stroke();
    drawingContext.setLineDash([]);
    drawingContext.beginPath();
    drawingContext.moveTo(centerX, toY);
    drawingContext.lineTo(centerX - 4.5, toY - 8);
    drawingContext.lineTo(centerX + 4.5, toY - 8);
    drawingContext.closePath();
    drawingContext.fill();
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(340, size.width);
    const height = Math.max(470, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const { steps, cancelled } = quitSteps(current);

    drawingContext.fillStyle = COLORS.heading;
    drawingContext.font = '600 15px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('退出序列：所有触发源汇聚到 quit()', 20, 28);
    drawingContext.fillStyle = COLORS.muted;
    drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      `触发源：${TRIGGER_LABELS[current.trigger]}${
        current.veto
          ? current.viaAppOn
            ? ' · 已设 allow:false（app.on 订阅，否决无效）'
            : ' · 已设 allow:false（否决生效）'
          : ''
      }`,
      20,
      48,
    );

    const margin = 20;
    const boxWidth = width - margin * 2;
    const stepHeight = 50;
    const top = 64;
    const gap = Math.max(
      10,
      Math.min(20, (height - top - 84) / steps.length - stepHeight),
    );
    let y = top;
    const centerX = width / 2;

    steps.forEach((step, index) => {
      drawArrow(y + 2, y + gap, centerX, step.kind === 'cancelled');
      drawBox(margin, y + gap, boxWidth, stepHeight, step, index + 1);
      y += gap + stepHeight;
    });

    emit({
      trigger: TRIGGER_LABELS[current.trigger],
      beforeQuit: '已触发',
      vetoResult:
        current.veto && !current.viaAppOn
          ? '生效 — 退出被取消'
          : current.veto
            ? '无效（app.on 拿不到 event）'
            : '未设置',
      outcome: cancelled ? '应用继续运行' : '进程退出（code 0）',
    });
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options) {
      current = {
        trigger: options.trigger,
        veto: options.veto,
        viaAppOn: options.viaAppOn,
      };
      draw();
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
