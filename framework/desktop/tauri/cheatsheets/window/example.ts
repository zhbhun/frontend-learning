/**
 * 范例介绍:演示「调节 app.windows[0] 的窗口属性配置 → 模拟窗口启动外观跟着变」。
 * 输入:width / height(逻辑像素)、title、resizable、decorations、center、scaleFactor(显示器缩放)。
 * 主要操作:画一块模拟桌面,窗口按当前配置绘制——decorations 控制系统标题栏与
 *   红绿灯,resizable 控制右下角缩放手柄,center 控制启动位置(x/y 标记或居中参考线),
 *   无边框时在窗口顶部画出需要自建的 data-tauri-drag-region 拖拽区。
 * 预期结果:调整 width/height 窗口同步变大变小;scaleFactor 在 1x/2x 间切换时,
 *   逻辑尺寸不变、物理读数翻倍——配置写逻辑像素,屏幕像素是物理像素。
 * 阅读主线:声明式配置决定窗口启动时是什么样;一个字段管一个外观面;
 *   逻辑像素与物理像素差一个 scaleFactor。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

const TEXT = '#172033';
const DIM = '#64748b';
const PALE = '#cbd5e1';
const ACCENT = '#4f7cff';
const ACCENT_LIGHT = '#8fb3ff';
const DESKTOP_BG = '#e8edf5';
const WINDOW_BG = '#ffffff';
const TITLE_BG = '#f1f5f9';
const CONTENT_BAR = '#e2e8f0';

export interface ExampleArgs {
  /** 逻辑像素宽度(对应 WindowConfig.width)。 */
  width: number;
  /** 逻辑像素高度(对应 WindowConfig.height)。 */
  height: number;
  /** 标题栏文字(对应 WindowConfig.title)。 */
  title: string;
  /** 是否允许拖拽缩放(对应 WindowConfig.resizable)。 */
  resizable: boolean;
  /** 是否绘制系统边框与标题栏(对应 WindowConfig.decorations)。 */
  decorations: boolean;
  /** 启动时是否居中(对应 WindowConfig.center)。 */
  center: boolean;
  /** 显示器缩放系数,决定逻辑像素与物理像素的换算。 */
  scaleFactor: 1 | 2;
}

export interface ExampleSnapshot {
  /** 读数:逻辑尺寸(配置与 LogicalSize 的单位)。 */
  logical: string;
  /** 读数:物理尺寸(innerSize() 返回的单位)。 */
  physical: string;
  /** 读数:窗口装饰状态。 */
  chrome: string;
  /** 读数:是否可调整大小。 */
  resizable: string;
  /** 读数:启动位置。 */
  position: string;
}

export interface ExampleInstance {
  update(options: ExampleArgs): void;
  dispose(): void;
}

function roundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + w, y, x + w, y + h, radius);
  context.arcTo(x + w, y + h, x, y + h, radius);
  context.arcTo(x, y + h, x, y, radius);
  context.arcTo(x, y, x + w, y, radius);
  context.closePath();
}

/** 只圆上角的标题栏路径(顶部圆角 + 底部直角)。 */
function titleBarPath(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2);
  context.beginPath();
  context.moveTo(x, y + h);
  context.lineTo(x, y + radius);
  context.arcTo(x, y, x + radius, y, radius);
  context.lineTo(x + w - radius, y);
  context.arcTo(x + w, y, x + w, y + radius, radius);
  context.lineTo(x + w, y + h);
  context.closePath();
}

