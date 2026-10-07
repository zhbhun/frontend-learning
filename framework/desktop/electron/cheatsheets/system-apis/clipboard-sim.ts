/**
 * 范例介绍：模拟 clipboard 的多格式模型——write 系列把整个剪贴板整体替换，
 * read 系列按格式取用，格式缺失时返回空字符串（真实 Electron 无法在浏览器
 * 运行，本模拟复现官方文档规则；真实环境的核对方式见正文快速上手）。
 *
 * 输入与前置状态：初始为空剪贴板；左侧按钮执行写入（writeText /
 * write({ text, html }) / write({ html }) / clear()），右侧按钮执行读取。
 * 主要操作：点击左、右两列按钮。
 * 预期结果：availableFormats() 列出当前存有的全部格式；write({ html }) 之后
 * readText() 返回 ''（text/plain 未写入）；write({ text, html }) 两种格式
 * 并存；每次写入整体替换上一次的全部格式；clear() 清空一切。
 * 阅读主线：先点 write({ html }) 再点 readText()，观察「写了 HTML 读不到
 * 纯文本」；再点 write({ text, html })，观察两种格式并存。
 */

export interface ClipboardSimSnapshot {
  formats: string;
  textResult: string;
  htmlResult: string;
  lastAction: string;
}

export interface ClipboardSimInstance {
  update(): void;
  dispose(): void;
}

// 与真实 API 对应的两种核心格式（图片与书签见正文「必要边界」）
const PLAIN = 'text/plain';
const HTML = 'text/html';

const SAMPLE_TEXT = '周报 v2';
const SAMPLE_HTML = '<b>周报 v2</b>';

const BUTTON_W = 176;
const BUTTON_H = 34;
const BUTTON_GAP = 10;
const BUTTONS_TOP = 52;
const TITLE_Y = 30;
const PANEL_H = 130;

type WriteId = 'writeText' | 'writeBoth' | 'writeHtml' | 'clear';
type ReadId = 'readText' | 'readHtml' | 'readFormats';

interface ButtonLayout {
  id: WriteId | ReadId;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

const WRITE_BUTTONS: Array<{ id: WriteId; label: string }> = [
  { id: 'writeText', label: `writeText('${SAMPLE_TEXT}')` },
  { id: 'writeBoth', label: 'write({ text, html })' },
  { id: 'writeHtml', label: 'write({ html })' },
  { id: 'clear', label: 'clear()' },
];

const READ_BUTTONS: Array<{ id: ReadId; label: string }> = [
  { id: 'readText', label: 'readText()' },
  { id: 'readHtml', label: 'readHTML()' },
  { id: 'readFormats', label: 'availableFormats()' },
];

function pointInRect(
  px: number,
  py: number,
  x: number,
  y: number,
  width: number,
  height: number,
): boolean {
  return px >= x && px <= x + width && py >= y && py <= y + height;
}

// 超出宽度的文本截断加省略号
function truncate(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string {
  if (ctx.measureText(text).width <= maxWidth) {
    return text;
  }
  let result = text;
  while (result.length > 1 && ctx.measureText(`${result}…`).width > maxWidth) {
    result = result.slice(0, -1);
  }
  return `${result}…`;
}

export function createClipboardSim(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ClipboardSimSnapshot) => void,
): ClipboardSimInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  // 剪贴板存储：格式 → 内容（对应真实 API 的多格式并存）
  let store = new Map<string, string>();
  let textResult = '尚未读取';
  let htmlResult = '尚未读取';
  let lastAction = '点击左侧按钮写入';
  let buttons: ButtonLayout[] = [];
  let hoverId: string | null = null;

  function formatsText(): string {
    return store.size > 0
      ? [...store.keys()].sort().join(', ')
      : '（空）';
  }

  function snapshot(): ClipboardSimSnapshot {
    return { formats: formatsText(), textResult, htmlResult, lastAction };
  }

  function refresh(): void {
    emit(snapshot());
    draw();
  }

