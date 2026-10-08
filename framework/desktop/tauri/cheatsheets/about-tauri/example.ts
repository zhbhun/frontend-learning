/**
 * 范例介绍:画出 Electron 与 Tauri 的应用包组成差异。
 * 输入:框架(electron / tauri)与目标平台(macOS / Windows / Linux)。
 * 操作:切换「框架」与「目标平台」,观察安装包内组件块的增减与虚线框内容的变化。
 * 预期结果:Electron 始终打包 Chromium 与 Node.js,不使用系统 WebView;切换到 Tauri 后,
 *   安装包内只剩前端资源与 Rust 核心,虚线框显示该平台的系统 WebView,并以 IPC 桥接
 *   连到 Rust 核心,随平台切换 WKWebView / Edge WebView2 / WebKitGTK。
 * 阅读主线:先看实线框(随应用分发),再看虚线框(操作系统提供),左下角读数同步核对。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type Framework = 'electron' | 'tauri';
export type Platform = 'macOS' | 'Windows' | 'Linux';

export interface ExampleOptions {
  framework: Framework;
  platform: Platform;
}

export type ExampleArgs = ExampleOptions;

export interface ExampleSnapshot {
  framework: Framework;
  platform: Platform;
  engine: string;
  runtime: string;
  bundled: string;
}

export interface ExampleInstance {
  update(options: ExampleArgs): void;
  dispose(): void;
}

/** 各平台的系统 WebView,与官方 Process Model 文档的脚注一致。 */
const SYSTEM_WEBVIEW: Record<Platform, string> = {
  macOS: 'WKWebView',
  Windows: 'Edge WebView2',
  Linux: 'WebKitGTK',
};

interface BlockSpec {
  title: string;
  sub?: string;
}