/** 标题过长时按可用宽度截断。 */
function fitTitle(
  context: CanvasRenderingContext2D,
  title: string,
  maxWidth: number,
): string {
  if (context.measureText(title).width <= maxWidth) {
    return title;
  }
  let text = title;
  while (text.length > 1 && context.measureText(`${text}…`).width > maxWidth) {
    text = text.slice(0, -1);
  }
  return `${text}…`;
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

  let current: ExampleArgs = {
    width: 800,
    height: 600,
    title: '我的便签',
    resizable: true,
    decorations: true,
    center: false,
    scaleFactor: 2,
  };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(760, size.width);
    const height = Math.max(432, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);
    drawingContext.textAlign = 'left';
    drawingContext.setLineDash([]);

    const args = current;
    const scale = args.scaleFactor;

    // 模拟桌面:窗口在这里按配置绘制,底部留出读数标注区。
    const desktopX = 24;
    const desktopY = 24;
    const desktopW = width - 48;
    const desktopH = height - 64 - desktopY;
    drawingContext.fillStyle = DESKTOP_BG;
    roundRect(drawingContext, desktopX, desktopY, desktopW, desktopH, 10);
    drawingContext.fill();
    drawingContext.fillStyle = DIM;
    drawingContext.font = '600 11px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      `模拟桌面(缩放 ${scale}x)`,
      desktopX + 14,
      desktopY + 20,
    );

    // 窗口按逻辑尺寸等比缩小,放进桌面可用区域。
    const availableW = desktopW - 56;
    const availableH = desktopH - 52;
    const drawScale = Math.min(
      0.5,
      availableW / args.width,
      availableH / args.height,
    );
    const winW = Math.max(120, Math.round(args.width * drawScale));
    const winH = Math.max(90, Math.round(args.height * drawScale));
    const winX = args.center
      ? desktopX + Math.round((desktopW - winW) / 2)
      : desktopX + 44;
    const winY = args.center
      ? desktopY + Math.round((desktopH - winH) / 2)
      : desktopY + 40;

    // 启动位置参考:非居中画出 x/y 偏移,居中画出桌面中心参考线。
    if (args.center) {
      drawingContext.strokeStyle = ACCENT_LIGHT;
      drawingContext.setLineDash([5, 4]);
      drawingContext.beginPath();
      drawingContext.moveTo(desktopX + 10, winY + winH / 2);
      drawingContext.lineTo(desktopX + desktopW - 10, winY + winH / 2);
      drawingContext.moveTo(winX + winW / 2, desktopY + 26);
      drawingContext.lineTo(winX + winW / 2, desktopY + desktopH - 10);
      drawingContext.stroke();
      drawingContext.setLineDash([]);
      drawingContext.fillStyle = ACCENT;
      drawingContext.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
      drawingContext.fillText('center: true', winX + winW / 2 + 8, winY - 6);
    } else {
      drawingContext.strokeStyle = ACCENT_LIGHT;
      drawingContext.setLineDash([5, 4]);
      drawingContext.beginPath();
      drawingContext.moveTo(desktopX + 10, winY);
      drawingContext.lineTo(winX, winY);
      drawingContext.moveTo(winX, desktopY + 26);
      drawingContext.lineTo(winX, winY);
      drawingContext.stroke();
      drawingContext.setLineDash([]);
      drawingContext.fillStyle = ACCENT;
      drawingContext.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
      drawingContext.fillText('x, y', desktopX + 14, winY - 6);
    }

    // 窗口主体:阴影 + 白底圆角。阴影有无也是配置项(shadow),演示里保持默认开启。
    drawingContext.save();
    drawingContext.shadowColor = 'rgba(23, 32, 51, 0.18)';
    drawingContext.shadowBlur = 14;
    drawingContext.shadowOffsetY = 4;
    drawingContext.fillStyle = WINDOW_BG;
    roundRect(drawingContext, winX, winY, winW, winH, 8);
    drawingContext.fill();
    drawingContext.restore();

    const titleH = Math.max(20, Math.round(26 * drawScale));

    if (args.decorations) {
      // 系统装饰:标题栏 + 红绿灯 + 标题文字(对应 decorations: true 的默认外观)。
      drawingContext.fillStyle = TITLE_BG;
      titleBarPath(drawingContext, winX, winY, winW, titleH, 8);
      drawingContext.fill();
      drawingContext.strokeStyle = PALE;
      drawingContext.beginPath();
      drawingContext.moveTo(winX, winY + titleH + 0.5);
      drawingContext.lineTo(winX + winW, winY + titleH + 0.5);
      drawingContext.stroke();
      ['#ff5f57', '#febc2e', '#28c840'].forEach((color, index) => {
        drawingContext.fillStyle = color;
        drawingContext.beginPath();
        drawingContext.arc(
          winX + 15 + index * 13,
          winY + titleH / 2,
          3.5,
          0,
          Math.PI * 2,
        );
        drawingContext.fill();
      });
      drawingContext.fillStyle = args.title.trim() ? TEXT : DIM;
      drawingContext.font = '600 11px ui-sans-serif, system-ui, sans-serif';
      drawingContext.textAlign = 'center';
      drawingContext.fillText(
        fitTitle(drawingContext, args.title.trim() || '(无标题)', winW - 108),
        winX + winW / 2,
        winY + titleH / 2 + 4,
      );
      drawingContext.textAlign = 'left';
    } else {
      // 无边框:装饰全部消失,窗口顶部只剩自建拖拽区(decorations: false 的关键代价)。
      drawingContext.setLineDash([4, 3]);
      drawingContext.strokeStyle = ACCENT_LIGHT;
      drawingContext.strokeRect(winX + 10, winY + 10, winW - 20, titleH - 6);
      drawingContext.setLineDash([]);
      if (winW - 20 > 150) {
        drawingContext.fillStyle = ACCENT;
        drawingContext.font =
          '10px ui-monospace, SFMono-Regular, Menlo, monospace';
        drawingContext.fillText(
          'data-tauri-drag-region',
          winX + 18,
          winY + 10 + titleH / 2 + 3,
        );
      }
    }

    // 内容占位:给窗口一点真实感,不承载结论。
    const contentY = winY + (args.decorations ? titleH : 0);
    const contentH = winH - (contentY - winY);
    if (contentH > 42) {
      drawingContext.fillStyle = CONTENT_BAR;
      [0.62, 0.4, 0.5].forEach((ratio, index) => {
        drawingContext.fillRect(
          winX + 16,
          contentY + 18 + index * 15,
          (winW - 32) * ratio,
          6,
        );
      });
    }

    // 可缩放手柄:resizable: true 时右下角出现斜纹,resizable: false 时换提示文字。
    if (args.resizable) {
      drawingContext.strokeStyle = PALE;
      drawingContext.lineWidth = 1.5;
      [0, 5, 10].forEach((offset) => {
        drawingContext.beginPath();
        drawingContext.moveTo(winX + winW - 4 - offset, winY + winH - 1);
        drawingContext.lineTo(winX + winW - 1, winY + winH - 4 - offset);
        drawingContext.stroke();
      });
      drawingContext.lineWidth = 1;
    } else {
      drawingContext.fillStyle = DIM;
      drawingContext.font = '10px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText('不可缩放', winX + winW - 54, winY + winH - 6);
    }

    // 窗口外框。
    drawingContext.strokeStyle = args.decorations ? PALE : ACCENT_LIGHT;
    roundRect(drawingContext, winX, winY, winW, winH, 8);
    drawingContext.stroke();

    // 底部读数:配置写逻辑像素,屏幕像素是物理像素,差一个 scaleFactor。
    drawingContext.textAlign = 'center';
    drawingContext.fillStyle = TEXT;
    drawingContext.font = '600 12px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText(
      `${args.width} × ${args.height} 逻辑像素  →  ×${scale}  →  ${args.width * scale} × ${args.height * scale} 物理像素`,
      width / 2,
      height - 42,
    );
    drawingContext.fillStyle = DIM;
    drawingContext.font = '11px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      '配置与 setSize 写逻辑像素;innerSize() 返回物理像素',
      width / 2,
      height - 24,
    );
    drawingContext.textAlign = 'left';

    emit({
      logical: `${args.width} × ${args.height}`,
      physical: `${args.width * scale} × ${args.height * scale}`,
      chrome: args.decorations ? '系统标题栏' : '无边框(自建拖拽区)',
      resizable: args.resizable ? '是' : '否',
      position: args.center ? '居中' : 'x/y 或系统默认',
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
