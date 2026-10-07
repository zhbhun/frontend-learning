/**
 * 范例介绍：在事件流沙盘里演示 Electron 应用的生命周期事件顺序。
 * 输入：action（关掉最后一个窗口 / Cmd+Q 或 app.quit() / app.exit()）、
 *       platform（process.platform 的取值）、cancelClose（close 里是否 preventDefault）。
 * 操作：切换三个控件，观察一条退出路径会依次触发哪些事件、在哪一步被拦下。
 * 预期：关窗路径触发 close → closed → window-all-closed，再按平台惯例决定去留；
 *       quit 链路从 before-quit 开始，关完窗直接 will-quit，不触发 window-all-closed；
 *       拦截 close 会取消关闭或退出；app.exit() 绕过整条链路，拦截无效。
 * 阅读主线：退出是事件链，不是瞬间动作——顺序与拦截点全部对齐官方 api/app 文档；
 *           真实 Electron 无法在浏览器运行，这里是文档语义的可视化模拟，
 *           真实环境的核对方式见正文快速上手。
 */
import {
  createRenderLoop,
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type ActionKind = 'close-window' | 'quit' | 'exit';
export type PlatformKind = 'darwin' | 'win32';

export interface LifecycleOptions {
  action: ActionKind;
  platform: PlatformKind;
  cancelClose: boolean;
}

export interface LifecycleSnapshot {
  scenarioLabel: string;
  finalLabel: string;
  keyLabel: string;
}

export interface LifecycleInstance {
  update(options: LifecycleOptions): void;
  dispose(): void;
}

type RowKind = 'call' | 'event' | 'info' | 'result';
type RowTone = 'normal' | 'quit' | 'blocked' | 'muted' | 'good';

interface Row {
  at: number;
  kind: RowKind;
  tone: RowTone;
  name?: string;
  note: string;
}

interface Plan {
  rows: Row[];
  duration: number;
  scenarioLabel: string;
  chainLabel: string;
  finalLabel: string;
  keyLabel: string;
}

const COLORS = {
  normal: '#4f7cff',
  quit: '#15803d',
  blocked: '#b91c1c',
  muted: '#64748b',
  good: '#15803d',
  note: '#64748b',
  line: '#cbd5e1',
  dotLine: '#94a3b8',
  chipBg: '#e2e8f0',
  chipText: '#334155',
  title: '#64748b',
};

const TONE_COLORS: Record<RowTone, string> = {
  normal: COLORS.normal,
  quit: COLORS.quit,
  blocked: COLORS.blocked,
  muted: COLORS.muted,
  good: COLORS.good,
};

/* 事件按时间轴依次出现：第 i 行在 t(i) 开始淡入。 */
const revealAt = (index: number) => 0.4 + index * 0.62;
const REVEAL_SPAN = 0.25;

function buildPlan(options: LifecycleOptions): Plan {
  const { action, platform, cancelClose } = options;
  const rows: Row[] = [];
  let scenarioLabel = '';
  let chainLabel = '';
  let finalLabel = '';
  let keyLabel = '';

  if (action === 'exit') {
    scenarioLabel = `${platform === 'darwin' ? 'macOS' : 'Windows'} · app.exit()`;
    chainLabel = '不经过任何生命周期事件';
    keyLabel = 'app.exit() 跳过整条链路，拦截无效';
    finalLabel = '已退出（跳过链路）';
    rows.push(
      {
        at: revealAt(0),
        kind: 'call',
        tone: 'muted',
        name: 'app.exit(0)',
        note: cancelClose ? 'close 拦截对它无效' : '请求立即退出',
      },
      {
        at: revealAt(1),
        kind: 'info',
        tone: 'blocked',
        note: 'before-quit / will-quit / quit 均不触发，窗口被直接销毁',
      },
      { at: revealAt(2), kind: 'result', tone: 'good', note: '进程已退出（exitCode 0）' },
    );
  } else if (cancelClose && action === 'close-window') {
    scenarioLabel = `${platform === 'darwin' ? 'macOS' : 'Windows'} · 关闭最后一个窗口 · 拦截 close`;
    chainLabel = 'close（被 preventDefault）';
    keyLabel = 'close 被拦下后，closed 与 window-all-closed 都不触发';
    finalLabel = '关闭被取消，应用继续运行';
    rows.push(
      {
        at: revealAt(0),
        kind: 'call',
        tone: 'muted',
        name: 'win.close()',
        note: '用户点窗口关闭按钮',
      },
      {
        at: revealAt(1),
        kind: 'event',
        tone: 'normal',
        name: 'close',
        note: '监听里 event.preventDefault()',
      },
      {
        at: revealAt(2),
        kind: 'info',
        tone: 'blocked',
        note: '关闭被取消：closed 与 window-all-closed 不触发',
      },
      { at: revealAt(3), kind: 'result', tone: 'blocked', note: '窗口还在，应用继续运行' },
    );
  } else if (cancelClose && action === 'quit') {
    scenarioLabel = `${platform === 'darwin' ? 'macOS' : 'Windows'} · Cmd+Q / app.quit() · 拦截 close`;
    chainLabel = 'before-quit → close（被 preventDefault）';
    keyLabel = 'before-quit 与窗口 close 都能拦住退出';
    finalLabel = '退出被拦下，应用继续运行';
    rows.push(
      {
        at: revealAt(0),
        kind: 'call',
        tone: 'muted',
        name: 'Cmd+Q / app.quit()',
        note: '请求退出',
      },
      {
        at: revealAt(1),
        kind: 'event',
        tone: 'normal',
        name: 'before-quit',
        note: 'quit 链路的第一步',
      },
      {
        at: revealAt(2),
        kind: 'event',
        tone: 'normal',
        name: 'close',
        note: 'Electron 尝试关窗；监听里 preventDefault()',
      },
      {
        at: revealAt(3),
        kind: 'info',
        tone: 'blocked',
        note: '退出被取消：will-quit 与 quit 不再触发',
      },
      { at: revealAt(4), kind: 'result', tone: 'blocked', note: '窗口还在，应用继续运行' },
    );
  } else if (action === 'close-window' && platform === 'darwin') {
    scenarioLabel = 'macOS · 关闭最后一个窗口 · 放行';
    chainLabel = 'close → closed → window-all-closed → activate';
    keyLabel = 'darwin 常驻不退出，activate 重建窗口';
    finalLabel = '常驻 → activate 后窗口重建';
    rows.push(
      {
        at: revealAt(0),
        kind: 'call',
        tone: 'muted',
        name: 'win.close()',
        note: '用户点红色关闭按钮',
      },
      { at: revealAt(1), kind: 'event', tone: 'normal', name: 'close', note: '窗口收到关闭请求' },
      { at: revealAt(2), kind: 'event', tone: 'normal', name: 'closed', note: '窗口已关闭、实例销毁' },
      {
        at: revealAt(3),
        kind: 'event',
        tone: 'normal',
        name: 'window-all-closed',
        note: '已无窗口；darwin 惯例：不调用 quit',
      },
      {
        at: revealAt(4),
        kind: 'info',
        tone: 'muted',
        note: '应用无窗口常驻：进程未退出，Dock 图标还在',
      },
      { at: revealAt(5), kind: 'call', tone: 'muted', name: '点击 Dock 图标', note: '（模拟再次激活）' },
      {
        at: revealAt(6),
        kind: 'event',
        tone: 'quit',
        name: 'activate',
        note: '仅 macOS；惯例无窗口时重建',
      },
      { at: revealAt(7), kind: 'result', tone: 'good', note: 'createWindow() 执行，窗口重新出现' },
    );
  } else if (action === 'close-window') {
    scenarioLabel = 'Windows · 关闭最后一个窗口 · 放行';
    chainLabel = 'close → closed → window-all-closed → before-quit → will-quit → quit';
    keyLabel = '去留在 window-all-closed 决定（Linux 同）';
    finalLabel = '已退出（exitCode 0）';
    rows.push(
      {
        at: revealAt(0),
        kind: 'call',
        tone: 'muted',
        name: 'win.close()',
        note: '用户点窗口关闭按钮',
      },
      { at: revealAt(1), kind: 'event', tone: 'normal', name: 'close', note: '窗口收到关闭请求' },
      { at: revealAt(2), kind: 'event', tone: 'normal', name: 'closed', note: '窗口已关闭、实例销毁' },
      {
        at: revealAt(3),
        kind: 'event',
        tone: 'normal',
        name: 'window-all-closed',
        note: '已无窗口；win32 惯例：这里调用 app.quit()',
      },
      { at: revealAt(4), kind: 'event', tone: 'normal', name: 'before-quit', note: 'quit 链路开始' },
      { at: revealAt(5), kind: 'event', tone: 'normal', name: 'will-quit', note: '窗口全关、即将退出' },
      { at: revealAt(6), kind: 'event', tone: 'quit', name: 'quit', note: '退出中，进程随即结束' },
      { at: revealAt(7), kind: 'result', tone: 'good', note: '已退出（exitCode 0）' },
    );
  } else {
    scenarioLabel = `${platform === 'darwin' ? 'macOS' : 'Windows'} · Cmd+Q / app.quit() · 放行`;
    chainLabel = 'before-quit → close → closed → will-quit → quit';
    keyLabel = 'quit 链路不触发 window-all-closed';
    finalLabel = '已退出（exitCode 0）';
    rows.push(
      {
        at: revealAt(0),
        kind: 'call',
        tone: 'muted',
        name: 'Cmd+Q / app.quit()',
        note: platform === 'darwin' ? '系统菜单的退出项，不走 darwin 判断' : '请求退出',
      },
      {
        at: revealAt(1),
        kind: 'event',
        tone: 'normal',
        name: 'before-quit',
        note: 'quit 链路的第一步',
      },
      { at: revealAt(2), kind: 'event', tone: 'normal', name: 'close', note: 'Electron 逐个关闭窗口' },
      { at: revealAt(3), kind: 'event', tone: 'normal', name: 'closed', note: '窗口已关闭' },
      {
        at: revealAt(4),
        kind: 'event',
        tone: 'normal',
        name: 'will-quit',
        note: '窗口全关；本链路不触发 window-all-closed',
      },
      { at: revealAt(5), kind: 'event', tone: 'quit', name: 'quit', note: '退出中，进程随即结束' },
      { at: revealAt(6), kind: 'result', tone: 'good', note: '已退出（exitCode 0）' },
    );
  }

  return {
    rows,
    duration: rows[rows.length - 1].at + 1.0,
    scenarioLabel,
    chainLabel,
    finalLabel,
    keyLabel,
  };
}

export function createLifecycleSim(
  canvas: HTMLCanvasElement,
  emit: (snapshot: LifecycleSnapshot) => void,
): LifecycleInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  let options: LifecycleOptions = { action: 'close-window', platform: 'win32', cancelClose: false };
  let elapsed = 0;
  let settled = false;

  function plan(): Plan {
    return buildPlan(options);
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(300, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const current = plan();
    const finished = elapsed >= current.duration;

    // 顶部说明行与右侧状态
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = COLORS.title;
    ctx.font = '11px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('生命周期事件流（浏览器模拟 · 事件名与顺序对齐官方文档）', 20, 24);
    const statusLabel = finished ? current.finalLabel : '事件流进行中…';
    ctx.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillStyle = finished ? TONE_COLORS[current.rows[current.rows.length - 1].tone] : COLORS.title;
    ctx.fillText(statusLabel, width - 20, 24);
    ctx.textAlign = 'left';

    // 事件行布局：时间轴圆点在左，名称与说明同行；底部留出 readout 区域
    const top = 52;
    const bottomReserve = 86;
    const rowHeight = Math.max(
      24,
      Math.min(34, (height - top - bottomReserve) / current.rows.length),
    );
    const dotX = 40;
    const textX = 58;

    let firstDotY = 0;
    let lastDotY = 0;

    current.rows.forEach((row, index) => {
      if (elapsed < row.at) {
        return;
      }
      const alpha = Math.min(1, (elapsed - row.at) / REVEAL_SPAN);
      const y = top + rowHeight * index + rowHeight / 2 + (1 - alpha) * 8;
      ctx.globalAlpha = alpha;

      if (row.kind === 'event') {
        if (firstDotY === 0) {
          firstDotY = y;
        }
        lastDotY = y;
      }

      if (row.kind === 'call') {
        // 起始动作：灰底圆角标签 + 说明
        ctx.font = '600 12px ui-monospace, SFMono-Regular, Menlo, monospace';
        const chipWidth = ctx.measureText(row.name ?? '').width + 16;
        ctx.fillStyle = COLORS.chipBg;
        roundRect(dotX - 14, y - 11, chipWidth, 22, 6);
        ctx.fill();
        ctx.fillStyle = COLORS.chipText;
        ctx.textBaseline = 'middle';
        ctx.fillText(row.name ?? '', dotX - 6, y + 1);
        ctx.fillStyle = COLORS.note;
        ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
        ctx.fillText(row.note, dotX - 14 + chipWidth + 10, y + 1);
      } else if (row.kind === 'event') {
        // 生命周期事件：实心圆点 + 等宽名称 + 右侧说明
        ctx.beginPath();
        ctx.arc(dotX, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = TONE_COLORS[row.tone];
        ctx.fill();
        ctx.fillStyle = TONE_COLORS[row.tone];
        ctx.font = 'bold 13px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.textBaseline = 'middle';
        const nameWidth = ctx.measureText(row.name ?? '').width;
        ctx.fillText(row.name ?? '', textX, y + 1);
        ctx.fillStyle = COLORS.note;
        ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
        ctx.textAlign = 'right';
        const noteWidth = width - 20 - (textX + nameWidth) - 24;
        ctx.fillText(truncate(row.note, noteWidth), width - 20, y + 1);
        ctx.textAlign = 'left';
      } else if (row.kind === 'info') {
        ctx.fillStyle = TONE_COLORS[row.tone];
        ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
        ctx.textBaseline = 'middle';
        ctx.fillText(truncate(row.note, width - textX - 20), textX, y + 1);
      } else {
        // 结果行：浅色分隔线 + 加粗结论
        ctx.strokeStyle = COLORS.line;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(24, y - rowHeight / 2 + 2);
        ctx.lineTo(width - 24, y - rowHeight / 2 + 2);
        ctx.stroke();
        ctx.fillStyle = TONE_COLORS[row.tone];
        ctx.font = '600 14px ui-sans-serif, system-ui, sans-serif';
        ctx.textBaseline = 'middle';
        ctx.fillText(truncate(row.note, width - 40 - 20), 40, y + 1);
      }

      ctx.globalAlpha = 1;
    });

    // 已出现的事件圆点用竖线串起来，强调"事件依次发生"
    if (lastDotY > firstDotY) {
      ctx.strokeStyle = COLORS.dotLine;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(dotX, firstDotY + 7);
      ctx.lineTo(dotX, lastDotY - 7);
      ctx.stroke();
    }
  }

  function roundRect(x: number, y: number, w: number, h: number, radius: number) {
    const r = Math.min(radius, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function truncate(text: string, maxWidth: number) {
    if (maxWidth <= 0 || ctx.measureText(text).width <= maxWidth) {
      return text;
    }
    let clipped = text;
    while (clipped.length > 1 && ctx.measureText(`${clipped}…`).width > maxWidth) {
      clipped = clipped.slice(0, -1);
    }
    return `${clipped}…`;
  }

  function snapshotFor(): LifecycleSnapshot {
    const current = plan();
    const running = elapsed < current.duration;
    return {
      scenarioLabel: current.scenarioLabel,
      finalLabel: running ? '事件流进行中…' : current.finalLabel,
      keyLabel: current.keyLabel,
    };
  }

  const loop = createRenderLoop(canvas, (delta) => {
    if (settled) {
      return;
    }
    elapsed = Math.min(elapsed + delta, plan().duration);
    draw();
    emit(snapshotFor());
    if (elapsed >= plan().duration) {
      settled = true;
    }
  });

  const resizeObserver = createResizeObserver(canvas, () => {
    settled = false;
  });

  return {
    update(next: LifecycleOptions) {
      options = { ...next };
      elapsed = 0;
      settled = false;
    },
    dispose() {
      resizeObserver.disconnect();
      loop.dispose();
    },
  };
}
