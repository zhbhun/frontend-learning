/**
 * 范例介绍：模拟五种典型场景下 webContents 的事件时间线，演示一次加载怎样展开、以什么收场。
 * 输入：加载场景（本地页面加载成功 / 远程地址加载失败 / 加载中调用 stop() / 点击外链放行 / 点击外链拦截，控件标签带全角冒号）。
 * 操作：切换「加载场景」控件，观察事件序列与底部收场结论。
 * 预期：成功以 did-finish-load 收场；失败以 did-fail-load（真实错误码）收场；
 *       中止也走 did-fail-load 但错误码是 -3（ERR_ABORTED）；拦截后事件流当场终止。
 * 阅读主线：加载事件描述"这一次加载"，导航事件描述"页面要去哪"——两者交织在同一条时间线里。
 * 这是行为模型模拟，不等于运行 Electron；时间线为简化版，省略 did-start-navigation 等事件，
 * 相邻事件的先后顺序为通行观察，官方文档只定义各事件自身的语义。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type LoadScenario =
  | '本地页面加载成功'
  | '远程地址加载失败'
  | '加载中调用 stop()'
  | '点击外链：放行'
  | '点击外链：拦截';

export interface LoadSimOptions {
  scenario: LoadScenario;
}

export interface LoadSimSnapshot {
  scenario: LoadScenario;
  outcome: string;
}

export interface LoadSimInstance {
  update(options: LoadSimOptions): void;
  dispose(): void;
}

type EventKind = 'action' | 'life' | 'nav' | 'fail' | 'abort' | 'block';

interface SimEvent {
  name: string;
  note: string;
  kind: EventKind;
}

interface ScenarioDef {
  events: SimEvent[];
  outcome: string;
  verdict: string;
  verdictKind: 'ok' | 'fail' | 'abort';
}

// 事件名按 kind 着色：动作灰、生命周期深色、导航蓝、失败红、中止琥珀
const KIND_COLOR: Record<EventKind, string> = {
  action: '#334155',
  life: '#172033',
  nav: '#4f7cff',
  fail: '#dc2626',
  abort: '#b45309',
  block: '#dc2626',
};

const VERDICT_COLOR = {
  ok: '#15803d',
  fail: '#dc2626',
  abort: '#b45309',
} as const;

const SCENARIOS: Record<LoadScenario, ScenarioDef> = {
  本地页面加载成功: {
    events: [
      { name: 'loadFile("index.html")', note: '主进程发起加载', kind: 'action' },
      { name: 'did-start-loading', note: 'spinner 转起', kind: 'life' },
      { name: 'dom-ready', note: '顶层文档加载完成', kind: 'life' },
      { name: 'did-finish-load', note: 'onload 已分发 · loadFile 的 Promise resolve', kind: 'life' },
      { name: 'did-stop-loading', note: 'spinner 停转', kind: 'life' },
    ],
    outcome: '页面就绪',
    verdict: '正常收场：did-finish-load 是主进程公认的「加载完成」点，每次加载、刷新都会再触发',
    verdictKind: 'ok',
  },
  远程地址加载失败: {
    events: [
      { name: 'loadURL("https://…")', note: '断网或域名不存在', kind: 'action' },
      { name: 'did-start-loading', note: 'spinner 转起', kind: 'life' },
      { name: 'did-fail-load', note: 'errorCode -105 · ERR_NAME_NOT_RESOLVED · isMainFrame', kind: 'fail' },
      { name: 'did-stop-loading', note: '以失败收场，没有 did-finish-load', kind: 'life' },
    ],
    outcome: '加载失败',
    verdict: '失败收场：did-fail-load 与 loadURL 的 Promise reject 描述的是同一个错误',
    verdictKind: 'fail',
  },
  '加载中调用 stop()': {
    events: [
      { name: 'loadURL("https://…")', note: '加载进行到一半', kind: 'action' },
      { name: 'did-start-loading', note: 'spinner 转起', kind: 'life' },
      { name: 'stop()', note: '主进程中止这次加载', kind: 'action' },
      { name: 'did-fail-load', note: 'errorCode -3 · ERR_ABORTED——中止，不是失败', kind: 'abort' },
      { name: 'did-stop-loading', note: '同样没有 did-finish-load', kind: 'life' },
    ],
    outcome: '加载中止',
    verdict: '中止收场：errorCode -3（ERR_ABORTED）只说明「这次加载被打断」，别按失败处理',
    verdictKind: 'abort',
  },
  '点击外链：放行': {
    events: [
      { name: '用户点击外链', note: '页面里的链接跳转，主 frame 导航', kind: 'action' },
      { name: 'will-navigate', note: '导航开始前 · 不拦截则放行', kind: 'nav' },
      { name: 'did-start-loading', note: '新页面的加载时间线开始', kind: 'life' },
      { name: 'did-navigate', note: '导航提交 · url 已变为目标地址', kind: 'nav' },
      { name: 'dom-ready', note: '新页面 DOM 就绪', kind: 'life' },
      { name: 'did-finish-load', note: '新页面加载完成——did-finish-load 再次触发', kind: 'life' },
      { name: 'did-stop-loading', note: 'spinner 停转', kind: 'life' },
    ],
    outcome: '已离开原页面',
    verdict: '放行：转入新页面的加载时间线，did-finish-load 在每次导航后都会再触发',
    verdictKind: 'ok',
  },
  '点击外链：拦截': {
    events: [
      { name: '用户点击外链', note: '页面里的链接跳转，主 frame 导航', kind: 'action' },
      { name: 'will-navigate', note: 'event.preventDefault() 拦下', kind: 'nav' },
      { name: '事件流终止', note: '没有加载事件 · url 不变 · spinner 没有转起', kind: 'block' },
    ],
    outcome: '留在原页面',
    verdict: '拦截：preventDefault 之后事件流当场终止，页面留在原地',
    verdictKind: 'ok',
  },
};

const COLORS = {
  text: '#172033',
  muted: '#64748b',
  panelBg: '#f8fafc',
  panelBorder: '#cbd5e1',
  mono: '13px ui-monospace, SFMono-Regular, Menlo, monospace',
  note: '12px ui-sans-serif, system-ui, sans-serif',
  header: '600 14px ui-sans-serif, system-ui, sans-serif',
  verdict: '600 13px ui-sans-serif, system-ui, sans-serif',
};

const LAYOUT = {
  panelX: 48,
  panelY: 70,
  panelW: 664,
  panelH: 286,
  firstRowY: 132,
  rowStep: 34,
  noteOffsetX: 260,
  canvasH: 440,
};

export function createLoadSim(
  canvas: HTMLCanvasElement,
  emit: (snapshot: LoadSimSnapshot) => void,
): LoadSimInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: LoadSimOptions = { scenario: '本地页面加载成功' };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(720, size.width);
    const height = LAYOUT.canvasH;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const scenario = SCENARIOS[current.scenario];

    drawingContext.textAlign = 'left';
    drawingContext.fillStyle = COLORS.text;
    drawingContext.font = COLORS.note;
    drawingContext.fillText(
      '切换「加载场景」，观察事件时间线怎样展开、以什么收场',
      LAYOUT.panelX,
      52,
    );

    drawingContext.fillStyle = COLORS.panelBg;
    drawingContext.strokeStyle = COLORS.panelBorder;
    drawingContext.lineWidth = 1;
    roundRect(LAYOUT.panelX, LAYOUT.panelY, LAYOUT.panelW, LAYOUT.panelH, 8);
    drawingContext.fill();
    drawingContext.stroke();

    drawingContext.fillStyle = COLORS.text;
    drawingContext.font = COLORS.header;
    drawingContext.fillText('事件时间线（从上到下）', LAYOUT.panelX + 16, LAYOUT.panelY + 26);

    scenario.events.forEach((item, index) => {
      const y = LAYOUT.firstRowY + index * LAYOUT.rowStep;

      drawingContext.font = COLORS.mono;
      drawingContext.fillStyle = KIND_COLOR[item.kind];
      drawingContext.fillText(item.name, LAYOUT.panelX + 16, y);

      drawingContext.font = COLORS.note;
      drawingContext.fillStyle = COLORS.muted;
      drawingContext.fillText(item.note, LAYOUT.panelX + LAYOUT.noteOffsetX, y);
    });

    const verdictY = LAYOUT.panelY + LAYOUT.panelH + 34;
    drawingContext.font = COLORS.verdict;
    drawingContext.fillStyle = VERDICT_COLOR[scenario.verdictKind];
    drawingContext.fillText(`收场：${scenario.outcome}——${scenario.verdict}`, LAYOUT.panelX, verdictY);

    drawingContext.font = COLORS.note;
    drawingContext.fillStyle = COLORS.muted;
    drawingContext.fillText(
      '行为模型模拟，不等于运行 Electron；时间线为简化版，省略 did-start-navigation 等事件，相邻顺序为通行观察',
      LAYOUT.panelX,
      verdictY + 22,
    );

    emit({ scenario: current.scenario, outcome: scenario.outcome });
  }

  function roundRect(x: number, y: number, w: number, h: number, radius: number) {
    drawingContext.beginPath();
    drawingContext.moveTo(x + radius, y);
    drawingContext.arcTo(x + w, y, x + w, y + h, radius);
    drawingContext.arcTo(x + w, y + h, x, y + h, radius);
    drawingContext.arcTo(x, y + h, x, y, radius);
    drawingContext.arcTo(x, y, x + w, y, radius);
    drawingContext.closePath();
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options) {
      current = options;
      draw();
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
