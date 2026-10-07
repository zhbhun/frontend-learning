/**
 * 范例介绍：对照三种嵌入方式（iframe / WebContentsView / webview）在同样目标站点响应下的边界差异。
 * 输入：嵌入方式（iframe / WebContentsView / webview（历史））与目标站点响应（允许嵌入 / X-Frame-Options: DENY / CSP: frame-ancestors 限制）。
 * 操作：切换两个控件，左侧「方法档案」更新层级示意与三问答案，右侧「组合判定」给出结论。
 * 预期：iframe 受嵌入许可头管辖，被拒时 ERR_BLOCKED_BY_RESPONSE（-27）；WebContentsView 是顶层加载，
 *       同一响应头照常显示；webview 是历史方案，官方不建议使用。
 * 阅读主线：选嵌入方式 = 选这段第三方页面活在谁的世界里。
 * 这是行为模型模拟，不等于运行 Electron；判定依据来自官方 API 语义描述与 Chromium 通行行为。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type EmbedMethod = 'iframe' | 'WebContentsView' | 'webview（历史）';
export type SitePolicy =
  | '允许嵌入'
  | 'X-Frame-Options: DENY'
  | 'CSP: frame-ancestors 限制';

export interface EmbedSimOptions {
  method: EmbedMethod;
  sitePolicy: SitePolicy;
}

export interface EmbedSimSnapshot {
  method: EmbedMethod;
  sitePolicy: SitePolicy;
  verdict: string;
}

export interface EmbedSimInstance {
  update(options: EmbedSimOptions): void;
  dispose(): void;
}

interface MethodProfile {
  world: string;
  host: string;
  control: string;
  status: string;
}

type VerdictKind = 'ok' | 'block' | 'legacy';

interface Verdict {
  kind: VerdictKind;
  headline: string;
  short: string;
  detail: string;
}

const PROFILES: Record<EmbedMethod, MethodProfile> = {
  iframe: {
    world: '宿主页面的子 frame · 与宿主同一个 webContents',
    host: '在 DOM 里可见；跨源内容对宿主 JS 不透明',
    control: '显示与否归站点方响应头；主进程经 WebFrameMain 观察',
    status: '标准 HTML 能力，Electron 未开后门',
  },
  WebContentsView: {
    world: '独立 webContents · 独立加载与渲染',
    host: '完全不可见——不是 DOM 的一部分',
    control: '主进程全权：setBounds / loadURL / 独立会话',
    status: '当前推荐 · BrowserView 的继任者',
  },
  'webview（历史）': {
    world: 'OOPIF guest frame · 行为如跨域 iframe',
    host: '在 DOM 里可见，但官方文档明确不建议使用',
    control: '（历史）标签式 API，webviewTag 默认关闭',
    status: '历史方案 · 本课只作历史说明',
  },
};

const WEBVIEW_VERDICT: Verdict = {
  kind: 'legacy',
  headline: '需 webviewTag: true 才渲染',
  short: '历史方案 · 不建议使用',
  detail:
    '（站点响应维度不改变本判定）官方警告「建议不要使用 webview 标签，考虑替代方案」，点名的替代就是 iframe 与 WebContentsView；嵌入许可头对它同样生效——行为如跨域 iframe',
};

const VERDICTS: Record<EmbedMethod, Record<SitePolicy, Verdict>> = {
  iframe: {
    允许嵌入: {
      kind: 'ok',
      headline: '正常显示',
      short: '正常显示',
      detail:
        '子 frame 正常渲染；宿主 JS 因同源策略读不到跨源内容，主进程经 WebFrameMain 可以',
    },
    'X-Frame-Options: DENY': {
      kind: 'block',
      headline: '被拒 · ERR_BLOCKED_BY_RESPONSE（-27）',
      short: '被拒（-27）',
      detail:
        'X-Frame-Options 管辖「被谁嵌入」；宿主页面的 load 照常触发，信号只在主进程 did-fail-load（isMainFrame 为 false）',
    },
    'CSP: frame-ancestors 限制': {
      kind: 'block',
      headline: '被拒 · 同 ERR_BLOCKED_BY_RESPONSE（-27）',
      short: '被拒（-27）',
      detail:
        'frame-ancestors 是 CSP 版的嵌入许可，效果与 X-Frame-Options 一致，现代站点优先用它',
    },
  },
  WebContentsView: {
    允许嵌入: {
      kind: 'ok',
      headline: '正常显示 · 顶层加载',
      short: '正常显示',
      detail: '独立 webContents 加载；宿主页面完全感知不到它',
    },
    'X-Frame-Options: DENY': {
      kind: 'ok',
      headline: '照常显示 · XFO 不约束顶层加载',
      short: '照常显示',
      detail:
        '嵌入许可头管的是「被嵌入 frame」；这里是主进程独立视图的顶层加载——这正是它常被用来嵌「拒绝被嵌站点」的原因',
    },
    'CSP: frame-ancestors 限制': {
      kind: 'ok',
      headline: '照常显示 · frame-ancestors 同样管不到',
      short: '照常显示',
      detail: 'CSP frame-ancestors 约束的也是嵌入场景；顶层加载不受限',
    },
  },
  'webview（历史）': {
    允许嵌入: WEBVIEW_VERDICT,
    'X-Frame-Options: DENY': WEBVIEW_VERDICT,
    'CSP: frame-ancestors 限制': WEBVIEW_VERDICT,
  },
};

const KIND_COLOR: Record<VerdictKind, string> = {
  ok: '#15803d',
  block: '#dc2626',
  legacy: '#b45309',
};

const COLORS = {
  text: '#172033',
  muted: '#64748b',
  panelBg: '#f8fafc',
  panelBorder: '#cbd5e1',
  windowBorder: '#94a3b8',
  accent: '#4f7cff',
  accentBg: '#eef2ff',
  guestBg: '#e2e8f0',
  mono: '12px ui-monospace, SFMono-Regular, Menlo, monospace',
  note: '12px ui-sans-serif, system-ui, sans-serif',
  small: '11px ui-sans-serif, system-ui, sans-serif',
  header: '600 14px ui-sans-serif, system-ui, sans-serif',
  headline: '600 15px ui-sans-serif, system-ui, sans-serif',
  label: '600 12px ui-sans-serif, system-ui, sans-serif',
  verdict: '600 13px ui-sans-serif, system-ui, sans-serif',
};

const LAYOUT = {
  headerY: 44,
  panelY: 64,
  panelH: 412,
  leftX: 40,
  leftW: 350,
  rightX: 406,
  rightW: 374,
  canvasH: 544,
};

export function createEmbedSim(
  canvas: HTMLCanvasElement,
  emit: (snapshot: EmbedSimSnapshot) => void,
): EmbedSimInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: EmbedSimOptions = {
    method: 'iframe',
    sitePolicy: 'X-Frame-Options: DENY',
  };

  // CJK 逐字换行：按给定字体测量，超宽即断行
  function wrap(text: string, font: string, maxWidth: number): string[] {
    drawingContext.font = font;
    const lines: string[] = [];
    let line = '';
    for (const ch of text) {
      if (line && drawingContext.measureText(line + ch).width > maxWidth) {
        lines.push(line);
        line = ch;
      } else {
        line += ch;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  function panel(x: number, y: number, w: number, h: number) {
    drawingContext.fillStyle = COLORS.panelBg;
    drawingContext.strokeStyle = COLORS.panelBorder;
    drawingContext.lineWidth = 1;
    drawingContext.fillRect(x, y, w, h);
    drawingContext.strokeRect(x, y, w, h);
  }

  function drawDiagram(method: EmbedMethod, x: number, y: number, w: number, h: number) {
    // 窗口外框
    drawingContext.strokeStyle = COLORS.windowBorder;
    drawingContext.strokeRect(x, y, w, h);
    drawingContext.fillStyle = COLORS.muted;
    drawingContext.font = COLORS.small;
    drawingContext.fillText('窗口', x + 8, y + 14);

    if (method === 'WebContentsView') {
      // 宿主页面在上，独立视图叠在下方
      const host = { x: x + 12, y: y + 24, w: w - 24, h: 64 };
      drawingContext.strokeStyle = COLORS.panelBorder;
      drawingContext.strokeRect(host.x, host.y, host.w, host.h);
      drawingContext.fillStyle = COLORS.text;
      drawingContext.font = COLORS.small;
      drawingContext.fillText('宿主页面 · webContents', host.x + 8, host.y + 18);

      const view = { x: x + 34, y: y + 70, w: w - 68, h: h - 92 };
      drawingContext.fillStyle = COLORS.accentBg;
      drawingContext.strokeStyle = COLORS.accent;
      drawingContext.fillRect(view.x, view.y, view.w, view.h);
      drawingContext.strokeRect(view.x, view.y, view.w, view.h);
      drawingContext.fillStyle = COLORS.accent;
      drawingContext.font = COLORS.label;
      drawingContext.fillText('WebContentsView', view.x + 10, view.y + 20);
      drawingContext.fillStyle = COLORS.muted;
      drawingContext.font = COLORS.small;
      drawingContext.fillText('独立 webContents · 主进程全权控制', view.x + 10, view.y + 36);
      return;
    }

    // iframe / webview：嵌在宿主页面里
    const host = { x: x + 12, y: y + 24, w: w - 24, h: h - 36 };
    drawingContext.strokeStyle = COLORS.panelBorder;
    drawingContext.strokeRect(host.x, host.y, host.w, host.h);
    drawingContext.fillStyle = COLORS.text;
    drawingContext.font = COLORS.small;
    drawingContext.fillText('宿主页面 · webContents', host.x + 8, host.y + 16);

    const child = { x: x + 56, y: y + 74, w: w - 112, h: 44 };
    if (method === 'iframe') {
      drawingContext.fillStyle = COLORS.guestBg;
      drawingContext.strokeStyle = COLORS.accent;
      drawingContext.fillRect(child.x, child.y, child.w, child.h);
      drawingContext.strokeRect(child.x, child.y, child.w, child.h);
      drawingContext.fillStyle = COLORS.accent;
    } else {
      drawingContext.strokeStyle = COLORS.accent;
      drawingContext.setLineDash([4, 3]);
      drawingContext.strokeRect(child.x, child.y, child.w, child.h);
      drawingContext.setLineDash([]);
      drawingContext.fillStyle = COLORS.accent;
    }
    drawingContext.font = COLORS.small;
    drawingContext.fillText(
      method === 'iframe' ? 'iframe · 第三方页面' : 'webview（OOPIF）',
      child.x + 10,
      child.y + 26,
    );
  }

  function drawLeftPanel(method: EmbedMethod, profile: MethodProfile) {
    panel(LAYOUT.leftX, LAYOUT.panelY, LAYOUT.leftW, LAYOUT.panelH);

    drawingContext.fillStyle = COLORS.text;
    drawingContext.font = COLORS.header;
    drawingContext.fillText(
      `方法档案 · ${method}`,
      LAYOUT.leftX + 16,
      LAYOUT.panelY + 26,
    );

    drawDiagram(
      method,
      LAYOUT.leftX + 16,
      LAYOUT.panelY + 42,
      LAYOUT.leftW - 32,
      128,
    );

    const questions: Array<[string, string]> = [
      ['跑在哪', profile.world],
      ['宿主页面', profile.host],
      ['谁控制', profile.control],
    ];
    let y = LAYOUT.panelY + 196;
    const textWidth = LAYOUT.leftW - 32;
    for (const [label, value] of questions) {
      drawingContext.fillStyle = COLORS.text;
      drawingContext.font = COLORS.label;
      drawingContext.fillText(label, LAYOUT.leftX + 16, y);
      y += 17;
      drawingContext.fillStyle = COLORS.muted;
      drawingContext.font = COLORS.note;
      for (const line of wrap(value, COLORS.note, textWidth)) {
        drawingContext.fillText(line, LAYOUT.leftX + 16, y);
        y += 16;
      }
      y += 9;
    }

    drawingContext.fillStyle = COLORS.muted;
    drawingContext.font = COLORS.small;
    drawingContext.fillText(profile.status, LAYOUT.leftX + 16, LAYOUT.panelY + LAYOUT.panelH - 14);
  }

  function drawRightPanel(policy: SitePolicy, verdict: Verdict) {
    panel(LAYOUT.rightX, LAYOUT.panelY, LAYOUT.rightW, LAYOUT.panelH);

    drawingContext.fillStyle = COLORS.text;
    drawingContext.font = COLORS.header;
    drawingContext.fillText('组合判定', LAYOUT.rightX + 16, LAYOUT.panelY + 26);

    drawingContext.font = COLORS.label;
    drawingContext.fillStyle = COLORS.text;
    drawingContext.fillText('目标站点响应', LAYOUT.rightX + 16, LAYOUT.panelY + 58);
    drawingContext.font = COLORS.mono;
    drawingContext.fillStyle = COLORS.muted;
    drawingContext.fillText(policy, LAYOUT.rightX + 104, LAYOUT.panelY + 58);

    let y = LAYOUT.panelY + 92;
    drawingContext.fillStyle = KIND_COLOR[verdict.kind];
    drawingContext.font = COLORS.headline;
    for (const line of wrap(verdict.headline, COLORS.headline, LAYOUT.rightW - 32)) {
      drawingContext.fillText(line, LAYOUT.rightX + 16, y);
      y += 21;
    }

    y += 10;
    drawingContext.fillStyle = COLORS.muted;
    drawingContext.font = COLORS.note;
    for (const line of wrap(verdict.detail, COLORS.note, LAYOUT.rightW - 32)) {
      drawingContext.fillText(line, LAYOUT.rightX + 16, y);
      y += 17;
    }
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(780, size.width);
    const height = LAYOUT.canvasH;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const method = current.method;
    const profile = PROFILES[method];
    const verdict = VERDICTS[method][current.sitePolicy];

    drawingContext.textAlign = 'left';
    drawingContext.fillStyle = COLORS.text;
    drawingContext.font = COLORS.note;
    drawingContext.fillText(
      '切换「嵌入方式」与「目标站点响应」，对照三种放法的边界',
      LAYOUT.leftX,
      LAYOUT.headerY,
    );

    drawLeftPanel(method, profile);
    drawRightPanel(current.sitePolicy, verdict);

    const verdictY = LAYOUT.panelY + LAYOUT.panelH + 30;
    drawingContext.fillStyle = KIND_COLOR[verdict.kind];
    drawingContext.font = COLORS.verdict;
    drawingContext.fillText(`判定：${verdict.headline}`, LAYOUT.leftX, verdictY);

    drawingContext.fillStyle = COLORS.muted;
    drawingContext.font = COLORS.small;
    drawingContext.fillText(
      '行为模型模拟，不等于运行 Electron；判定依据来自官方 API 语义描述与 Chromium 通行行为',
      LAYOUT.leftX,
      verdictY + 22,
    );

    emit({
      method,
      sitePolicy: current.sitePolicy,
      verdict: verdict.short,
    });
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
