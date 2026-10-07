/**
 * 特权沙盘：模拟 privileges.standard / supportFetchAPI 开关对页面 Web 能力的影响。
 * 输入：注册协议时是否声明 standard、supportFetchAPI 两项特权。
 * 操作：切换两个特权开关。
 * 预期结果：standard 关闭时相对 URL 无法解析、Web 存储（localStorage / IndexedDB）
 * 被禁用；supportFetchAPI 关闭时页面内 fetch 不可用；两个开关互不影响对方行。
 * 阅读主线：页面卡片（app://bundle/index.html）→ 三行能力代码 → 生效/失效徽标与原因。
 * 真实 Electron 无法在浏览器里运行，本沙盘按官方文档规则呈现特权开与关的差异。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface ProtocolSimOptions {
  standard: boolean;
  supportFetchAPI: boolean;
}

export interface ProtocolSimSnapshot {
  pageUrlLabel: string;
  relativeLabel: string;
  fetchLabel: string;
  storageLabel: string;
}

export interface ProtocolSimInstance {
  update(options: ProtocolSimOptions): void;
  dispose(): void;
}

const PAGE_URL = 'app://bundle/index.html';

const OK_BG = 'rgba(21, 128, 61, 0.12)';
const OK_TEXT = '#15803d';
const FAIL_BG = 'rgba(185, 28, 28, 0.1)';
const FAIL_TEXT = '#b91c1c';

interface FeatureRow {
  code: string;
  enabled: boolean;
  verdictOk: string;
  verdictFail: string;
  noteOk: string;
  noteFail: string;
}

function buildRows(options: ProtocolSimOptions): FeatureRow[] {
  return [
    {
      code: '<img src="test.png">',
      enabled: options.standard,
      verdictOk: '生效',
      verdictFail: '失效',
      noteOk: `相对 URL 解析为 app://bundle/test.png`,
      noteFail: '相对 URL 无法识别 · 图片不加载',
    },
    {
      code: "fetch('app://bundle/data.json')",
      enabled: options.supportFetchAPI,
      verdictOk: '可用',
      verdictFail: '不可用',
      noteOk: 'supportFetchAPI 已开启',
      noteFail: '页面内 fetch 需要 supportFetchAPI',
    },
    {
      code: 'localStorage / IndexedDB',
      enabled: options.standard,
      verdictOk: '可用',
      verdictFail: '禁用',
      noteOk: 'standard 协议开放 Web 存储',
      noteFail: 'Web 存储在非 standard 协议上禁用',
    },
  ];
}

export function createProtocolSim(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ProtocolSimSnapshot) => void,
): ProtocolSimInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: ProtocolSimOptions = {
    standard: true,
    supportFetchAPI: true,
  };

  function roundRect(
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
  ) {
    drawingContext.beginPath();
    drawingContext.moveTo(x + radius, y);
    drawingContext.arcTo(x + width, y, x + width, y + height, radius);
    drawingContext.arcTo(x + width, y + height, x, y + height, radius);
    drawingContext.arcTo(x, y + height, x, y, radius);
    drawingContext.arcTo(x, y, x + width, y, radius);
    drawingContext.closePath();
  }

  function drawBadge(text: string, x: number, y: number, ok: boolean) {
    drawingContext.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    const badgeWidth = drawingContext.measureText(text).width + 20;
    const badgeX = x - badgeWidth;

    drawingContext.fillStyle = ok ? OK_BG : FAIL_BG;
    roundRect(badgeX, y, badgeWidth, 22, 11);
    drawingContext.fill();
    drawingContext.fillStyle = ok ? OK_TEXT : FAIL_TEXT;
    drawingContext.fillText(text, badgeX + 10, y + 15);
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(360, size.width);
    const height = Math.max(340, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 17px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('privileges 开关决定页面在这条协议上拿到哪些 Web 能力', 24, 36);
    drawingContext.fillStyle = '#64748b';
    drawingContext.font = '13px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      '真实 Electron 无法在浏览器运行：这里按官方文档规则模拟 standard 与 supportFetchAPI',
      24,
      60,
    );

    const cardX = 24;
    const cardY = 84;
    const cardWidth = width - cardX * 2;
    const cardHeight = height - cardY - 24;

    drawingContext.fillStyle = '#f1f5f9';
    drawingContext.strokeStyle = '#cbd5e1';
    roundRect(cardX, cardY, cardWidth, cardHeight, 10);
    drawingContext.fill();
    drawingContext.stroke();

    // 页面地址栏
    const barX = cardX + 16;
    const barY = cardY + 16;
    const barWidth = cardWidth - 32;
    const barHeight = 32;
    drawingContext.fillStyle = '#172033';
    roundRect(barX, barY, barWidth, barHeight, 8);
    drawingContext.fill();
    drawingContext.fillStyle = '#e2e8f0';
    drawingContext.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText(PAGE_URL, barX + 14, barY + 21);

    // 三行能力：<img> 相对资源、fetch、Web 存储
    const rows = buildRows(current);
    const rowTop = barY + barHeight + 18;
    const rowHeight = Math.min(56, (cardHeight - (rowTop - cardY) - 10) / rows.length);

    rows.forEach((row, index) => {
      const rowY = rowTop + index * rowHeight;
      const codeY = rowY + 16;
      const noteY = rowY + 36;

      drawingContext.fillStyle = '#334155';
      drawingContext.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
      drawingContext.fillText(row.code, barX + 6, codeY);

      drawingContext.fillStyle = '#64748b';
      drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText(row.enabled ? row.noteOk : row.noteFail, barX + 6, noteY);

      drawBadge(row.enabled ? row.verdictOk : row.verdictFail, cardX + cardWidth - 20, codeY - 14, row.enabled);
    });

    emit({
      pageUrlLabel: PAGE_URL,
      relativeLabel: rows[0].enabled
        ? '生效 · 解析为 app://bundle/test.png'
        : '失效 · 相对 URL 无法识别',
      fetchLabel: rows[1].enabled
        ? '可用'
        : '不可用 · 需要 supportFetchAPI',
      storageLabel: rows[2].enabled
        ? '可用（standard 协议）'
        : '禁用（非 standard 协议）',
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
