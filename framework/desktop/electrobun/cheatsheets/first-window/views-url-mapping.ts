/**
 * 演示内容：electrobun.config.ts 的 build.views / build.copy 如何把源文件装配成
 * views:// 地址；装配通道缺失时窗口分别得到什么结果。
 * 输入：视图名（build.views 的键）、文件类型、静态文件是否已写入 build.copy。
 * 操作：在 Controls 中修改视图名、切换文件类型、开关 build.copy。
 * 预期结果：装配链（源文件 → 装配方式 → 构建产物 → 窗口结果）随输入联动；
 * index.ts 始终走 build.views 转译且不受 copy 影响，index.html 缺 copy 时窗口空白，
 * index.css 缺 copy 时样式丢失但页面仍可加载。
 * 阅读主线：resolveMapping() 是唯一的判定逻辑，draw() 只负责把结果画出来。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type FileKind = 'index.html' | 'index.css' | 'index.ts';

export interface ViewsUrlMappingOptions {
  viewName: string;
  fileKind: FileKind;
  inCopy: boolean;
}

export interface ViewsUrlMappingSnapshot {
  viewName: string;
  srcPath: string;
  method: string;
  url: string;
  outcome: string;
}

export interface ViewsUrlMappingInstance {
  update(options: ViewsUrlMappingOptions): void;
  dispose(): void;
}

interface MappingResult {
  viewName: string;
  srcPath: string;
  methodLines: string[];
  outPath: string;
  url: string;
  outcomeLines: string[];
  broken: boolean;
}

const COLORS = {
  heading: '#172033',
  muted: '#475569',
  plainBorder: '#94a3b8',
  ok: '#4f7cff',
  bad: '#d64545',
  boxFill: '#ffffff',
  arrow: '#64748b',
};

// 视图名只保留小写字母、数字和连字符，避免把非法字符画进路径里
function normalizeViewName(raw: string): string {
  const cleaned = raw
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24);

  return cleaned || 'mainview';
}

function resolveMapping(options: ViewsUrlMappingOptions): MappingResult {
  const view = normalizeViewName(options.viewName);
  const base = { viewName: view, srcPath: `src/${view}/${options.fileKind}` };

  // TS 入口由 build.views 转译成 js 产物，build.copy 不参与
  if (options.fileKind === 'index.ts') {
    return {
      ...base,
      srcPath: `src/${view}/index.ts`,
      methodLines: ['build.views', 'Bun.build 转译'],
      outPath: `views/${view}/index.js`,
      url: `views://${view}/index.js`,
      outcomeLines: ['✓ 供 html 内', 'script 引用'],
      broken: false,
    };
  }

  // html / css 是静态文件，必须经 build.copy 复制进 views/ 才有 views:// 地址
  const assembled = options.inCopy;

  if (options.fileKind === 'index.css') {
    return {
      ...base,
      methodLines: assembled ? ['build.copy', '复制'] : ['未装配', 'copy 缺失'],
      outPath: assembled ? `views/${view}/index.css` : '—',
      url: assembled ? `views://${view}/index.css` : '—（无对应文件）',
      outcomeLines: assembled
        ? ['✓ 页面应用样式']
        : ['✗ 样式丢失', '页面仍可加载'],
      broken: !assembled,
    };
  }

  return {
    ...base,
    methodLines: assembled ? ['build.copy', '复制'] : ['未装配', 'copy 缺失'],
    outPath: assembled ? `views/${view}/index.html` : '—',
    url: assembled ? `views://${view}/index.html` : '—（无对应文件）',
    outcomeLines: assembled ? ['✓ 窗口加载页面'] : ['✗ 窗口空白'],
    broken: !assembled,
  };
}

// 路径与说明按 '/' 和空格断行，避免超出方框宽度
function wrapText(text: string, maxWidth: number, context: CanvasRenderingContext2D): string[] {
  if (context.measureText(text).width <= maxWidth) {
    return [text];
  }

  // 在斜杠和空格后切分，保留分隔符以便读出完整路径
  const tokens = text.split(/(?<=\/)|(?<= )/).filter((token) => token !== '');
  const lines: string[] = [];
  let line = '';

  for (const token of tokens) {
    const candidate = line + token;

    if (line && context.measureText(candidate.trimEnd()).width > maxWidth) {
      lines.push(line.trimEnd());
      line = token.trimStart();
    } else {
      line = candidate;
    }
  }

  if (line) {
    lines.push(line.trimEnd());
  }

  return lines;
}

export function createViewsUrlMapping(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ViewsUrlMappingSnapshot) => void,
): ViewsUrlMappingInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: ViewsUrlMappingOptions = {
    viewName: 'mainview',
    fileKind: 'index.html',
    inCopy: true,
  };

  function drawBox(
    x: number,
    y: number,
    width: number,
    height: number,
    title: string,
    lines: string[],
    tone: 'plain' | 'ok' | 'bad',
  ) {
    const borderColor =
      tone === 'bad' ? COLORS.bad : tone === 'ok' ? COLORS.ok : COLORS.plainBorder;

    drawingContext.fillStyle = COLORS.boxFill;
    drawingContext.strokeStyle = borderColor;
    drawingContext.lineWidth = 1.5;
    drawingContext.beginPath();
    drawingContext.roundRect(x, y, width, height, 8);
    drawingContext.fill();
    drawingContext.stroke();

    drawingContext.fillStyle = COLORS.muted;
    drawingContext.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(title, x + 12, y + 22);

    drawingContext.fillStyle = tone === 'bad' ? COLORS.bad : COLORS.heading;
    drawingContext.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    const pathLines = wrapText(lines[0] ?? '', width - 24, drawingContext);
    pathLines.forEach((line, index) => {
      drawingContext.fillText(line, x + 12, y + 46 + index * 16);
    });

    drawingContext.fillStyle =
      tone === 'bad' ? COLORS.bad : tone === 'ok' ? COLORS.ok : COLORS.muted;
    drawingContext.font = '13px ui-sans-serif, system-ui, sans-serif';
    lines.slice(1).forEach((line, index) => {
      drawingContext.fillText(
        line,
        x + 12,
        y + 46 + pathLines.length * 16 + 4 + index * 17,
      );
    });
  }

  function drawArrow(
    fromX: number,
    toX: number,
    y: number,
    label: string,
    broken: boolean,
  ) {
    drawingContext.strokeStyle = broken ? COLORS.bad : COLORS.arrow;
    drawingContext.fillStyle = broken ? COLORS.bad : COLORS.arrow;
    drawingContext.lineWidth = 1.5;
    drawingContext.setLineDash(broken ? [4, 3] : []);
    drawingContext.beginPath();
    drawingContext.moveTo(fromX, y);
    drawingContext.lineTo(toX - 8, y);
    drawingContext.stroke();
    drawingContext.setLineDash([]);
    drawingContext.beginPath();
    drawingContext.moveTo(toX, y);
    drawingContext.lineTo(toX - 9, y - 4.5);
    drawingContext.lineTo(toX - 9, y + 4.5);
    drawingContext.closePath();
    drawingContext.fill();

    drawingContext.fillStyle = broken ? COLORS.bad : COLORS.muted;
    drawingContext.font = '11px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(label, fromX + 4, y - 8);
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(260, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const mapping = resolveMapping(current);

    drawingContext.fillStyle = COLORS.heading;
    drawingContext.font = '600 16px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      `views:// 装配链：${mapping.viewName}/${current.fileKind}`,
      24,
      38,
    );

    // 四个纵向阶段：源文件 → 装配方式 → 构建产物 → 窗口结果
    const margin = 24;
    const top = 74;
    const gap = Math.max(46, Math.min(64, width * 0.06));
    const boxWidth = (width - margin * 2 - gap * 3) / 4;
    const boxHeight = 104;
    const arrowY = top + boxHeight / 2;

    const stages: Array<{
      title: string;
      lines: string[];
      tone: 'plain' | 'ok' | 'bad';
    }> = [
      {
        title: '源文件',
        lines: [mapping.srcPath],
        tone: 'plain',
      },
      {
        title: '装配方式',
        lines: [mapping.methodLines.join(' ')],
        tone: mapping.broken ? 'bad' : 'plain',
      },
      {
        title: '构建产物',
        lines: [mapping.outPath],
        tone: mapping.broken ? 'bad' : 'ok',
      },
      {
        title: '窗口结果',
        lines: mapping.outcomeLines,
        tone: mapping.broken ? 'bad' : 'ok',
      },
    ];

    stages.forEach((stage, index) => {
      const x = margin + index * (boxWidth + gap);
      drawBox(x, top, boxWidth, boxHeight, stage.title, stage.lines, stage.tone);

      if (index < stages.length - 1) {
        // 通道名已经在“装配方式”方框里；箭头只标注最后一段的地址来源
        const label =
          index === stages.length - 2 ? 'views://' : mapping.broken ? '×' : '';
        drawArrow(
          x + boxWidth + 4,
          x + boxWidth + gap - 4,
          arrowY,
          label,
          mapping.broken,
        );
      }
    });

    // 底部把结果接回真实 API：窗口加载 html 用 url，页面引用脚本产物用 script src
    const isTs = current.fileKind === 'index.ts';
    const urlLine = `${isTs ? 'script src:' : 'url:'} "${mapping.url}"`;
    drawingContext.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    const hint = mapping.broken
      ? '  // 产物中无此文件，加载不到内容'
      : '';
    drawingContext.fillStyle = mapping.broken ? COLORS.bad : COLORS.ok;
    drawingContext.fillText(urlLine, margin, top + boxHeight + 40);
    if (hint) {
      drawingContext.fillStyle = COLORS.muted;
      drawingContext.fillText(
        hint,
        margin + drawingContext.measureText(urlLine).width,
        top + boxHeight + 40,
      );
    }

    emit({
      viewName: mapping.viewName,
      srcPath: mapping.srcPath,
      method: mapping.methodLines.join(' '),
      url: mapping.url,
      outcome: mapping.outcomeLines.join('，'),
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
