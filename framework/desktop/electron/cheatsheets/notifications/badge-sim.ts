/**
 * 范例介绍：并排画出「角标」侧三种 API 各自改变的视觉位置——macOS Dock 的
 * 红点数字与弹跳、Windows 任务栏的进度条与 16×16 覆盖图标。
 * 输入：控件 badgeCount（Dock 角标数）、bounce（弹跳类型）、progress（任务栏进度）、
 *       overlay（是否叠覆盖图标）。
 * 操作：只用 Controls 调整输入，画布即时重绘。
 * 预期：badgeCount > 0 时 Dock 图标右上角出现红点数字，0 隐藏；bounce 为
 *       informational / critical 时图标下方标注弹跳行为差异；progress 非「无」时
 *       任务栏按钮下沿出现进度条（不确定态为斜纹）；overlay 打开时任务栏按钮
 *       右下角叠一个小圆点。
 * 阅读主线：角标不是消息，是状态视图——四个输入对应四个独立 API，每个 API
 *           只改一处视觉，且各有平台边界。本图按 macOS Dock 与 Windows 任务栏
 *           的常见形态绘制，真实系统另有动画细节（如不确定态为滚动动画）。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type BounceMode = '不弹跳' | 'informational' | 'critical';
export type ProgressMode = '无' | '0.6' | 'indeterminate';

export interface BadgeSimOptions {
  badgeCount: number;
  bounce: BounceMode;
  progress: ProgressMode;
  overlay: boolean;
}

export interface BadgeSimSnapshot {
  macosApiText: string;
  windowsApiText: string;
}

export interface BadgeSimInstance {
  update(options: BadgeSimOptions): void;
  dispose(): void;
}

const COLORS = {
  text: '#172033',
  muted: '#64748b',
  panelBg: '#f8fafc',
  panelBorder: '#cbd5e1',
  boxBg: '#ffffff',
  dockBg: '#e2e8f0',
  appIcon: '#4f7cff',
  otherIcon: '#cbd5e1',
  badgeRed: '#ef4444',
  badgeText: '#ffffff',
  taskbarBg: '#1f2937',
  taskbarActive: '#374151',
  progressBlue: '#4f7cff',
  overlayDot: '#ef4444',
  mono: '12px ui-monospace, SFMono-Regular, Menlo, monospace',
  monoSmall: '10px ui-monospace, SFMono-Regular, Menlo, monospace',
  label: '11px ui-sans-serif, system-ui, sans-serif',
  note: '13px ui-sans-serif, system-ui, sans-serif',
};

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const LAYOUT = {
  title: { x: 48, y: 36 },
  macosPanel: { x: 48, y: 60, width: 320, height: 216 },
  windowsPanel: { x: 392, y: 60, width: 320, height: 216 },
  macosDock: { x: 76, y: 150, width: 264, height: 72 },
  appIcon: { x: 246, y: 158, width: 56, height: 56 },
  taskbar: { x: 420, y: 130, width: 264, height: 60 },
  appTask: { x: 536, y: 138, width: 56, height: 44 },
  macosApi: { x: 48, y: 304 },
  windowsApi: { x: 392, y: 304 },
  footer: { x: 48, y: 352 },
};

export function createBadgeSim(
  canvas: HTMLCanvasElement,
  emit: (snapshot: BadgeSimSnapshot) => void,
): BadgeSimInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  let options: BadgeSimOptions = {
    badgeCount: 3,
    bounce: '不弹跳',
    progress: '无',
    overlay: false,
  };

  function macosApiText(): string {
    const parts = [`app.setBadgeCount(${options.badgeCount})`];
    if (options.bounce !== '不弹跳') {
      parts.push(`app.dock.bounce('${options.bounce}') → id`);
    }
    return parts.join(' · ');
  }

  function windowsApiText(): string {
    const parts: string[] = [];
    if (options.progress === '无') {
      parts.push('win.setProgressBar(-1)（清除）');
    } else if (options.progress === 'indeterminate') {
      parts.push('win.setProgressBar(1.5)（> 1 → 不确定态）');
    } else {
      parts.push(`win.setProgressBar(${options.progress})`);
    }
    parts.push(
      options.overlay
        ? "win.setOverlayIcon(icon, '3 条新消息')"
        : 'win.setOverlayIcon(null)（清除）',
    );
    return parts.join(' · ');
  }

  function snapshot(): BadgeSimSnapshot {
    return { macosApiText: macosApiText(), windowsApiText: windowsApiText() };
  }

  function roundRect(rect: Rect, radius: number): void {
    ctx.beginPath();
    ctx.moveTo(rect.x + radius, rect.y);
    ctx.arcTo(rect.x + rect.width, rect.y, rect.x + rect.width, rect.y + rect.height, radius);
    ctx.arcTo(rect.x + rect.width, rect.y + rect.height, rect.x, rect.y + rect.height, radius);
    ctx.arcTo(rect.x, rect.y + rect.height, rect.x, rect.y, radius);
    ctx.closePath();
  }

  function drawPanel(rect: Rect, name: string, note: string): void {
    ctx.fillStyle = COLORS.panelBg;
    ctx.strokeStyle = COLORS.panelBorder;
    ctx.lineWidth = 1;
    roundRect(rect, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = COLORS.text;
    ctx.font = '600 14px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(name, rect.x + 20, rect.y + 30);
    ctx.fillStyle = COLORS.muted;
    ctx.font = COLORS.label;
    ctx.fillText(note, rect.x + 20, rect.y + 50);
  }

  function drawAppIcon(rect: Rect, tilt: boolean): void {
    ctx.save();
    if (tilt) {
      // 弹跳：画成轻微倾斜，示意「正在跳」
      ctx.translate(rect.x + rect.width / 2, rect.y + rect.height / 2);
      ctx.rotate(-0.12);
      ctx.translate(-(rect.x + rect.width / 2), -(rect.y + rect.height / 2));
    }
    ctx.fillStyle = COLORS.appIcon;
    roundRect(rect, 12);
    ctx.fill();
    ctx.restore();
  }

  function drawBadge(count: number): void {
    if (count <= 0) {
      return; // setBadgeCount(0) 即隐藏红点
    }
    const rect = LAYOUT.appIcon;
    const cx = rect.x + rect.width - 4;
    const cy = rect.y + 4;
    ctx.fillStyle = COLORS.badgeRed;
    ctx.beginPath();
    ctx.arc(cx, cy, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.badgeText;
    ctx.font = '600 13px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(count), cx, cy + 5);
    ctx.textAlign = 'left';
  }

  function drawMacos(): void {
    drawPanel(
      LAYOUT.macosPanel,
      'macOS Dock',
      'app.setBadgeCount / app.dock.bounce（仅 macOS）',
    );

    // Dock 条与占位图标
    ctx.fillStyle = COLORS.dockBg;
    roundRect(LAYOUT.macosDock, 12);
    ctx.fill();
    for (let index = 0; index < 3; index += 1) {
      ctx.fillStyle = COLORS.otherIcon;
      roundRect({ x: 92 + index * 52, y: 166, width: 36, height: 36 }, 8);
      ctx.fill();
    }

    const bouncing = options.bounce !== '不弹跳';
    drawAppIcon(LAYOUT.appIcon, bouncing);
    drawBadge(options.badgeCount);

    // 弹跳行为标注
    ctx.fillStyle = bouncing ? COLORS.text : COLORS.muted;
    ctx.font = COLORS.monoSmall;
    const bounceNote =
      options.bounce === '不弹跳'
        ? '未调用 bounce'
        : options.bounce === 'informational'
          ? 'informational：弹约 1 秒；应用未聚焦时返回 id'
          : 'critical：持续弹，直到应用激活或 cancelBounce(id)';
    ctx.fillText(bounceNote, LAYOUT.macosPanel.x + 20, LAYOUT.macosPanel.y + 190);
  }

  function drawWindows(): void {
    drawPanel(
      LAYOUT.windowsPanel,
      'Windows 任务栏',
      'win.setProgressBar / win.setOverlayIcon（Linux 差异见正文）',
    );

    // 任务栏条与占位按钮
    ctx.fillStyle = COLORS.taskbarBg;
    roundRect(LAYOUT.taskbar, 8);
    ctx.fill();
    for (let index = 0; index < 2; index += 1) {
      ctx.fillStyle = COLORS.taskbarActive;
      roundRect({ x: 436 + index * 50, y: 142, width: 38, height: 36 }, 6);
      ctx.fill();
    }

    const active = LAYOUT.appTask;
    ctx.fillStyle = COLORS.taskbarActive;
    roundRect(active, 6);
    ctx.fill();

    // 进度条画在按钮下沿：normal 为实色，indeterminate 画斜纹示意
    if (options.progress === '0.6') {
      ctx.fillStyle = COLORS.progressBlue;
      roundRect({ x: active.x, y: active.y + active.height - 4, width: active.width * 0.6, height: 4 }, 2);
      ctx.fill();
    } else if (options.progress === 'indeterminate') {
      ctx.save();
      ctx.beginPath();
      roundRect({ x: active.x, y: active.y + active.height - 4, width: active.width, height: 4 }, 2);
      ctx.clip();
      ctx.fillStyle = COLORS.progressBlue;
      for (let index = -1; index < 6; index += 1) {
        ctx.save();
        ctx.translate(active.x + index * 14, active.y + active.height - 6);
        ctx.transform(1, 0, -0.6, 1, 0, 0);
        ctx.fillRect(0, 0, 7, 8);
        ctx.restore();
      }
      ctx.restore();
    }

    // 覆盖图标：任务栏按钮右下角 16×16 位置的小圆点
    if (options.overlay) {
      const cx = active.x + active.width - 6;
      const cy = active.y + active.height - 10;
      ctx.fillStyle = COLORS.boxBg;
      ctx.beginPath();
      ctx.arc(cx, cy, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.overlayDot;
      ctx.beginPath();
      ctx.arc(cx, cy, 7, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawFooter(): void {
    ctx.fillStyle = COLORS.muted;
    ctx.font = COLORS.label;
    ctx.textAlign = 'left';
    ctx.fillText(
      'badgeCount 调 0 即隐藏红点；Linux 的进度条走 LauncherEntry D-Bus 且不支持不确定态',
      LAYOUT.footer.x,
      LAYOUT.footer.y,
    );
  }

  function drawFrame(): void {
    const size = readCanvasSize(canvas);
    const width = Math.max(760, size.width);
    const height = 380;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = COLORS.text;
    ctx.font = COLORS.note;
    ctx.fillText('调整控件，看每个角标 API 各改哪一处视觉', LAYOUT.title.x, LAYOUT.title.y);

    drawMacos();
    drawWindows();

    ctx.fillStyle = COLORS.muted;
    ctx.font = COLORS.mono;
    ctx.fillText(macosApiText(), LAYOUT.macosApi.x, LAYOUT.macosApi.y);
    ctx.fillText(windowsApiText(), LAYOUT.windowsApi.x, LAYOUT.windowsApi.y);

    drawFooter();
    emit(snapshot());
  }

  const resizeObserver = createResizeObserver(canvas, () => drawFrame());

  return {
    update(next) {
      options = next;
      drawFrame();
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
