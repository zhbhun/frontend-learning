/**
 * 范例介绍：模拟「主题色源 themeSource 三态覆盖」怎样决定生效主题，
 * 以及生效主题如何同步驱动页面媒体查询与原生 UI（真实 Electron 无法在浏览器
 * 运行，本模拟复现官方文档行为；真实环境的验证方式见正文快速上手）。
 *
 * 输入与前置状态：控件「系统主题」模拟操作系统当前的深浅外观；「themeSource」
 * 对应 nativeTheme.themeSource 的三个合法值。
 * 主要操作：切换两个控件，观察色源覆盖链路。
 * 预期结果：themeSource 为 system 时生效值跟随系统；light / dark 时覆盖系统；
 * 生效值每次翻转，页面卡片与原生 UI 卡片同步换装，'updated' 计数 +1。
 * 阅读主线：先在 system 档切换系统主题看「跟随」，再强制 dark 看覆盖箭头反转。
 */

export type SystemTheme = 'light' | 'dark';
export type ThemeSource = 'system' | 'light' | 'dark';

export interface ThemeSimOptions {
  systemTheme: SystemTheme;
  themeSource: ThemeSource;
}

export interface ThemeSimSnapshot {
  shouldUseDarkText: string;
  cssQueryText: string;
  nativeUiText: string;
  updatedText: string;
}

export interface ThemeSimInstance {
  update(options: ThemeSimOptions): void;
  dispose(): void;
}

// 生效值：色源覆盖优先，system 档跟随系统——对应 shouldUseDarkColors 的语义
function effectiveDark(systemTheme: SystemTheme, themeSource: ThemeSource): boolean {
  if (themeSource === 'dark') return true;
  if (themeSource === 'light') return false;
  return systemTheme === 'dark';
}

// 布局常量：输入行 → 箭头区 → 生效值 → 两张消费者卡片 → updated 徽标
const INPUT_Y = 50;
const INPUT_H = 76;
const EFFECTIVE_Y = 162;
const EFFECTIVE_H = 56;
const CARD_Y = 252;
const CARD_H = 100;
const CANVAS_W = 640;
const CANVAS_H = 440;

interface ThemeColors {
  bg: string;
  fg: string;
  muted: string;
  border: string;
  bar: string;
}

const LIGHT: ThemeColors = {
  bg: '#ffffff',
  fg: '#1f2430',
  muted: '#64748b',
  border: '#dbe3f0',
  bar: '#f1f5f9',
};

const DARK: ThemeColors = {
  bg: '#141a26',
  fg: '#e6e9f2',
  muted: '#94a3b8',
  border: '#33405c',
  bar: '#2a3244',
};

const SOURCE_TEXT: Record<ThemeSource, string> = {
  system: 'system（跟随）',
  light: 'light（强制浅色）',
  dark: 'dark（强制深色）',
};

