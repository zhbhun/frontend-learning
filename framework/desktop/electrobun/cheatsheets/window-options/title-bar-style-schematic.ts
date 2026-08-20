/**
 * 演示内容：BrowserWindow 构造选项 titleBarStyle 三种取值的外观差异、各自自动配置的
 * styleMask 项（Titled / FullSizeContentView），以及 trafficLightOffset 的生效条件。
 * 输入：titleBarStyle（default / hidden / hiddenInset）、红绿灯偏移 offsetX / offsetY。
 * 操作：在 Controls 中切换 titleBarStyle、拖动红绿灯偏移量。
 * 预期结果：左侧窗口示意与右侧 styleMask 摘要随输入联动——default 保留原生标题栏；
 * hidden 无标题栏也无原生控件；hiddenInset 红绿灯内嵌悬浮于内容且可被偏移。
 * 真实窗口外观以课程目录的 title-bar-styles.ts 桌面范例为准。
 * 阅读主线：resolveTitleBarStyle() 是唯一判定逻辑（对应 1.18.1 包内 init() 的合并规则），
 * draw() 只负责把结果画出来。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type TitleBarStyle = 'default' | 'hidden' | 'hiddenInset';

export interface TitleBarStyleOptions {
  titleBarStyle: TitleBarStyle;
  offsetX: number;
  offsetY: number;
}

export interface TitleBarStyleSnapshot {
  titleBarStyle: TitleBarStyle;
  titled: string;
  fullSizeContentView: string;
  trafficLights: string;
  offsetEffect: string;
}

export interface TitleBarStyleInstance {
  update(options: TitleBarStyleOptions): void;
  dispose(): void;
}

const COLORS = {
  heading: '#172033',
  muted: '#475569',
  faint: '#94a3b8',
  windowBorder: '#64748b',
  titlebar: '#e2e8f0',
  content: '#f1f5f9',
  contentLine: '#cbd5e1',
  accent: '#4f7cff',
  warn: '#b45309',
  lightRed: '#ff5f57',
  lightYellow: '#febc2e',
  lightGreen: '#28c840',
};

interface StyleResolution {
  titled: boolean;
  fullSizeContentView: boolean;
  trafficLights: 'titlebar' | 'inset' | 'none';
  offsetEffective: boolean;
  note: string;
}

// 对应 1.18.1 dist/api/bun/core/BrowserWindow.ts init() 的自动配置：
// default 不改动任何 flag；hidden 强制 Titled:false + FullSizeContentView:true；
// hiddenInset 强制 Titled:true + FullSizeContentView:true。
function resolveTitleBarStyle(style: TitleBarStyle): StyleResolution {
  if (style === 'hidden') {
    return {
      titled: false,
      fullSizeContentView: true,
      trafficLights: 'none',
      offsetEffective: false,
      note: '无标题栏、无原生控件：标题栏与窗口控件全部自绘',
    };
  }

  if (style === 'hiddenInset') {
    return {
      titled: true,
      fullSizeContentView: true,
      trafficLights: 'inset',
      offsetEffective: true,
      note: '内容延伸到标题栏下，红绿灯悬浮在内容上',
    };
  }

  return {
    titled: true,
    fullSizeContentView: false,
    trafficLights: 'titlebar',
    offsetEffective: false,
    note: '原生标题栏 + 系统窗口控件（关闭 / 最小化 / 缩放）',
  };
}

// 面板文字按宽度断行，避免超出方框
function wrapText(
  text: string,
  maxWidth: number,
  context: CanvasRenderingContext2D,
): string[] {
  if (context.measureText(text).width <= maxWidth) {
    return [text];
  }

  const tokens = text.split('');
  const lines: string[] = [];
  let line = '';

  for (const token of tokens) {
    if (line && context.measureText(line + token).width > maxWidth) {
      lines.push(line);
      line = token;
    } else {
      line += token;
    }
  }

  if (line) {
    lines.push(line);
  }

  return lines;
}

export function createTitleBarStyleSchematic(
  canvas: HTMLCanvasElement,
  emit: (snapshot: TitleBarStyleSnapshot) => void,
): TitleBarStyleInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  let current: TitleBarStyleOptions = {
    titleBarStyle: 'default',
    offsetX: 0,
    offsetY: 0,
  };

  function drawTrafficLights(cx: number, cy: number, radius = 4.5) {
    const colors = [
      COLORS.lightRed,
      COLORS.lightYellow,
      COLORS.lightGreen,
    ];

    colors.forEach((color, index) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(cx + index * 14, cy, radius, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawWindowMock(
    x: number,
    y: number,
    width: number,
    height: number,
    resolution: StyleResolution,
    offsetX: number,
    offsetY: number,
  ) {
    const titlebarHeight = 28;

    // 窗口外框；标题栏与内容都在这个圆角矩形内绘制
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 8);
    ctx.clip();

    ctx.fillStyle = COLORS.content;
    ctx.fillRect(x, y, width, height);

    if (current.titleBarStyle === 'default') {
      ctx.fillStyle = COLORS.titlebar;
      ctx.fillRect(x, y, width, titlebarHeight);
    }

    // 内容示意条：FullSizeContentView 时从 y=0 开始，否则让出标题栏
    const contentTop =
      y + (resolution.fullSizeContentView ? 8 : titlebarHeight + 10);
    ctx.fillStyle = COLORS.contentLine;
    const barWidths = [0.62, 0.85, 0.45];
    barWidths.forEach((ratio, index) => {
      ctx.beginPath();
      ctx.roundRect(
        x + 14,
        contentTop + index * 18,
        (width - 28) * ratio,
        8,
        4,
      );
      ctx.fill();
    });

    if (resolution.fullSizeContentView) {
      // 内容延伸到标题栏下：虚线标出「原本标题栏」的位置
      ctx.strokeStyle = COLORS.faint;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(x + 1, y + titlebarHeight);
      ctx.lineTo(x + width - 1, y + titlebarHeight);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (resolution.trafficLights === 'titlebar') {
      drawTrafficLights(x + 14, y + titlebarHeight / 2);
      ctx.fillStyle = COLORS.muted;
      ctx.font = '600 11px ui-sans-serif, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Electrobun', x + width / 2, y + titlebarHeight / 2 + 4);
      ctx.textAlign = 'left';
    } else if (resolution.trafficLights === 'inset') {
      // 红绿灯内嵌悬浮：默认在左上角，受 trafficLightOffset 偏移
      const drawX = Math.min(offsetX, Math.max(0, width - 56));
      const drawY = Math.min(offsetY, 24);
      drawTrafficLights(x + 12 + drawX, y + 10 + drawY, 4);
    }

    ctx.restore();

    ctx.strokeStyle = COLORS.windowBorder;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 8);
    ctx.stroke();
  }

  function drawPanel(
    x: number,
    y: number,
    width: number,
    height: number,
    resolution: StyleResolution,
    offsetX: number,
    offsetY: number,
  ) {
    ctx.strokeStyle = COLORS.faint;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 8);
    ctx.stroke();

    let cursorY = y + 22;
    ctx.fillStyle = COLORS.muted;
    ctx.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('styleMask 自动配置', x + 14, cursorY);
    cursorY += 26;

    // 与内置默认不同的值高亮：default 时 Titled=true、FullSizeContentView=false
    ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    const flags: Array<[string, boolean, boolean]> = [
      ['Titled', resolution.titled, true],
      ['FullSizeContentView', resolution.fullSizeContentView, false],
    ];

    for (const [name, value, builtIn] of flags) {
      const changed = value !== builtIn;
      ctx.fillStyle = COLORS.heading;
      ctx.fillText(`${name}:`, x + 14, cursorY);
      ctx.fillStyle = changed ? COLORS.accent : COLORS.muted;
      ctx.font = changed
        ? '700 12px ui-monospace, SFMono-Regular, Menlo, monospace'
        : '12px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillText(String(value), x + 14 + ctx.measureText(`${name}:`).width + 8, cursorY);
      ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
      cursorY += 20;
    }

    ctx.fillStyle = COLORS.faint;
    ctx.font = '11px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('其余 flag 保持内置默认（见正文 styleMask 小节）', x + 14, cursorY);
    cursorY += 26;

    ctx.strokeStyle = COLORS.contentLine;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 14, cursorY - 12);
    ctx.lineTo(x + width - 14, cursorY - 12);
    ctx.stroke();

    ctx.fillStyle = COLORS.heading;
    ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText(`trafficLightOffset: { x: ${offsetX}, y: ${offsetY} }`, x + 14, cursorY);
    cursorY += 18;
    ctx.fillStyle = resolution.offsetEffective ? COLORS.accent : COLORS.warn;
    ctx.font = `${resolution.offsetEffective ? '600 ' : ''}11px ui-sans-serif, system-ui, sans-serif`;
    const effectText = resolution.offsetEffective
      ? '生效：macOS + hiddenInset'
      : '忽略：仅 macOS 且 hiddenInset 时生效';
    ctx.fillText(effectText, x + 14, cursorY);
    cursorY += 20;

    ctx.fillStyle = COLORS.muted;
    ctx.font = '11px ui-sans-serif, system-ui, sans-serif';
    const noteLines = wrapText(resolution.note, width - 28, ctx);
    for (const line of noteLines.slice(0, 2)) {
      ctx.fillText(line, x + 14, cursorY);
      cursorY += 15;
    }
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(280, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const resolution = resolveTitleBarStyle(current.titleBarStyle);

    ctx.fillStyle = COLORS.heading;
    ctx.font = '600 16px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(`titleBarStyle: "${current.titleBarStyle}"`, 24, 38);

    // 左侧窗口示意 + 右侧 styleMask 摘要，始终单行排布以适配舞台高度
    const margin = 24;
    const top = 56;
    const gap = 20;
    const mockWidth = Math.max(190, Math.min(320, width * 0.42));
    const mockHeight = Math.min(210, Math.max(150, height - top - 60));
    const panelX = margin + mockWidth + gap;
    const panelWidth = Math.max(180, width - panelX - margin);

    drawWindowMock(
      margin,
      top,
      mockWidth,
      mockHeight,
      resolution,
      current.offsetX,
      current.offsetY,
    );
    drawPanel(
      panelX,
      top,
      panelWidth,
      mockHeight,
      resolution,
      current.offsetX,
      current.offsetY,
    );

    ctx.fillStyle = COLORS.faint;
    ctx.font = '11px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(
      '真实窗口外观以课程内 title-bar-styles.ts 桌面范例为准；hiddenInset 在非 macOS 上行为接近 hidden。',
      margin,
      top + mockHeight + 24,
    );

    emit({
      titleBarStyle: current.titleBarStyle,
      titled: String(resolution.titled),
      fullSizeContentView: String(resolution.fullSizeContentView),
      trafficLights:
        resolution.trafficLights === 'titlebar'
          ? '标题栏内'
          : resolution.trafficLights === 'inset'
            ? '内嵌于内容区'
            : '隐藏',
      offsetEffect: resolution.offsetEffective ? '生效（macOS）' : '忽略',
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
