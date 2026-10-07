/**
 * 范例介绍：推演 webPreferences 三大开关的组合，呈现渲染进程「实际生效」的能力面。
 * 输入：contextIsolation / sandbox / nodeIntegration 三个开关的配置值。
 * 操作：切换左侧三个开关，观察右侧能力面读数与底部联动规则、判定。
 * 预期：默认组合为安全基线；开启 nodeIntegration 或关闭 contextIsolation 都会把
 *       该进程沙箱一并关闭（即使 sandbox: true）；关沙箱则预加载拿到完整 Node。
 * 阅读主线：三大开关是一组联锁——沙箱是最容易被牺牲的那一层。
 * 这是行为模型模拟，不等于运行 Electron；真实自检步骤见正文「快速上手」。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type PageWorldState = 'clean' | 'shared' | 'full' | 'process';
export type RiskLevel = 'baseline' | 'weakened' | 'dangerous';

export interface SecuritySimOptions {
  isolation: boolean;
  sandbox: boolean;
  nodeIntegration: boolean;
}

export interface SecuritySimSnapshot {
  isolation: boolean;
  sandbox: boolean;
  nodeIntegration: boolean;
  effectiveSandbox: boolean;
  forcedOff: boolean;
  pageWorld: PageWorldState;
  preloadNode: 'subset' | 'full';
  risk: RiskLevel;
}

export interface SecuritySimInstance {
  update(options: SecuritySimOptions): void;
  dispose(): void;
}

const COLORS = {
  text: '#172033',
  muted: '#64748b',
  panelBg: '#f8fafc',
  panelBorder: '#cbd5e1',
  ok: '#15803d',
  warn: '#b45309',
  blocked: '#dc2626',
  mono: '13px ui-monospace, SFMono-Regular, Menlo, monospace',
  monoSmall: '12px ui-monospace, SFMono-Regular, Menlo, monospace',
  header: '600 14px ui-sans-serif, system-ui, sans-serif',
  note: '13px ui-sans-serif, system-ui, sans-serif',
  noteSmall: '12px ui-sans-serif, system-ui, sans-serif',
  noteBold: '600 13px ui-sans-serif, system-ui, sans-serif',
};

// 固定布局：左右两个面板（配置值 / 实际能力面），底部为联动与判定区
const LAYOUT = {
  width: 720,
  height: 450,
  top: 92,
  height250: 250,
  left: { x: 48, width: 280 },
  right: { x: 392, width: 280 },
  arrowY: 217,
  rows: [156, 212, 268],
};

export function createSecuritySim(
  canvas: HTMLCanvasElement,
  emit: (snapshot: SecuritySimSnapshot) => void,
): SecuritySimInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: SecuritySimOptions = {
    isolation: true,
    sandbox: true,
    nodeIntegration: false,
  };

  // 联动规则（官方文档行为）：
  // - nodeIntegration: true → 该进程沙箱自动关闭；
  // - contextIsolation: false → 该进程沙箱强制关闭，即使 sandbox: true；
  // - 沙箱生效时渲染进程没有 Node 环境，预加载只有 polyfill 子集。
  function derive(options: SecuritySimOptions) {
    // 实际生效的沙箱 = 请求了沙箱 && 隔离开启 && 未开 Node 集成
    const effectiveSandbox =
      options.sandbox && options.isolation && !options.nodeIntegration;
    const forcedOff = options.sandbox && !effectiveSandbox;
    const pageWorld: PageWorldState = options.nodeIntegration
      ? options.isolation
        ? 'process'
        : 'full'
      : options.isolation
        ? 'clean'
        : 'shared';
    const preloadNode = effectiveSandbox ? 'subset' : 'full';
    const risk: RiskLevel = options.nodeIntegration
      ? 'dangerous'
      : effectiveSandbox
        ? 'baseline'
        : 'weakened';
    return { effectiveSandbox, forcedOff, pageWorld, preloadNode, risk };
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(LAYOUT.width, size.width);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(LAYOUT.height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, LAYOUT.height);

    const state = derive(current);

    drawTitle();
    drawPanel(LAYOUT.left.x, 'webPreferences · 配置值');
    drawPanel(LAYOUT.right.x, '渲染进程 · 实际能力面');
    drawConfigPanel();
    drawCapabilityPanel(state);
    drawEffectiveArrow();
    drawFooter(state);

    emit({
      isolation: current.isolation,
      sandbox: current.sandbox,
      nodeIntegration: current.nodeIntegration,
      ...state,
    });
  }

  function drawTitle() {
    drawingContext.textAlign = 'left';
    drawingContext.fillStyle = COLORS.text;
    drawingContext.font = COLORS.note;
    drawingContext.fillText(
      '切换左侧三个开关，观察右侧「实际生效」的能力面',
      LAYOUT.left.x,
      40,
    );
    drawingContext.fillStyle = COLORS.muted;
    drawingContext.font = COLORS.noteSmall;
    drawingContext.fillText(
      '行为模型模拟，不等于运行 Electron；真实自检见正文「快速上手」',
      LAYOUT.left.x,
      62,
    );
  }

  function drawPanel(x: number, title: string) {
    drawingContext.fillStyle = COLORS.panelBg;
    drawingContext.strokeStyle = COLORS.panelBorder;
    drawingContext.lineWidth = 1;
    roundRect(x, LAYOUT.top, LAYOUT.left.width, LAYOUT.height250, 8);
    drawingContext.fill();
    drawingContext.stroke();

    drawingContext.fillStyle = COLORS.text;
    drawingContext.font = COLORS.header;
    drawingContext.fillText(title, x + 16, LAYOUT.top + 34);
  }

  function drawConfigPanel() {
    const x = LAYOUT.left.x + 16;
    const switches = [
      { key: 'contextIsolation', on: current.isolation, defaultOn: true },
      { key: 'sandbox', on: current.sandbox, defaultOn: true },
      { key: 'nodeIntegration', on: current.nodeIntegration, defaultOn: false },
    ];

    switches.forEach((item, index) => {
      const y = LAYOUT.rows[index];
      drawingContext.font = COLORS.mono;
      drawingContext.fillStyle = COLORS.text;
      drawingContext.fillText(item.key, x, y);

      // 与官方默认值一致的配置显示「默认值」，偏离则用警示色标记
      const atDefault = item.on === item.defaultOn;
      drawingContext.font = COLORS.note;
      drawingContext.fillStyle = atDefault ? COLORS.ok : COLORS.warn;
      drawingContext.fillText(
        `${item.on ? '开' : '关'} · ${atDefault ? '默认值' : '偏离默认'}`,
        x,
        y + 20,
      );
    });
  }

  function drawCapabilityPanel(state: ReturnType<typeof derive>) {
    const x = LAYOUT.right.x + 16;

    // 行一：进程沙箱的实际生效状态
    drawLabel('进程沙箱', x, LAYOUT.rows[0]);
    drawingContext.font = COLORS.note;
    drawingContext.fillStyle = state.effectiveSandbox ? COLORS.ok : COLORS.blocked;
    drawingContext.fillText(
      state.effectiveSandbox
        ? '生效'
        : `失效${state.forcedOff ? '（被牵连关闭）' : ''}`,
      x,
      LAYOUT.rows[0] + 20,
    );
    drawingContext.fillStyle = COLORS.muted;
    drawingContext.font = COLORS.noteSmall;
    drawingContext.fillText(
      state.effectiveSandbox ? '特权操作经 IPC 委托主进程' : 'Chromium OS 级沙箱未生效',
      x,
      LAYOUT.rows[0] + 38,
    );

    // 行二：页面主世界能触及什么
    drawLabel('页面主世界', x, LAYOUT.rows[1]);
    const pageWorldView: Record<
      PageWorldState,
      { value: string; color: string; detail: string }
    > = {
      clean: {
        value: '无 require',
        color: COLORS.ok,
        detail: '页面世界没有 Node 可达',
      },
      shared: {
        value: '与预加载同世界',
        color: COLORS.warn,
        detail: 'Node 原语可被页面触及',
      },
      full: {
        value: 'require 直接可用',
        color: COLORS.blocked,
        detail: '页面主世界直接持有完整 Node',
      },
      process: {
        value: '进程持有完整 Node',
        color: COLORS.blocked,
        detail: '官方对远程内容：paramount 禁令',
      },
    };
    const view = pageWorldView[state.pageWorld];
    drawingContext.font = COLORS.note;
    drawingContext.fillStyle = view.color;
    drawingContext.fillText(view.value, x, LAYOUT.rows[1] + 20);
    drawingContext.fillStyle = COLORS.muted;
    drawingContext.font = COLORS.noteSmall;
    drawingContext.fillText(view.detail, x, LAYOUT.rows[1] + 38);

    // 行三：预加载脚本可用的 Node 形态
    drawLabel('预加载可用 Node', x, LAYOUT.rows[2]);
    drawingContext.font = COLORS.note;
    drawingContext.fillStyle = state.preloadNode === 'subset' ? COLORS.ok : COLORS.blocked;
    drawingContext.fillText(
      state.preloadNode === 'subset' ? 'Node 子集（polyfill）' : '完整 Node',
      x,
      LAYOUT.rows[2] + 20,
    );
    drawingContext.fillStyle = COLORS.muted;
    drawingContext.font = COLORS.noteSmall;
    drawingContext.fillText(
      state.preloadNode === 'subset'
        ? 'electron 渲染端 + events/timers/url'
        : 'Chromium 沙箱未生效',
      x,
      LAYOUT.rows[2] + 38,
    );
  }

  function drawLabel(text: string, x: number, y: number) {
    drawingContext.font = COLORS.noteSmall;
    drawingContext.fillStyle = COLORS.muted;
    drawingContext.fillText(text, x, y);
  }

  function drawEffectiveArrow() {
    const x1 = LAYOUT.left.x + LAYOUT.left.width + 4;
    const x2 = LAYOUT.right.x - 4;
    drawingContext.strokeStyle = COLORS.muted;
    drawingContext.fillStyle = COLORS.muted;
    drawingContext.lineWidth = 2;
    drawingContext.beginPath();
    drawingContext.moveTo(x1, LAYOUT.arrowY);
    drawingContext.lineTo(x2 - 8, LAYOUT.arrowY);
    drawingContext.stroke();
    drawingContext.beginPath();
    drawingContext.moveTo(x2, LAYOUT.arrowY);
    drawingContext.lineTo(x2 - 10, LAYOUT.arrowY - 5);
    drawingContext.lineTo(x2 - 10, LAYOUT.arrowY + 5);
    drawingContext.closePath();
    drawingContext.fill();

    drawingContext.font = COLORS.noteSmall;
    drawingContext.textAlign = 'center';
    drawingContext.fillText('实际生效', (x1 + x2) / 2, LAYOUT.arrowY - 12);
    drawingContext.textAlign = 'left';
  }

  function drawFooter(state: ReturnType<typeof derive>) {
    const x = LAYOUT.left.x;
    let y = LAYOUT.top + LAYOUT.height250 + 26;
    drawingContext.textAlign = 'left';
    drawingContext.font = COLORS.note;

    // 联动区：列出被触发的官方联动规则
    const rules: string[] = [];
    if (current.nodeIntegration) {
      rules.push('· nodeIntegration: true → 沙箱自动关闭');
    }
    if (!current.isolation) {
      rules.push('· contextIsolation: false → 沙箱强制关闭（即使 sandbox: true）');
    }
    if (rules.length === 0) {
      drawingContext.fillStyle = COLORS.muted;
      drawingContext.fillText('· 无牵连：沙箱按配置生效', x, y);
    } else {
      drawingContext.fillStyle = COLORS.warn;
      rules.forEach((rule) => {
        drawingContext.fillText(rule, x, y);
        y += 22;
      });
    }

    // 判定区：与正文的三档结论一致
    y += 10;
    drawingContext.font = COLORS.noteBold;
    if (state.risk === 'baseline') {
      drawingContext.fillStyle = COLORS.ok;
      drawingContext.fillText(
        '判定：安全基线——三个默认值都在官方推荐位',
        x,
        y,
      );
    } else if (state.risk === 'weakened') {
      drawingContext.fillStyle = COLORS.warn;
      drawingContext.fillText(
        current.isolation
          ? '判定：防线削弱——渲染进程持有完整 Node，Chromium 沙箱防线消失'
          : '判定：防线削弱——预加载与页面合并为一个世界，沙箱已被牵连关闭',
        x,
        y,
      );
    } else {
      drawingContext.fillStyle = COLORS.blocked;
      drawingContext.fillText(
        current.isolation
          ? '判定：高危——渲染进程引入完整 Node 且沙箱自动关闭，官方对远程内容明令禁止'
          : '判定：高危——页面主世界 require 直接可用，加载远程内容即整机沦陷',
        x,
        y,
      );
    }
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
