/**
 * 范例介绍：推演页面「越界动作」在三类口子上的判定流程与最终走向。
 * 输入：页面动作（开新窗 / 导航 / 重定向 / 权限申请）+ 三个口子是否挂载 + 目标是否在白名单。
 * 操作：切换「页面动作」与各 handler 开关，观察判定流程与结果读数。
 * 预期：三个口子都未挂载时全部默认放行（新窗真开、导航放行、权限自动同意）；
 *       挂载后按白名单分道——拦下 / 转交系统浏览器 / 授予或拒绝；
 *       锚点跳转不经任何口子；302 重定向走 will-redirect 而不是 will-navigate。
 * 阅读主线：页面越界只有三条通路，口子全在主进程，默认行为全是放行。
 * 这是行为模型模拟，不等于运行 Electron；真实项目的完整拦截实现在 navigation-main.js。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type NavActionKind =
  | 'window-open'
  | 'anchor-blank'
  | 'link'
  | 'in-page'
  | 'redirect'
  | 'permission';

export type NavActionLabel =
  | 'window.open() 开新窗'
  | '链接 target="_blank"'
  | '普通链接跳转'
  | '锚点 / hash 跳转'
  | '302 重定向'
  | '申请摄像头权限';

export type NavTone = 'ok' | 'warn' | 'blocked' | 'neutral';

export interface NavigationSimOptions {
  action: NavActionLabel;
  windowOpenHandler: boolean;
  navigateHandler: boolean;
  permissionHandler: boolean;
  allowlisted: boolean;
}

export interface NavigationSimSnapshot {
  action: NavActionLabel;
  allowlisted: boolean;
  gate: string;
  gateHost: string;
  mounted: boolean | null;
  arrowLabel: string;
  verdict: string;
  detail: string;
  tone: NavTone;
}

export interface NavigationSimInstance {
  update(options: NavigationSimOptions): void;
  dispose(): void;
}

const ACTION_KIND: Record<NavActionLabel, NavActionKind> = {
  'window.open() 开新窗': 'window-open',
  '链接 target="_blank"': 'anchor-blank',
  普通链接跳转: 'link',
  '锚点 / hash 跳转': 'in-page',
  '302 重定向': 'redirect',
  申请摄像头权限: 'permission',
};

// 每个动作在左面板显示的代码形态与来源标注
const ACTION_VIEW: Record<
  NavActionKind,
  { code: string[]; source: string }
> = {
  'window-open': {
    code: ["window.open(", "  'https://example.com')"],
    source: '页面脚本',
  },
  'anchor-blank': {
    code: ['<a target="_blank">', '  外站链接'],
    source: '用户点击',
  },
  link: {
    code: ['<a href="https://', '  example.com">'],
    source: '用户点击',
  },
  'in-page': {
    code: ["location.hash = '#top'"],
    source: '页面脚本',
  },
  redirect: {
    code: ['初始: https://example.com', '302 → https://other.example'],
    source: '服务端响应',
  },
  permission: {
    code: ['getUserMedia({', '  video: true })'],
    source: '页面 API',
  },
};

const COLORS = {
  text: '#172033',
  muted: '#64748b',
  panelBg: '#f8fafc',
  panelBorder: '#cbd5e1',
  highlightBg: '#eef2ff',
  highlightBorder: '#4f7cff',
  ok: '#15803d',
  warn: '#b45309',
  blocked: '#dc2626',
  mono: '12px ui-monospace, SFMono-Regular, Menlo, monospace',
  monoSmall: '11px ui-monospace, SFMono-Regular, Menlo, monospace',
  header: '600 13px ui-sans-serif, system-ui, sans-serif',
  note: '13px ui-sans-serif, system-ui, sans-serif',
  noteSmall: '12px ui-sans-serif, system-ui, sans-serif',
  noteBold: '600 13px ui-sans-serif, system-ui, sans-serif',
};

// 固定布局：顶部三面板（页面动作 → 口子 → 结果），底部口子总览与结论
const LAYOUT = {
  width: 720,
  height: 470,
  panelTop: 88,
  panelHeight: 168,
  panels: [
    { x: 40, width: 196 },
    { x: 262, width: 196 },
    { x: 484, width: 196 },
  ],
  laneY: 296,
  noteY: 356,
  verdictY: 436,
};

interface Verdict {
  gate: string;
  gateHost: string;
  mounted: boolean | null;
  arrowLabel: string;
  verdict: string;
  detail: string;
  tone: NavTone;
  pathNote: string;
  lane: 'window' | 'navigate' | 'permission' | 'none';
}

// 三条通路共用的口子名与挂载位置
const GATES = {
  window: {
    gate: 'webContents.setWindowOpenHandler',
    gateHost: 'webContents（按页面）',
    lane: 'window' as const,
  },
  navigate: {
    gate: 'webContents · will-navigate',
    gateHost: 'webContents（按页面）',
    lane: 'navigate' as const,
  },
  redirect: {
    gate: 'webContents · will-redirect',
    gateHost: 'webContents（按页面）',
    lane: 'navigate' as const,
  },
  permission: {
    gate: 'session.setPermissionRequestHandler',
    gateHost: 'session（按会话）',
    lane: 'permission' as const,
  },
};

function derive(options: NavigationSimOptions): Verdict {
  const kind = ACTION_KIND[options.action];

  switch (kind) {
    case 'window-open':
    case 'anchor-blank': {
      const mounted = options.windowOpenHandler;
      const base = {
        ...GATES.window,
        mounted,
        pathNote:
          kind === 'window-open'
            ? 'handler 在窗口创建之前拿到最终决定权；deny 后 did-create-window 不会触发'
            : 'target="_blank" 与 window.open 走同一个口子，不触发 will-navigate',
      };
      if (!mounted) {
        return {
          ...base,
          arrowLabel: '未挂载 handler',
          verdict: '默认行为：应用内开出新 BrowserWindow',
          detail: '渲染端请求开窗，Electron 默认照办——新窗口仍属于本应用',
          tone: 'blocked',
        };
      }
      if (options.allowlisted) {
        return {
          ...base,
          arrowLabel: 'deny + setImmediate(openExternal)',
          verdict: '拦下，转交系统默认浏览器',
          detail: '应用内不开新窗；http(s) 目标交 shell.openExternal（见「打开外部资源」）',
          tone: 'ok',
        };
      }
      return {
        ...base,
        arrowLabel: "return { action: 'deny' }",
        verdict: 'deny：未创建任何窗口',
        detail: '一票否决，页面拿不到新窗口',
        tone: 'warn',
      };
    }

    case 'link': {
      const mounted = options.navigateHandler;
      const base = {
        ...GATES.navigate,
        mounted,
        pathNote: '程序化 loadURL 与页内导航不触发 will-navigate（见「webContents」一课）',
      };
      if (!mounted) {
        return {
          ...base,
          arrowLabel: '未监听 will-navigate',
          verdict: '默认行为：放行，页面跳到目标 URL',
          detail: '主 frame 外来导航默认放行，加载照常走时间线',
          tone: 'blocked',
        };
      }
      if (options.allowlisted) {
        return {
          ...base,
          arrowLabel: 'parsedUrl.origin 命中白名单',
          verdict: '白名单命中，导航放行',
          detail: '放行后进入加载时间线；白名单用 origin 比较，不做 startsWith',
          tone: 'ok',
        };
      }
      return {
        ...base,
        arrowLabel: 'event.preventDefault()',
        verdict: '拦下：页面留在原地',
        detail: '拦截后不产生任何加载事件，URL 不变',
        tone: 'warn',
      };
    }

    case 'in-page':
      return {
        gate: '无（不经任何口子）',
        gateHost: '—',
        mounted: null,
        arrowLabel: '—',
        verdict: '页内导航：hash 变化，页面不重载',
        detail: '走 did-navigate-in-page；will-navigate 与 setWindowOpenHandler 都不触发',
        tone: 'neutral',
        pathNote: 'will-navigate 只管「外来」导航：锚点、hash 与程序化 loadURL 同样不经口子',
        lane: 'none',
      };

    case 'redirect': {
      const mounted = options.navigateHandler;
      const base = {
        ...GATES.redirect,
        mounted,
        pathNote: '302 发生在同一次导航中途（did-start-navigation 之后），不会再触发 will-navigate',
      };
      if (!mounted) {
        return {
          ...base,
          arrowLabel: '初始 URL 命中 will-navigate 白名单 → 放行',
          verdict: '默认行为：重定向放行，页面被带离白名单域',
          detail: '只挂 will-navigate 的白名单，挡不住可信 URL 的 302 跳转',
          tone: 'blocked',
        };
      }
      if (!options.allowlisted) {
        return {
          ...base,
          arrowLabel: 'will-redirect preventDefault()',
          verdict: '取消整个导航（不只是重定向）',
          detail: '重定向目标不在白名单；preventDefault 把初始导航一并取消',
          tone: 'ok',
        };
      }
      return {
        ...base,
        arrowLabel: 'will-redirect：目标在白名单内',
        verdict: '重定向目标命中白名单，放行',
        detail: '导航继续，落到重定向目标页',
        tone: 'neutral',
      };
    }

    case 'permission': {
      const mounted = options.permissionHandler;
      const base = {
        ...GATES.permission,
        mounted,
        pathNote: '挂载在 session 上：分区会话要逐一设置；与 setPermissionCheckHandler 成对使用',
      };
      if (!mounted) {
        return {
          ...base,
          arrowLabel: '未设置 handler',
          verdict: '默认行为：自动同意，摄像头授予',
          detail: '官方原话：默认自动同意全部权限请求（automatically approve all）',
          tone: 'blocked',
        };
      }
      if (options.allowlisted) {
        return {
          ...base,
          arrowLabel: 'callback(true)',
          verdict: '授予摄像头',
          detail: '按 details.requestingUrl 核对来源后放行',
          tone: 'ok',
        };
      }
      return {
        ...base,
        arrowLabel: 'callback(false)',
        verdict: '拒绝：页面拿不到摄像头',
        detail: 'callback 必须调用，漏调的分支会让请求悬挂',
        tone: 'warn',
      };
    }
  }
}

export function createNavigationSim(
  canvas: HTMLCanvasElement,
  emit: (snapshot: NavigationSimSnapshot) => void,
): NavigationSimInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: NavigationSimOptions = {
    action: 'window.open() 开新窗',
    windowOpenHandler: false,
    navigateHandler: false,
    permissionHandler: false,
    allowlisted: false,
  };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(LAYOUT.width, size.width);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(LAYOUT.height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, LAYOUT.height);

    const verdict = derive(current);
    const kind = ACTION_KIND[current.action];

    drawTitle();
    drawActionPanel(kind);
    drawGatePanel(verdict, kind);
    drawResultPanel(verdict);
    drawArrows(kind);
    drawLanes(verdict.lane);
    drawNote(verdict);

    emit({
      action: current.action,
      allowlisted: current.allowlisted,
      gate: verdict.gate,
      gateHost: verdict.gateHost,
      mounted: verdict.mounted,
      arrowLabel: verdict.arrowLabel,
      verdict: verdict.verdict,
      detail: verdict.detail,
      tone: verdict.tone,
    });
  }

  function drawTitle() {
    drawingContext.textAlign = 'left';
    drawingContext.fillStyle = COLORS.text;
    drawingContext.font = COLORS.note;
    drawingContext.fillText(
      '选择页面动作与口子挂载状态，观察判定流程与走向',
      LAYOUT.panels[0].x,
      36,
    );
    drawingContext.fillStyle = COLORS.muted;
    drawingContext.font = COLORS.noteSmall;
    drawingContext.fillText(
      '行为模型模拟，不等于运行 Electron；完整拦截实现见 navigation-main.js',
      LAYOUT.panels[0].x,
      58,
    );
  }

  function drawPanel(index: number, title: string, active: boolean) {
    const panel = LAYOUT.panels[index];
    drawingContext.fillStyle = active ? COLORS.highlightBg : COLORS.panelBg;
    drawingContext.strokeStyle = active ? COLORS.highlightBorder : COLORS.panelBorder;
    drawingContext.lineWidth = active ? 2 : 1;
    roundRect(panel.x, LAYOUT.panelTop, panel.width, LAYOUT.panelHeight, 8);
    drawingContext.fill();
    drawingContext.stroke();

    drawingContext.fillStyle = COLORS.text;
    drawingContext.font = COLORS.header;
    drawingContext.fillText(title, panel.x + 14, LAYOUT.panelTop + 28);
  }

  function drawActionPanel(kind: NavActionKind) {
    drawPanel(0, '渲染进程 · 页面动作', true);
    const view = ACTION_VIEW[kind];
    const x = LAYOUT.panels[0].x + 14;

    drawingContext.font = COLORS.mono;
    drawingContext.fillStyle = COLORS.text;
    view.code.forEach((line, index) => {
      drawingContext.fillText(line, x, LAYOUT.panelTop + 62 + index * 20);
    });

    drawingContext.fillStyle = COLORS.muted;
    drawingContext.font = COLORS.noteSmall;
    drawingContext.fillText(`来源：${view.source}`, x, LAYOUT.panelTop + 122);
    drawingContext.fillText(
      '页面世界拿不到主进程的口子，只能发起请求',
      x,
      LAYOUT.panelTop + 142,
    );
  }

  function drawGatePanel(verdict: Verdict, kind: NavActionKind) {
    drawPanel(1, '主进程 · 口子', kind !== 'in-page');
    const x = LAYOUT.panels[1].x + 14;

    if (kind === 'in-page') {
      drawingContext.fillStyle = COLORS.muted;
      drawingContext.font = COLORS.note;
      drawingContext.fillText('不经任何口子', x, LAYOUT.panelTop + 66);
      drawingContext.font = COLORS.noteSmall;
      drawingContext.fillText('页内导航不需要主进程把关', x, LAYOUT.panelTop + 90);
      return;
    }

    if (kind === 'redirect') {
      // 重定向画两段判定：初始导航的 will-navigate 已放行，把关在 will-redirect
      drawMonoLine('will-navigate', x, LAYOUT.panelTop + 56);
      drawingContext.fillStyle = COLORS.ok;
      drawingContext.font = COLORS.noteSmall;
      drawingContext.fillText('初始 URL 命中白名单 → 放行', x, LAYOUT.panelTop + 74);
      drawMonoLine('302 → will-redirect', x, LAYOUT.panelTop + 112);
      drawMountedState(verdict.mounted, x, LAYOUT.panelTop + 130);
      return;
    }

    // 口子名可能较长，手动拆成两行
    drawMonoWrapped(verdict.gate, x, LAYOUT.panelTop + 58, 2);
    drawMountedState(verdict.mounted, x, LAYOUT.panelTop + 104);

    drawingContext.fillStyle = COLORS.muted;
    drawingContext.font = COLORS.noteSmall;
    wrapText(verdict.arrowLabel, x, LAYOUT.panelTop + 130, LAYOUT.panels[1].width - 28, 16);
  }

  function drawMountedState(mounted: boolean | null, x: number, y: number) {
    drawingContext.font = COLORS.noteSmall;
    if (mounted === null) {
      drawingContext.fillStyle = COLORS.muted;
      drawingContext.fillText('不适用', x, y);
      return;
    }
    drawingContext.fillStyle = mounted ? COLORS.ok : COLORS.blocked;
    drawingContext.fillText(mounted ? '已挂载' : '未挂载', x, y);
  }

  function drawResultPanel(verdict: Verdict) {
    drawPanel(2, '结果', true);
    const x = LAYOUT.panels[2].x + 14;
    const toneColor =
      verdict.tone === 'ok'
        ? COLORS.ok
        : verdict.tone === 'warn'
          ? COLORS.warn
          : verdict.tone === 'blocked'
            ? COLORS.blocked
            : COLORS.muted;

    drawingContext.fillStyle = toneColor;
    drawingContext.font = COLORS.noteBold;
    wrapText(verdict.verdict, x, LAYOUT.panelTop + 58, LAYOUT.panels[2].width - 28, 19);

    drawingContext.fillStyle = COLORS.muted;
    drawingContext.font = COLORS.noteSmall;
    wrapText(verdict.detail, x, LAYOUT.panelTop + 116, LAYOUT.panels[2].width - 28, 16);
  }

  function drawArrows(kind: NavActionKind) {
    if (kind === 'in-page') {
      drawArrowBetween(0, 2);
      return;
    }
    drawArrowBetween(0, 1);
    drawArrowBetween(1, 2);
  }

  function drawArrowBetween(from: number, to: number) {
    const x1 = LAYOUT.panels[from].x + LAYOUT.panels[from].width + 3;
    const x2 = LAYOUT.panels[to].x - 3;
    const y = LAYOUT.panelTop + LAYOUT.panelHeight / 2;

    drawingContext.strokeStyle = COLORS.muted;
    drawingContext.fillStyle = COLORS.muted;
    drawingContext.lineWidth = 2;
    drawingContext.beginPath();
    drawingContext.moveTo(x1, y);
    drawingContext.lineTo(x2 - 8, y);
    drawingContext.stroke();
    drawingContext.beginPath();
    drawingContext.moveTo(x2, y);
    drawingContext.lineTo(x2 - 9, y - 5);
    drawingContext.lineTo(x2 - 9, y + 5);
    drawingContext.closePath();
    drawingContext.fill();
  }

  function drawLanes(lane: Verdict['lane']) {
    const chips: Array<{ label: string; target: Verdict['lane'] }> = [
      { label: '① 开新窗口', target: 'window' },
      { label: '② 当前窗口导航', target: 'navigate' },
      { label: '③ 权限申请', target: 'permission' },
    ];
    const x = LAYOUT.panels[0].x;
    drawingContext.font = COLORS.noteSmall;

    drawingContext.fillStyle = COLORS.muted;
    drawingContext.fillText('页面越界的三条通路：', x, LAYOUT.laneY);

    let cursor = x + 132;
    chips.forEach((chip) => {
      const chipWidth = 130;
      const active = chip.target === lane;
      drawingContext.fillStyle = active ? COLORS.highlightBg : COLORS.panelBg;
      drawingContext.strokeStyle = active ? COLORS.highlightBorder : COLORS.panelBorder;
      drawingContext.lineWidth = active ? 2 : 1;
      roundRect(cursor, LAYOUT.laneY - 18, chipWidth, 26, 6);
      drawingContext.fill();
      drawingContext.stroke();

      drawingContext.fillStyle = active ? COLORS.text : COLORS.muted;
      drawingContext.font = active ? COLORS.noteBold : COLORS.noteSmall;
      drawingContext.fillText(chip.label, cursor + 12, LAYOUT.laneY);
      cursor += chipWidth + 10;
    });
  }

  function drawNote(verdict: Verdict) {
    const x = LAYOUT.panels[0].x;

    // 路径注记：当前动作的边界说明
    drawingContext.fillStyle = COLORS.muted;
    drawingContext.font = COLORS.monoSmall;
    wrapText(verdict.pathNote, x, LAYOUT.noteY, LAYOUT.width - 80, 16);

    // 结论行：与正文判断一致
    drawingContext.font = COLORS.noteBold;
    if (verdict.tone === 'blocked') {
      drawingContext.fillStyle = COLORS.blocked;
      drawingContext.fillText(
        '不设防：三个默认行为同方向——不挂 handler 就是放行',
        x,
        LAYOUT.verdictY,
      );
    } else if (verdict.tone === 'ok') {
      drawingContext.fillStyle = COLORS.ok;
      drawingContext.fillText('防线生效：口子拦下，且拦下后有去处', x, LAYOUT.verdictY);
    } else if (verdict.tone === 'warn') {
      drawingContext.fillStyle = COLORS.warn;
      drawingContext.fillText('口子已拦：按白名单拒绝，页面拿不到越界能力', x, LAYOUT.verdictY);
    } else {
      drawingContext.fillStyle = COLORS.muted;
      drawingContext.fillText(
        verdict.mounted === null
          ? '不经口子：页内导航在页面世界内完成，无需拦截'
          : '口子已挂：目标在白名单内，按计划放行',
        x,
        LAYOUT.verdictY,
      );
    }
  }

  function drawMonoLine(text: string, x: number, y: number) {
    drawingContext.fillStyle = COLORS.text;
    drawingContext.font = COLORS.mono;
    drawingContext.fillText(text, x, y);
  }

  function drawMonoWrapped(text: string, x: number, y: number, maxLines: number) {
    drawingContext.font = COLORS.mono;
    drawingContext.fillStyle = COLORS.text;
    const lines = wrapLines(text, x, LAYOUT.panels[1].width - 28).slice(0, maxLines);
    lines.forEach((line, index) => {
      drawingContext.fillText(line, x, y + index * 18);
    });
  }

  function wrapLines(text: string, x: number, maxWidth: number): string[] {
    const lines: string[] = [];
    let line = '';
    for (const char of text) {
      if (drawingContext.measureText(line + char).width > maxWidth && line) {
        lines.push(line);
        line = char;
      } else {
        line += char;
      }
    }
    if (line) {
      lines.push(line);
    }
    return lines;
  }

  function wrapText(text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
    wrapLines(text, x, maxWidth).forEach((line, index) => {
      drawingContext.fillText(line, x, y + index * lineHeight);
    });
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