  // write 系列：先清空再写入——整体替换语义
  function runWrite(id: WriteId): void {
    store = new Map();
    if (id === 'writeText') {
      store.set(PLAIN, SAMPLE_TEXT);
      lastAction = `writeText('${SAMPLE_TEXT}')：整体替换，只剩 ${PLAIN}`;
    } else if (id === 'writeBoth') {
      store.set(PLAIN, SAMPLE_TEXT);
      store.set(HTML, SAMPLE_HTML);
      lastAction = 'write({ text, html })：整体替换后两种格式并存';
    } else if (id === 'writeHtml') {
      store.set(HTML, SAMPLE_HTML);
      lastAction = `write({ html })：整体替换，只剩 ${HTML}`;
    } else {
      lastAction = 'clear()：全部格式清空';
    }
  }

  // read 系列：按格式取用，不改变剪贴板
  function runRead(id: ReadId): void {
    if (id === 'readText') {
      const value = store.get(PLAIN);
      textResult =
        value === undefined ? `''（${PLAIN} 未写入）` : `'${value}'`;
      lastAction = 'readText()';
    } else if (id === 'readHtml') {
      const value = store.get(HTML);
      htmlResult = value === undefined ? `''（${HTML} 未写入）` : value;
      lastAction = 'readHTML()';
    } else {
      lastAction = 'availableFormats()';
    }
  }

  // 根据当前存储内容给出的判断结论（下方结论条）
  function verdict(): { text: string; warn: boolean } {
    if (store.size === 0) {
      return { text: '剪贴板为空：任何 read 都返回空字符串', warn: false };
    }
    const hasPlain = store.has(PLAIN);
    const hasHtml = store.has(HTML);
    if (hasPlain && hasHtml) {
      return {
        text: '两种格式并存：readText() 与 readHTML() 各取所需',
        warn: false,
      };
    }
    if (hasHtml) {
      return {
        text: `只写入了 ${HTML}：readText() 返回 ''——写了 HTML 读不到纯文本`,
        warn: true,
      };
    }
    return {
      text: `只写入了 ${PLAIN}：readHTML() 返回 ''——格式之间不自动转换`,
      warn: false,
    };
  }

  function layoutButtons(width: number): ButtonLayout[] {
    const rightX = width - 20 - BUTTON_W;
    const writes = WRITE_BUTTONS.map((button, index) => ({
      ...button,
      x: 20,
      y: BUTTONS_TOP + index * (BUTTON_H + BUTTON_GAP),
      w: BUTTON_W,
      h: BUTTON_H,
    }));
    const reads = READ_BUTTONS.map((button, index) => ({
      ...button,
      x: rightX,
      y: BUTTONS_TOP + index * (BUTTON_H + BUTTON_GAP),
      w: BUTTON_W,
      h: BUTTON_H,
    }));
    return [...writes, ...reads];
  }

  function drawStorePanel(x: number, y: number, w: number, h: number): void {
    ctx.save();
    ctx.shadowColor = 'rgba(15, 23, 42, 0.18)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.stroke();

    ctx.fillStyle = '#475569';
    ctx.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('系统剪贴板', x + 14, y + 18);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('多格式并存 · write 整体替换', x + 14, y + 34);

    if (store.size === 0) {
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.roundRect(x + 12, y + 46, w - 24, h - 58, 6);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('（空）', x + 24, y + 68);
      return;
    }

    let rowY = y + 46;
    [...store.keys()].sort().forEach((format) => {
      // 格式徽标
      ctx.fillStyle = '#eef2ff';
      ctx.beginPath();
      ctx.roundRect(x + 12, rowY, 84, 20, 5);
      ctx.fill();
      ctx.strokeStyle = '#a5b8f8';
      ctx.stroke();
      ctx.fillStyle = '#3f5bd6';
      ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillText(format, x + 18, rowY + 10);
      // 内容预览
      ctx.fillStyle = '#475569';
      const preview = truncate(ctx, `'${store.get(format)}'`, w - 122);
      ctx.fillText(preview, x + 106, rowY + 10);
      rowY += 34;
    });
  }