export function createThemeSim(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ThemeSimSnapshot) => void,
): ThemeSimInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  let systemTheme: SystemTheme = 'light';
  let themeSource: ThemeSource = 'system';
  let updatedCount = 0;
  let lastReason = '—';

  function snapshot(): ThemeSimSnapshot {
    const dark = effectiveDark(systemTheme, themeSource);
    return {
      shouldUseDarkText: dark ? 'true（深色）' : 'false（浅色）',
      cssQueryText: dark ? 'dark' : 'light',
      nativeUiText: dark ? '深色' : '浅色',
      updatedText:
        updatedCount === 0
          ? '尚未触发'
          : `触发 ${updatedCount} 次 · 最近：${lastReason}`,
    };
  }

  function refresh(): void {
    emit(snapshot());
    draw();
  }

  function panel(x: number, y: number, w: number, h: number): void {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 10);
    ctx.fill();
    ctx.strokeStyle = '#dbe3f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 10);
    ctx.stroke();
  }

  function label(text: string, x: number, y: number, color: string): void {
    ctx.fillStyle = color;
    ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(text, x, y);
  }

  // 日 / 月图标：标示系统主题的当前档位
  function drawLuminanceIcon(kind: 'sun' | 'moon', cx: number, cy: number): void {
    if (kind === 'sun') {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      for (let i = 0; i < 8; i += 1) {
        const angle = (Math.PI / 4) * i;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * 11, cy + Math.sin(angle) * 11);
        ctx.lineTo(cx + Math.cos(angle) * 15, cy + Math.sin(angle) * 15);
        ctx.stroke();
      }
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(cx, cy, 7, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    ctx.fillStyle = '#93c5fd';
    ctx.beginPath();
    ctx.arc(cx, cy, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx + 4, cy - 4, 7, 0, Math.PI * 2);
    ctx.fill();
  }

  // 箭头：active 为覆盖链路中生效的一支
  function arrow(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    active: boolean,
  ): void {
    ctx.save();
    ctx.strokeStyle = active ? '#4f7cff' : '#cbd5e1';
    ctx.lineWidth = active ? 2.5 : 1.5;
    if (!active) {
      ctx.setLineDash([4, 4]);
    }
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    // 箭头头部
    const angle = Math.atan2(y2 - y1, x2 - x1);
    ctx.setLineDash([]);
    ctx.fillStyle = active ? '#4f7cff' : '#cbd5e1';
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(
      x2 - 9 * Math.cos(angle - Math.PI / 7),
      y2 - 9 * Math.sin(angle - Math.PI / 7),
    );
    ctx.lineTo(
      x2 - 9 * Math.cos(angle + Math.PI / 7),
      y2 - 9 * Math.sin(angle + Math.PI / 7),
    );
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // 页面卡片：配色随生效主题——对应 prefers-color-scheme 媒体查询的消费
  function drawPageCard(colors: ThemeColors, x: number): void {
    label('页面配色 · prefers-color-scheme', x, CARD_Y - 8, '#475569');
    ctx.fillStyle = colors.bg;
    ctx.beginPath();
    ctx.roundRect(x, CARD_Y, 280, CARD_H, 8);
    ctx.fill();
    ctx.strokeStyle = colors.border;
    ctx.beginPath();
    ctx.roundRect(x, CARD_Y, 280, CARD_H, 8);
    ctx.stroke();

    ctx.fillStyle = colors.fg;
    ctx.font = '600 14px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('页面标题', x + 16, CARD_Y + 24);
    ctx.fillStyle = colors.muted;
    ctx.fillRect(x + 16, CARD_Y + 40, 180, 8);
    ctx.fillRect(x + 16, CARD_Y + 56, 220, 8);
    ctx.fillStyle = '#4f7cff';
    ctx.beginPath();
    ctx.roundRect(x + 16, CARD_Y + 72, 88, 20, 5);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('按钮', x + 60, CARD_Y + 82);
    ctx.textAlign = 'left';

    ctx.fillStyle = '#475569';
    ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
      `@media (prefers-color-scheme: ${effectiveDark(systemTheme, themeSource) ? 'dark' : 'light'})`,
      x + 140,
      CARD_Y + CARD_H + 16,
    );
    ctx.textAlign = 'left';
  }

  // 原生 UI 卡片：菜单条与对话框随生效主题换装
  function drawNativeCard(colors: ThemeColors, x: number): void {
    label('原生 UI · 菜单 / 对话框', x, CARD_Y - 8, '#475569');
    ctx.fillStyle = colors.bg;
    ctx.beginPath();
    ctx.roundRect(x, CARD_Y, 280, CARD_H, 8);
    ctx.fill();
    ctx.strokeStyle = colors.border;
    ctx.beginPath();
    ctx.roundRect(x, CARD_Y, 280, CARD_H, 8);
    ctx.stroke();

    // 应用菜单条：先裁进卡片圆角再铺色
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, CARD_Y, 280, CARD_H, 8);
    ctx.clip();
    ctx.fillStyle = colors.bar;
    ctx.fillRect(x, CARD_Y, 280, 26);
    ctx.restore();
    ctx.fillStyle = colors.fg;
    ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
    ['文件', '编辑', '视图', '帮助'].forEach((item, index) => {
      ctx.fillText(item, x + 16 + index * 52, CARD_Y + 13);
    });

    // 对话框
    ctx.fillStyle = colors.bg;
    ctx.strokeStyle = colors.border;
    ctx.beginPath();
    ctx.roundRect(x + 16, CARD_Y + 38, 248, 46, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = colors.fg;
    ctx.fillText('打开文件', x + 28, CARD_Y + 61);
    ctx.fillStyle = colors.muted;
    ctx.beginPath();
    ctx.roundRect(x + 176, CARD_Y + 50, 40, 22, 5);
    ctx.fill();
    ctx.fillStyle = '#4f7cff';
    ctx.beginPath();
    ctx.roundRect(x + 224, CARD_Y + 50, 40, 22, 5);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '11px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('打开', x + 244, CARD_Y + 61);
    ctx.textAlign = 'left';

    ctx.fillStyle = '#475569';
    ctx.font = '11px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('渲染方：macOS 系统 · Windows / Linux Electron', x + 140, CARD_Y + CARD_H + 16);
    ctx.textAlign = 'left';
  }

  function draw(): void {
    const width = canvas.clientWidth || CANVAS_W;
    const height = canvas.clientHeight || CANVAS_H;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, width, height);
    ctx.textBaseline = 'middle';

    const dark = effectiveDark(systemTheme, themeSource);
    const colors = dark ? DARK : LIGHT;
    const following = themeSource === 'system';

    // 顶部场景行
    label('主题场景', 20, 26, '#475569');
    ctx.fillStyle = '#172033';
    ctx.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(
      `系统${systemTheme === 'dark' ? '深色' : '浅色'} · themeSource = ${themeSource}`,
      84,
      26,
    );

    // 输入框 A：系统主题
    panel(20, INPUT_Y, 180, INPUT_H);
    label('系统主题', 34, INPUT_Y + 18, '#475569');
    drawLuminanceIcon(systemTheme === 'dark' ? 'moon' : 'sun', 44, INPUT_Y + 50);
    ctx.fillStyle = '#172033';
    ctx.font = '600 14px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(systemTheme === 'dark' ? '深色' : '浅色', 66, INPUT_Y + 50);

    // 输入框 B：应用色源 themeSource
    panel(440, INPUT_Y, 180, INPUT_H);
    label('应用色源 themeSource', 454, INPUT_Y + 18, '#475569');
    ctx.fillStyle = '#172033';
    ctx.font = '600 13px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText(SOURCE_TEXT[themeSource], 454, INPUT_Y + 50);

    // 覆盖链路：生效的一支画实线，另一支画虚线
    arrow(110, INPUT_Y + INPUT_H, 262, EFFECTIVE_Y, following);
    arrow(530, INPUT_Y + INPUT_H, 388, EFFECTIVE_Y, !following);
    ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = following ? '#4f7cff' : '#94a3b8';
    ctx.fillText(following ? '跟随' : '被覆盖', 152, 146);
    ctx.fillStyle = following ? '#94a3b8' : '#4f7cff';
    ctx.fillText(following ? '未覆盖' : '覆盖', 492, 146);
    ctx.textAlign = 'left';

    // 生效值：底色与文字随生效主题
    ctx.fillStyle = colors.bg;
    ctx.beginPath();
    ctx.roundRect(180, EFFECTIVE_Y, 280, EFFECTIVE_H, 10);
    ctx.fill();
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(180, EFFECTIVE_Y, 280, EFFECTIVE_H, 10);
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.fg;
    ctx.font = '600 14px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText(
      `shouldUseDarkColors = ${dark ? 'true' : 'false'}`,
      320,
      EFFECTIVE_Y + 22,
    );
    ctx.fillStyle = colors.muted;
    ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(`生效主题：${dark ? '深色' : '浅色'}`, 320, EFFECTIVE_Y + 42);
    ctx.textAlign = 'left';

    drawPageCard(colors, 30);
    drawNativeCard(colors, 330);

    // 'updated' 事件徽标：生效值每次翻转计数 +1
    const triggered = updatedCount > 0;
    ctx.fillStyle = triggered ? '#eef3ff' : '#f1f5f9';
    ctx.strokeStyle = triggered ? '#4f7cff' : '#dbe3f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(20, 396, 380, 28, 14);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = triggered ? '#3b63e0' : '#94a3b8';
    ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(
      `nativeTheme 'updated'：${snapshot().updatedText}`,
      34,
      410,
    );
  }

  return {
    update(options) {
      const prevEffective = effectiveDark(systemTheme, themeSource);
      const prevSource = themeSource;
      const prevSystem = systemTheme;
      systemTheme = options.systemTheme;
      themeSource = options.themeSource;
      // 生效值翻转对应一次 'updated'：官方注明该事件需自查具体读数
      if (effectiveDark(systemTheme, themeSource) !== prevEffective) {
        updatedCount += 1;
        lastReason = themeSource !== prevSource
          ? 'themeSource 变更'
          : prevSystem !== systemTheme
            ? '系统主题切换'
            : '—';
      }
      refresh();
    },
    // 无事件监听与计时器：无需清理
    dispose() {},
  };
}
