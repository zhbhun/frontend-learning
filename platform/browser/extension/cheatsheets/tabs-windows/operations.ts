/**
 * 范例介绍：chrome.tabs 的操作家族怎样改变一个窗口内的标签页布局与状态。
 * 前置状态：模拟一个窗口里 5 个标签页（第 2 个为激活项，无固定标签页）。
 * 主要操作：选择操作（新建 / 聚焦 / 导航 / 固定 / 移到最前 / 移到末尾 / 复制 / 关闭）与目标标签页。
 * 预期结果：每次操作只改变目标与受影响的字段——固定会把标签页移到最左、复制项紧挨源
 * 右侧且成为激活项、关闭后后续标签页 index 前移；读数给出操作后的窗口清单。
 * 阅读主线：上排是操作前、下排是操作后的窗口条；新增项绿色填充，被操作项蓝色描边。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

interface OpTab {
  id: number;
  index: number;
  active: boolean;
  pinned: boolean;
  title: string;
  url: string;
}

export type TabAction =
  | 'create'
  | 'focus'
  | 'navigate'
  | 'pin'
  | 'move-front'
  | 'move-end'
  | 'duplicate'
  | 'remove';

export interface OperationsOptions {
  action: TabAction;
  target: string;
}

export interface OperationsSnapshot {
  action: string;
  tabCount: string;
  activeTab: string;
  effect: string;
}

export interface OperationsInstance {
  update(options: OperationsOptions): void;
  dispose(): void;
}

function initialTabs(): OpTab[] {
  return [
    { id: 201, index: 0, active: false, pinned: false, title: '扩展文档', url: 'https://developer.chrome.com/docs/extensions' },
    { id: 202, index: 1, active: true, pinned: false, title: 'GitHub', url: 'https://github.com/' },
    { id: 203, index: 2, active: false, pinned: false, title: 'TypeScript', url: 'https://www.typescriptlang.org/' },
    { id: 204, index: 3, active: false, pinned: false, title: 'MDN', url: 'https://developer.mozilla.org/' },
    { id: 205, index: 4, active: false, pinned: false, title: '示例页', url: 'https://example.com/' },
  ];
}

// 归一化 index：固定标签页排在普通标签页之前，各自保持相对顺序（Chrome 行为）
function normalize(tabs: OpTab[]): OpTab[] {
  return [...tabs]
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return a.index - b.index;
    })
    .map((tab, index) => ({ ...tab, index }));
}

function applyAction(tabs: OpTab[], options: OperationsOptions): { tabs: OpTab[]; effect: string } {
  const action = options.action;
  const targetId = Number(options.target);
  const next = tabs.map((tab) => ({ ...tab }));
  const target = next.find((tab) => tab.id === targetId);

  if (action === 'create') {
    const created: OpTab = {
      id: 206,
      index: next.length,
      active: true,
      pinned: false,
      title: '新标签页',
      url: 'chrome://newtab',
    };
    for (const tab of next) tab.active = false;
    return {
      tabs: normalize([...next, created]),
      effect: 'tabs.create({})：url 缺省即新标签页，追加到末尾并成为激活项',
    };
  }

  if (!target) {
    return { tabs: normalize(next), effect: '目标标签页不存在' };
  }

  switch (action) {
    case 'focus': {
      if (target.active) {
        return {
          tabs: normalize(next),
          effect: `tabs.update(${targetId}, { active: true })：T${targetId} 已是激活项，窗口不变`,
        };
      }
      for (const tab of next) tab.active = false;
      target.active = true;
      return {
        tabs: normalize(next),
        effect: `tabs.update(${targetId}, { active: true })：激活项从 T202 移到 T${targetId}`,
      };
    }
    case 'navigate': {
      target.url = 'https://developer.chrome.com/docs/extensions/reference/api/windows';
      target.title = 'windows API 参考';
      return {
        tabs: normalize(next),
        effect: `tabs.update(${targetId}, { url })：T${targetId} 导航到新页面，并触发 onUpdated 序列`,
      };
    }
    case 'pin': {
      target.pinned = true;
      return {
        tabs: normalize(next),
        effect: `tabs.update(${targetId}, { pinned: true })：固定后移到标签条最左`,
      };
    }
    case 'move-front': {
      target.index = -1;
      return {
        tabs: normalize(next),
        effect: `tabs.move(${targetId}, { index: 0 })：移到最前，其余 index 后移`,
      };
    }
    case 'move-end': {
      target.index = Number.MAX_SAFE_INTEGER;
      return {
        tabs: normalize(next),
        effect: `tabs.move(${targetId}, { index: -1 })：-1 表示移到末尾`,
      };
    }
    case 'duplicate': {
      const copy: OpTab = { ...target, id: target.id + 1000, active: true, index: target.index + 0.5 };
      for (const tab of next) tab.active = false;
      return {
        tabs: normalize([...next, copy]),
        effect: `tabs.duplicate(${targetId})：副本 T${copy.id} 紧挨源右侧，url 相同且成为激活项`,
      };
    }
    case 'remove': {
      // 关掉激活项时由相邻标签页接替激活（右侧优先，没有则左侧）
      let successor: OpTab | undefined;
      if (target.active) {
        const after = next
          .filter((tab) => tab.id !== target.id && tab.index > target.index)
          .sort((a, b) => a.index - b.index)[0];
        const before = next
          .filter((tab) => tab.id !== target.id && tab.index < target.index)
          .sort((a, b) => b.index - a.index)[0];
        successor = after ?? before;
      }
      const rest = next.filter((tab) => tab.id !== target.id);
      if (successor) successor.active = true;
      return {
        tabs: normalize(rest),
        effect: `tabs.remove(${targetId})：关闭后其余标签页 index 前移${
          successor ? `，激活项由 T${successor.id} 接替` : ''
        }`,
      };
    }
  }
}

const ACTION_LABEL: Record<TabAction, string> = {
  create: '新建（tabs.create）',
  focus: '聚焦（update active）',
  navigate: '导航（update url）',
  pin: '固定（update pinned）',
  'move-front': '移到最前（move index 0）',
  'move-end': '移到末尾（move index -1）',
  duplicate: '复制（duplicate）',
  remove: '关闭（remove）',
};

export function createOperationsExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: OperationsSnapshot) => void,
): OperationsInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: OperationsOptions = { action: 'duplicate', target: '202' };
  let before: OpTab[] = initialTabs();

  function text(
    content: string,
    x: number,
    y: number,
    options: { color?: string; font?: string; align?: CanvasTextAlign } = {},
  ) {
    drawingContext.fillStyle = options.color ?? '#172033';
    drawingContext.font =
      options.font ?? '13px ui-sans-serif, system-ui, sans-serif';
    drawingContext.textAlign = options.align ?? 'left';
    drawingContext.fillText(content, x, y);
    drawingContext.textAlign = 'left';
  }

  function drawStrip(
    tabs: OpTab[],
    y: number,
    width: number,
    dimmed: boolean,
    highlight: { added?: number[]; touched?: number[] },
  ) {
    const left = 40;
    const count = Math.max(tabs.length, 1);
    const cellWidth = Math.max(64, Math.min(132, (width - 80) / count));
    const height = 64;

    drawingContext.globalAlpha = dimmed ? 0.55 : 1;
    tabs.forEach((tab, i) => {
      const x = left + i * (cellWidth + 6);
      const isAdded = highlight.added?.includes(tab.id) ?? false;
      const isTouched = highlight.touched?.includes(tab.id) ?? false;

      drawingContext.fillStyle = isAdded ? '#dcfce7' : tab.active ? '#dbeafe' : '#e2e8f0';
      drawingContext.fillRect(x, y, cellWidth, height);
      drawingContext.strokeStyle = isAdded
        ? '#16a34a'
        : isTouched
          ? '#4f7cff'
          : tab.active
            ? '#2563eb'
            : '#cbd5e1';
      drawingContext.lineWidth = isTouched || isAdded || tab.active ? 2 : 1;
      drawingContext.strokeRect(x, y, cellWidth, height);
      drawingContext.lineWidth = 1;

      // 固定标签页画左侧窄条
      if (tab.pinned) {
        drawingContext.fillStyle = '#f59e0b';
        drawingContext.fillRect(x + 3, y + 3, 4, height - 6);
      }

      text(`idx${tab.index}`, x + 10, y + 16, {
        color: '#475569',
        font: '11px ui-monospace, SFMono-Regular, Menlo, monospace',
      });
      if (tab.active) {
        text('激活', x + cellWidth - 10, y + 16, {
          color: '#1d4ed8',
          font: '600 11px ui-sans-serif, system-ui, sans-serif',
          align: 'right',
        });
      }
      const title = tab.title.length > 6 ? `${tab.title.slice(0, 6)}…` : tab.title;
      text(`T${tab.id} ${title}`, x + 10, y + 38, {
        color: '#172033',
        font: '600 12px ui-sans-serif, system-ui, sans-serif',
      });
      const host = tab.url.replace('https://', '').replace('http://', '').split('/')[0];
      text(host || tab.url, x + 10, y + 54, {
        color: '#475569',
        font: '10px ui-monospace, SFMono-Regular, Menlo, monospace',
      });
    });
    drawingContext.globalAlpha = 1;
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(760, size.width);
    const height = 320;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const left = 40;
    const beforeIds = before.map((tab) => tab.id);
    const result = applyAction(before, current);
    const afterIds = result.tabs.map((tab) => tab.id);
    const added = afterIds.filter((id) => !beforeIds.includes(id));
    const touched = current.action === 'create' ? [] : afterIds.filter((id) => id === Number(current.target));

    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 18px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('chrome.tabs 操作对窗口状态的影响（模拟）', left, 28);

    text(`操作：${ACTION_LABEL[current.action]}`, left, 56, {
      font: '600 13px ui-monospace, SFMono-Regular, Menlo, monospace',
    });

    text('操作前', left, 92, {
      color: '#475569',
      font: '600 12px ui-sans-serif, system-ui, sans-serif',
    });
    drawStrip(before, 100, width, true, {});

    text('操作后', left, 186, {
      color: '#475569',
      font: '600 12px ui-sans-serif, system-ui, sans-serif',
    });
    drawStrip(result.tabs, 194, width, false, { added, touched });

    text(result.effect, left, 288, {
      color: '#1d4ed8',
      font: '12px ui-monospace, SFMono-Regular, Menlo, monospace',
    });
    text(
      '绿色 = 新建项；蓝色描边 = 被操作项；index 由 Chrome 重排后读取',
      left,
      height - 4,
      { color: '#94a3b8', font: '11px ui-sans-serif, system-ui, sans-serif' },
    );

    emit({
      action: ACTION_LABEL[current.action],
      tabCount: `${before.length} → ${result.tabs.length}`,
      activeTab: (() => {
        const active = result.tabs.find((tab) => tab.active);
        return active ? `T${active.id}（idx${active.index}）` : '无';
      })(),
      effect: result.effect,
    });
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options) {
      // 目标标签页不存在于当前初始状态时退回默认目标，保证任何组合都有可观察结果
      current = {
        action: options.action,
        target: before.some((tab) => String(tab.id) === options.target)
          ? options.target
          : '202',
      };
      draw();
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