  function drawVerdictBar(x: number, y: number, w: number, h: number): void {
    const { text, warn } = verdict();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fill();
    ctx.strokeStyle = '#cbd5e1';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x + 18, y + h / 2, 4, 0, Math.PI * 2);
    ctx.fillStyle = warn ? '#b45309' : '#4f7cff';
    ctx.fill();

    ctx.fillStyle = warn ? '#b45309' : '#334155';
    ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(text, x + 32, y + h / 2);
  }

  function draw(): void {
    const size = {
      width: canvas.clientWidth || 640,
      height: canvas.clientHeight || 300,
    };
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(size.width * pixelRatio);
    canvas.height = Math.round(size.height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, size.width, size.height);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, size.width, size.height);

    const rightX = size.width - 20 - BUTTON_W;
    buttons = layoutButtons(size.width);

    // 区块标题
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText('写入操作（clipboard 是主进程模块）', 20, TITLE_Y);
    ctx.textAlign = 'right';
    ctx.fillText('读取操作', rightX + BUTTON_W, TITLE_Y);
    ctx.textAlign = 'left';

    // 按钮
    buttons.forEach((button) => {
      const hovered = hoverId === button.id;
      ctx.fillStyle = hovered ? '#eef2f8' : '#ffffff';
      ctx.beginPath();
      ctx.roundRect(button.x, button.y, button.w, button.h, 6);
      ctx.fill();
      ctx.strokeStyle = hovered ? '#4f7cff' : '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#172033';
      ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
      const label = truncate(ctx, button.label, button.w - 16);
      ctx.fillText(label, button.x + 8, button.y + button.h / 2);
    });

    // 中间：剪贴板存储可视化
    drawStorePanel(216, BUTTONS_TOP, size.width - 432, PANEL_H);
    // 下方：结论条
    drawVerdictBar(20, BUTTONS_TOP + PANEL_H + 12, size.width - 40, 44);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(
      '真实 API 语义：write 一次替换全部格式；read* 按格式取用，缺格式返回空字符串',
      20,
      BUTTONS_TOP + PANEL_H + 76,
    );
  }

  function canvasPoint(event: MouseEvent): { x: number; y: number } {
    const bounds = canvas.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  }

  function hitButton(px: number, py: number): ButtonLayout | null {
    return (
      buttons.find((button) =>
        pointInRect(px, py, button.x, button.y, button.w, button.h),
      ) ?? null
    );
  }

  function onClick(event: MouseEvent): void {
    const { x, y } = canvasPoint(event);
    const button = hitButton(x, y);
    if (!button) {
      return;
    }
    if (button.id === 'writeText') runWrite('writeText');
    else if (button.id === 'writeBoth') runWrite('writeBoth');
    else if (button.id === 'writeHtml') runWrite('writeHtml');
    else if (button.id === 'clear') runWrite('clear');
    else if (button.id === 'readText') runRead('readText');
    else if (button.id === 'readHtml') runRead('readHtml');
    else if (button.id === 'readFormats') runRead('readFormats');
    refresh();
  }

  function onMouseMove(event: MouseEvent): void {
    const { x, y } = canvasPoint(event);
    const button = hitButton(x, y);
    const nextHover = button?.id ?? null;
    if (nextHover !== hoverId) {
      hoverId = nextHover;
      draw();
    }
    canvas.style.cursor = button ? 'pointer' : 'default';
  }

  function onMouseLeave(): void {
    if (hoverId !== null) {
      hoverId = null;
      draw();
    }
    canvas.style.cursor = 'default';
  }

  canvas.addEventListener('click', onClick);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mouseleave', onMouseLeave);

  return {
    update() {
      // 参数无关的模拟：每次挂载回到初始空剪贴板
      store = new Map();
      textResult = '尚未读取';
      htmlResult = '尚未读取';
      lastAction = '点击左侧按钮写入';
      hoverId = null;
      refresh();
    },
    dispose() {
      canvas.removeEventListener('click', onClick);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseleave', onMouseLeave);
    },
  };
}
