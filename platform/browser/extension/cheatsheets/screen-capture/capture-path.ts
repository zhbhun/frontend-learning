/**
 * 范例介绍：演示「屏幕捕获选哪条链路」的决策模型。
 * 输入（读者控件）：来源由谁定、调用上下文、是否需要跨导航持续录制。
 * 主要操作：切换控件，链路图与下方读数同步变化。
 * 预期结果：源由用户每次选 → getDisplayMedia()，每次弹选择器；源由扩展指定 → tabCapture，
 *          不弹选择器但需要 "tabCapture" 权限；上下文为 service worker 时链路插入 offscreen
 *          文档（getDisplayMedia 用 DISPLAY_MEDIA，tabCapture 的 ID 消费用 USER_MEDIA）。
 * 阅读主线：先看链路图的盒子与箭头，再对照下方读数的三条结论（选择器、权限、offscreen）。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type SourceMode = 'user-selected' | 'extension-tab';
export type RunContext = 'extension-page' | 'service-worker';

export interface CapturePathOptions {
  source: SourceMode;
  context: RunContext;
  acrossNavigation: boolean;
}

export interface CapturePathSnapshot {
  chain: string;
  picker: string;
  permission: string;
  offscreen: string;
}

export interface CapturePathInstance {
  update(options: CapturePathOptions): void;
  dispose(): void;
}

interface Decision {
  caller: string;
  offscreen: string; // '' 表示不需要 offscreen 文档
  entry: string;
  picker: string;
  permission: string;
}

function decide(options: CapturePathOptions): Decision {
  if (options.source === 'user-selected') {
    // 选择式：getDisplayMedia，每次调用都弹选择器
    const needOffscreen =
      options.context === 'service-worker' || options.acrossNavigation;
    return {
      caller:
        options.context === 'service-worker' ? 'service worker' : '扩展页面',
      offscreen: needOffscreen
        ? "offscreen 文档\nreasons: ['DISPLAY_MEDIA']"
        : '',
      entry: 'getDisplayMedia()',
      picker: '每次调用都弹选择器，用户挑屏幕 / 窗口 / 标签页',
      permission: needOffscreen
        ? '无扩展权限；建 offscreen 文档需 "offscreen"'
        : '无扩展权限',
    };
  }

  // 主题式：tabCapture，扩展指定标签页
  const needOffscreen = options.context === 'service-worker';
  return {
    caller: options.context === 'service-worker' ? 'service worker' : '扩展页面',
    offscreen: needOffscreen
      ? "offscreen 文档\nreasons: ['USER_MEDIA']"
      : '',
    entry: 'tabCapture',
    picker: '不弹选择器，由扩展指定当前（或授权）标签页',
    permission: '"tabCapture"；targetTabId 需 activeTab',
  };
}

export function createCapturePathExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: CapturePathSnapshot) => void,
): CapturePathInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: CapturePathOptions = {
    source: 'user-selected',
    context: 'extension-page',
    acrossNavigation: false,
  };

  function drawBox(
    x: number,
    y: number,
    width: number,
    height: number,
    title: string,
    subtitle: string,
    highlight: boolean,
  ) {
    drawingContext.beginPath();
    drawingContext.roundRect(x, y, width, height, 10);
    drawingContext.fillStyle = highlight ? '#eef2ff' : '#f8fafc';
    drawingContext.fill();
    drawingContext.lineWidth = 1.5;
    drawingContext.strokeStyle = highlight ? '#4f7cff' : '#cbd5e1';
    drawingContext.stroke();

    const lines = title.split('\n');
    const maxTextWidth = width - 12;
    const sizes = [15, 14, 13, 12, 11, 10];
    let titleSize = 15;
    for (const candidate of sizes) {
      drawingContext.font =
        '600 ' + candidate + 'px ui-sans-serif, system-ui, sans-serif';
      const widest = Math.max(
        ...lines.map((line) => drawingContext.measureText(line).width),
      );
      if (widest <= maxTextWidth) {
        titleSize = candidate;
        break;
      }
    }

    drawingContext.fillStyle = '#172033';
    drawingContext.font =
      '600 ' + titleSize + 'px ui-sans-serif, system-ui, sans-serif';
    drawingContext.textAlign = 'center';
    const lineHeight = titleSize + 5;
    const blockHeight = lines.length * lineHeight;
    lines.forEach((line, index) => {
      drawingContext.fillText(
        line,
        x + width / 2,
        y + height / 2 - blockHeight / 2 + titleSize + index * lineHeight,
      );
    });

    if (subtitle) {
      drawingContext.fillStyle = '#475569';
      drawingContext.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
      drawingContext.fillText(subtitle, x + width / 2, y + height - 12);
    }
  }

  function drawArrow(x: number, y: number, length: number) {
    drawingContext.beginPath();
    drawingContext.strokeStyle = '#94a3b8';
    drawingContext.lineWidth = 1.5;
    drawingContext.moveTo(x, y);
    drawingContext.lineTo(x + length, y);
    drawingContext.stroke();
    drawingContext.beginPath();
    drawingContext.fillStyle = '#94a3b8';
    drawingContext.moveTo(x + length, y);
    drawingContext.lineTo(x + length - 7, y - 4.5);
    drawingContext.lineTo(x + length - 7, y + 4.5);
    drawingContext.closePath();
    drawingContext.fill();
  }

  function draw() {
    const decision = decide(current);
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(240, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 18px ui-sans-serif, system-ui, sans-serif';
    drawingContext.textAlign = 'left';
    drawingContext.fillText('推荐链路随两条轴变化', 24, 40);

    // 链路盒子：调用方 → [offscreen] → 捕获入口 → MediaStream → 下游
    const boxes = [
      { title: decision.caller, subtitle: '调用发起处' },
      ...(decision.offscreen
        ? [
            {
              title: decision.offscreen.split('\n')[0],
              subtitle: decision.offscreen.split('\n')[1],
            },
          ]
        : []),
      {
        title: decision.entry.split('\n')[0],
        subtitle: decision.entry.split('\n')[1] ?? '',
      },
      { title: 'MediaStream', subtitle: '捕获产物' },
      { title: '下游处理', subtitle: '录制 / 抽帧 / 转发' },
    ];

    const boxHeight = 84;
    const gap = 34;
    const top = 76;
    const boxWidth =
      (width - 48 - gap * (boxes.length - 1)) / boxes.length;

    boxes.forEach((box, index) => {
      const x = 24 + index * (boxWidth + gap);
      const highlight = index > 0 && index < boxes.length - 1;
      drawBox(x, top, boxWidth, boxHeight, box.title, box.subtitle, highlight);
      if (index < boxes.length - 1) {
        drawArrow(x + boxWidth + 6, top + boxHeight / 2, gap - 12);
      }
    });

    drawingContext.fillStyle = '#475569';
    drawingContext.font = '13px ui-sans-serif, system-ui, sans-serif';
    drawingContext.textAlign = 'left';
    drawingContext.fillText(
      '灰色为上下文载体，蓝色为捕获链路本身；offscreen 文档按需插入。',
      24,
      top + boxHeight + 36,
    );

    emit({
      chain: boxes.map((box) => box.title).join(' → '),
      picker: decision.picker,
      permission: decision.permission,
      offscreen: decision.offscreen
        ? decision.offscreen.replace('\n', ' ')
        : '不需要',
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