/** 由当前输入派生的读数:正文「打包 vs 复用」结论的直接体现。 */
function describe(
  options: ExampleArgs,
): Pick<ExampleSnapshot, 'engine' | 'runtime' | 'bundled'> {
  if (options.framework === 'electron') {
    return {
      engine: 'Chromium(随应用打包)',
      runtime: 'Node.js(随应用打包)',
      bundled: 'Chromium + Node.js',
    };
  }

  return {
    engine: `${SYSTEM_WEBVIEW[options.platform]}(系统自带,不打包)`,
    runtime: 'Rust 核心(编译为原生二进制)',
    bundled: '无(复用系统 WebView)',
  };
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

  let current: ExampleArgs = { framework: 'tauri', platform: 'macOS' };

  function roundedRectPath(x: number, y: number, w: number, h: number, r: number) {
    const radius = Math.min(r, w / 2, h / 2);
    drawingContext.beginPath();
    drawingContext.moveTo(x + radius, y);
    drawingContext.arcTo(x + w, y, x + w, y + h, radius);
    drawingContext.arcTo(x + w, y + h, x, y + h, radius);
    drawingContext.arcTo(x, y + h, x, y, radius);
    drawingContext.arcTo(x, y, x + w, y, radius);
    drawingContext.closePath();
  }

  function drawBlock(
    block: BlockSpec,
    x: number,
    y: number,
    w: number,
    h: number,
    dashed = false,
  ) {
    drawingContext.save();
    if (dashed) {
      drawingContext.setLineDash([5, 4]);
    }
    drawingContext.fillStyle = dashed ? '#f1f5f9' : '#e3ecff';
    drawingContext.strokeStyle = dashed ? '#94a3b8' : '#4f7cff';
    roundedRectPath(x, y, w, h, 8);
    drawingContext.fill();
    drawingContext.stroke();
    drawingContext.restore();

    const centerX = x + w / 2;
    drawingContext.textAlign = 'center';
    drawingContext.fillStyle = '#23324d';
    drawingContext.font = '600 14px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      block.title,
      centerX,
      y + h / 2 + (block.sub ? -4 : 5),
    );
    if (block.sub) {
      drawingContext.fillStyle = '#5b6b83';
      drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText(block.sub, centerX, y + h / 2 + 14);
    }
    drawingContext.textAlign = 'left';
  }

  function drawArrow(x: number, fromY: number, toY: number) {
    drawingContext.strokeStyle = '#4f7cff';
    drawingContext.fillStyle = '#4f7cff';
    drawingContext.lineWidth = 2;
    drawingContext.beginPath();
    drawingContext.moveTo(x, fromY);
    drawingContext.lineTo(x, toY);
    drawingContext.stroke();

    // 双向箭头:命令与事件都要在两个进程之间往返
    const head = 6;
    drawingContext.beginPath();
    drawingContext.moveTo(x, fromY);
    drawingContext.lineTo(x - head / 2, fromY + head);
    drawingContext.lineTo(x + head / 2, fromY + head);
    drawingContext.closePath();
    drawingContext.fill();
    drawingContext.beginPath();
    drawingContext.moveTo(x, toY);
    drawingContext.lineTo(x - head / 2, toY - head);
    drawingContext.lineTo(x + head / 2, toY - head);
    drawingContext.closePath();
    drawingContext.fill();

    drawingContext.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('IPC 桥接', x + 8, (fromY + toY) / 2 + 4);
    drawingContext.lineWidth = 1;
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(240, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const isTauri = current.framework === 'tauri';
    const frameworkName = isTauri ? 'Tauri' : 'Electron';

    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 16px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(`${frameworkName} 应用的组成`, 48, 32);

    const left = 48;
    const innerW = width - left * 2;
    const pad = 20;
    const gap = 14;

    // 实线框:随应用分发的安装包。Electron 在这里多出浏览器与运行时两块。
    const packagedTop = 44;
    const packagedBottom = packagedTop + 132;
    drawingContext.strokeStyle = '#334155';
    roundedRectPath(left, packagedTop, innerW, packagedBottom - packagedTop, 10);
    drawingContext.stroke();
    drawingContext.fillStyle = '#64748b';
    drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('随应用分发的安装包', left + 16, packagedTop + 22);

    const packagedBlocks: BlockSpec[] = isTauri
      ? [
          { title: '应用前端', sub: '静态资源' },
          { title: 'Rust 核心', sub: '编译为原生二进制' },
        ]
      : [
          { title: '应用前端', sub: 'HTML / CSS / JS' },
          { title: 'Node.js 运行时', sub: '后端逻辑跑在这里' },
          { title: 'Chromium', sub: '完整浏览器引擎' },
        ];
    const blockY = packagedTop + 40;
    const blockH = packagedBottom - blockY - 16;
    const blockW =
      (innerW - pad * 2 - gap * (packagedBlocks.length - 1)) /
      packagedBlocks.length;
    packagedBlocks.forEach((block, index) => {
      drawBlock(block, left + pad + index * (blockW + gap), blockY, blockW, blockH);
    });

    // 虚线框:操作系统提供的组件。Tauri 在这里复用系统 WebView,Electron 没有。
    const osTop = packagedBottom + 16;
    const osBottom = height - 16;
    drawingContext.save();
    drawingContext.setLineDash([6, 5]);
    drawingContext.strokeStyle = '#94a3b8';
    roundedRectPath(left, osTop, innerW, osBottom - osTop, 10);
    drawingContext.stroke();
    drawingContext.restore();
    drawingContext.fillStyle = '#64748b';
    drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('操作系统提供的组件', left + 16, osTop + 20);

    const osInnerTop = osTop + 28;
    const osInnerBottom = osBottom - 10;
    const contentCenterY = (osInnerTop + osInnerBottom) / 2;

    if (isTauri) {
      const webviewH = Math.max(40, Math.min(58, osInnerBottom - osInnerTop));
      const compact = webviewH < 52;
      const webviewW = Math.min(360, innerW - pad * 2);
      const webviewX = (width - webviewW) / 2;
      const webviewY = contentCenterY - webviewH / 2;

      // IPC 桥接箭头:Rust 核心与 WebView 之间唯一的常规通道
      const coreCenterX = left + pad + blockW + gap + blockW / 2;
      drawArrow(coreCenterX, packagedBottom, webviewY);

      drawBlock(
        compact
          ? { title: `系统 WebView:${SYSTEM_WEBVIEW[current.platform]}` }
          : {
              title: '系统 WebView',
              sub: `${SYSTEM_WEBVIEW[current.platform]} · 系统自带,不打包`,
            },
        webviewX,
        webviewY,
        webviewW,
        webviewH,
        true,
      );
    } else {
      drawingContext.fillStyle = '#94a3b8';
      drawingContext.font = '13px ui-sans-serif, system-ui, sans-serif';
      drawingContext.textAlign = 'center';
      drawingContext.fillText(
        '不使用系统 WebView —— 浏览器引擎已随应用打包',
        width / 2,
        contentCenterY + 4,
      );
      drawingContext.textAlign = 'left';
    }

    emit({
      framework: current.framework,
      platform: current.platform,
      ...describe(current),
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
