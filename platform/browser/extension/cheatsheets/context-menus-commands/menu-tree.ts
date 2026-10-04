/**
 * 范例介绍：演示 chrome.contextMenus.create 的参数怎样决定菜单项在右键菜单里的
 * 出现位置与显示形态。
 * 前置状态：示例扩展创建了一个菜单项，type、contexts、parentId、title 由参数给出；
 * 需要演示 %s 时页面里有一段已选中文字「速查手册」。
 * 主要操作：切换「右键位置」与「菜单项 contexts」、切换「菜单项类型」、
 * 开关「注册为父项的子菜单」、修改标题。
 * 预期结果：点击位置属于菜单项 contexts 时菜单项出现在右键菜单里，否则整块扩展
 * 菜单都不出现；separator 不渲染标题；checkbox / radio 渲染勾选态；注册为子菜单时
 * 收进父菜单「高亮工具」；selection 上下文中 %s 被替换成选中文字。
 * 阅读主线：左侧「在哪右键」经 contexts 过滤，右侧菜单给出「长什么样」。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type ClickContext = 'page' | 'selection' | 'link' | 'image';
export type MenuContext = 'all' | ClickContext;
export type MenuItemType = 'normal' | 'checkbox' | 'radio' | 'separator';

export interface MenuTreeOptions {
  clickContext: ClickContext;
  contexts: MenuContext;
  type: MenuItemType;
  hasParent: boolean;
  title: string;
}

export interface MenuTreeSnapshot {
  clickLabel: string;
  contextsLabel: string;
  visibleLabel: string;
  titleLabel: string;
  shapeLabel: string;
}

export interface MenuTreeInstance {
  update(options: MenuTreeOptions): void;
  dispose(): void;
}

const VW = 760; // 逻辑画布宽，绘制按实际宽度等比缩放
const VH = 428;

const SELECTED_TEXT = '速查手册';
const PARENT_TITLE = '高亮工具';

const CLICK_LABELS: Record<ClickContext, string> = {
  page: '页面空白',
  selection: '选中文字',
  link: '链接',
  image: '图片',
};

const TYPE_LABELS: Record<MenuItemType, string> = {
  normal: 'normal',
  checkbox: 'checkbox',
  radio: 'radio',
  separator: 'separator',
};

function contextMatches(clickContext: ClickContext, contexts: MenuContext): boolean {
  return contexts === 'all' || contexts === clickContext;
}

function buildSnapshot(options: MenuTreeOptions): MenuTreeSnapshot {
  const visible = contextMatches(options.clickContext, options.contexts);
  // %s 只在菜单出现在 selection 上下文时被替换为选中的文字
  const inSelection = visible && options.clickContext === 'selection';
  const renderedTitle =
    options.type === 'separator'
      ? '（separator 无标题）'
      : options.title.replace('%s', inSelection ? SELECTED_TEXT : '%s');
  return {
    clickLabel: CLICK_LABELS[options.clickContext],
    contextsLabel: options.contexts === 'all' ? '["all"]' : `["${options.contexts}"]`,
    visibleLabel: visible ? '出现' : '不出现',
    titleLabel: renderedTitle,
    shapeLabel: options.hasParent ? `父菜单「${PARENT_TITLE}」子项` : '顶层菜单项',
  };
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function drawPage(ctx: CanvasRenderingContext2D, options: MenuTreeOptions): void {
  const x = 20;
  const y = 64;
  const w = 360;
  const h = 348;

  ctx.fillStyle = '#e2e8f0';
  roundRect(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.strokeStyle = '#cbd5e1';
  ctx.stroke();

  ctx.fillStyle = '#f8fafc';
  roundRect(ctx, x + 1, y + 1, w - 2, 28, 7);
  ctx.fill();
  ctx.fillStyle = '#475569';
  ctx.font = '500 12px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillText('example.com/速查手册', x + 12, y + 19);

  // 文本区：整行文字，selection 命中时「速查手册」四字带选中底色
  const textX = x + 24;
  const textY = y + 96;
  ctx.font = '400 14px ui-sans-serif, system-ui, sans-serif';
  const lead = 'Context menus and ';
  const tail = ' in MV3';
  ctx.fillStyle = '#334155';
  ctx.fillText(lead, textX, textY);
  const leadWidth = ctx.measureText(lead).width;
  const active = options.clickContext === 'selection';
  const selectedWidth = ctx.measureText(SELECTED_TEXT).width;
  if (active) {
    ctx.fillStyle = '#bcd0ff';
    ctx.fillRect(textX + leadWidth - 2, textY - 13, selectedWidth + 4, 19);
  }
  ctx.fillStyle = active ? '#1e3a8a' : '#334155';
  ctx.fillText(SELECTED_TEXT, textX + leadWidth, textY);
  const tailX = textX + leadWidth + selectedWidth;
  ctx.fillStyle = '#334155';
  ctx.fillText(tail, tailX, textY);
  ctx.fillStyle = '#64748b';
  ctx.font = '400 11px ui-sans-serif, system-ui, sans-serif';
  ctx.fillText('left-click 选中「速查手册」后右键 = selection', textX, textY + 24);

  // 链接行
  const linkX = x + 24;
  const linkY = textY + 84;
  ctx.font = '400 14px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = '#1d4ed8';
  ctx.fillText('参考文档：developer.chrome.com', linkX, linkY);
  ctx.fillStyle = '#64748b';
  ctx.font = '400 11px ui-sans-serif, system-ui, sans-serif';
  ctx.fillText('链接（contexts: link）', linkX, linkY + 18);

  // 图片块
  const imgX = x + 24;
  const imgY = linkY + 68;
  ctx.fillStyle = '#dbeafe';
  roundRect(ctx, imgX, imgY, 96, 64, 6);
  ctx.fill();
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.arc(imgX + 22, imgY + 20, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3b82f6';
  ctx.beginPath();
  ctx.moveTo(imgX + 18, imgY + 60);
  ctx.lineTo(imgX + 44, imgY + 30);
  ctx.lineTo(imgX + 66, imgY + 60);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#64748b';
  ctx.font = '400 11px ui-sans-serif, system-ui, sans-serif';
  ctx.fillText('图片（contexts: image）', imgX, imgY + 80);
  ctx.fillText('页面空白 = 默认 contexts ["page"]', imgX + 130, imgY + 36);

  // 右键位置标记
  const marker =
    options.clickContext === 'selection'
      ? { x: textX + leadWidth + selectedWidth / 2, y: textY - 6 }
      : options.clickContext === 'link'
        ? { x: linkX + 46, y: linkY - 6 }
        : options.clickContext === 'image'
          ? { x: imgX + 48, y: imgY + 32 }
          : { x: x + w - 60, y: y + h - 40 };

  ctx.strokeStyle = '#4f7cff';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(marker.x - 9, marker.y);
  ctx.lineTo(marker.x + 9, marker.y);
  ctx.moveTo(marker.x, marker.y - 9);
  ctx.lineTo(marker.x, marker.y + 9);
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = '600 10px ui-sans-serif, system-ui, sans-serif';
  const tag = '右键';
  const tagW = ctx.measureText(tag).width + 10;
  roundRect(ctx, marker.x + 12, marker.y - 9, tagW, 16, 8);
  ctx.fill();
  ctx.fillStyle = '#4f7cff';
  ctx.fillText(tag, marker.x + 17, marker.y + 3);
  ctx.lineWidth = 1;
}

function drawMenuItem(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  options: MenuTreeOptions,
  renderedTitle: string,
  indent: number,
): void {
  if (options.type === 'separator') {
    ctx.strokeStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.moveTo(x + indent + 10, y + 10);
    ctx.lineTo(x + 250, y + 10);
    ctx.stroke();
    return;
  }

  // 菜单项左侧图标来自 manifest icons 的 16x16
  ctx.fillStyle = '#4f7cff';
  roundRect(ctx, x + indent + 10, y + 3, 13, 13, 3);
  ctx.fill();

  let label = renderedTitle;
  if (options.type === 'checkbox') {
    label = `☑ ${label}`;
  } else if (options.type === 'radio') {
    label = `◉ ${label}`;
  }

  ctx.fillStyle = '#0f172a';
  ctx.font = '400 13px ui-sans-serif, system-ui, sans-serif';
  ctx.fillText(label, x + indent + 30, y + 14);
}

function drawContextMenu(
  ctx: CanvasRenderingContext2D,
  options: MenuTreeOptions,
  snapshot: MenuTreeSnapshot,
): void {
  const visible = contextMatches(options.clickContext, options.contexts);
  const x = 420;
  const y = 64;
  const w = 320;
  const h = 348;

  ctx.fillStyle = '#ffffff';
  roundRect(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.strokeStyle = '#cbd5e1';
  ctx.stroke();

  ctx.fillStyle = '#64748b';
  ctx.font = '600 12px ui-sans-serif, system-ui, sans-serif';
  ctx.fillText('右键菜单', x + 16, y + 22);

  let row = y + 44;
  ctx.font = '400 13px ui-sans-serif, system-ui, sans-serif';
  for (const item of ['返回', '重新加载', '打印…']) {
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(item, x + 16, row + 14);
    row += 26;
  }

  ctx.strokeStyle = '#e2e8f0';
  ctx.beginPath();
  ctx.moveTo(x + 12, row + 8);
  ctx.lineTo(x + w - 12, row + 8);
  ctx.stroke();
  row += 24;

  if (!visible) {
    ctx.fillStyle = '#94a3b8';
    ctx.font = '400 12px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('（本扩展菜单项在此上下文不出现）', x + 16, row + 14);
    return;
  }

  if (options.hasParent) {
    ctx.fillStyle = '#0f172a';
    ctx.font = '400 13px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(`${PARENT_TITLE} ▸`, x + 16, row + 14);
    row += 28;
    drawMenuItem(ctx, x + 12, row, options, snapshot.titleLabel, 24);
  } else {
    drawMenuItem(ctx, x, row, options, snapshot.titleLabel, 0);
  }
}

export function createMenuTree(
  canvas: HTMLCanvasElement,
  emit: (snapshot: MenuTreeSnapshot) => void,
): MenuTreeInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: MenuTreeOptions = {
    clickContext: 'selection',
    contexts: 'selection',
    type: 'normal',
    hasParent: false,
    title: '高亮「%s」',
  };

  function draw() {
    const size = readCanvasSize(canvas);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const scale = size.width / VW;

    canvas.width = Math.round(size.width * pixelRatio);
    canvas.height = Math.round(size.height * pixelRatio);
    drawingContext.setTransform(pixelRatio * scale, 0, 0, pixelRatio * scale, 0, 0);
    drawingContext.clearRect(0, 0, VW, VH);

    drawingContext.fillStyle = '#f8fafc';
    drawingContext.fillRect(0, 0, VW, 24);

    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 15px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('右侧菜单由 create 注册的菜单项生成', 20, 36);

    drawPage(drawingContext, current);
    const snapshot = buildSnapshot(current);
    drawContextMenu(drawingContext, current, snapshot);

    drawingContext.fillStyle = '#475569';
    drawingContext.font = '400 12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      `contexts: ${snapshot.contextsLabel} · type: ${TYPE_LABELS[current.type]}`,
      420,
      36,
    );

    emit(snapshot);
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options) {
      current = { ...options };
      draw();
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
