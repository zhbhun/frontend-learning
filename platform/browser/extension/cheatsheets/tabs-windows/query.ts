/**
 * 范例介绍：chrome.tabs.query 的多个过滤条件取交集，且 "tabs" 权限决定 Tab 上
 * url / title / favIconUrl 三个敏感字段在查询结果里是否可见。
 * 前置状态：模拟两个窗口共 7 个标签页（含固定、激活、加载中、已丢弃、两个分组）；
 * url 过滤只接受 match pattern，且片段标识符（# 之后）不参与匹配。
 * 主要操作：切换窗口 / active / lastFocusedWindow / url 过滤条件与 tabs 权限开关。
 * 预期结果：过滤条件同时生效取交集；未授权时敏感字段显示为未授权占位，且按 url
 * 的过滤被整体忽略（官方行为：没有 "tabs" 或主机权限时忽略 url / title 过滤）；
 * 打开权限后字段可见、url 过滤生效。
 * 阅读主线：上半部分是两个窗口的快照，下半部分是 query 命中的标签页与字段可见性。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

type TabStatus = 'loading' | 'complete' | 'unloaded';

interface FakeTab {
  id: number;
  windowId: number;
  index: number;
  active: boolean;
  pinned: boolean;
  status: TabStatus;
  groupId: number;
  audible: boolean;
  discarded: boolean;
  url: string;
  title: string;
  favIconUrl: string;
  host: string;
}

export interface QueryOptions {
  window: 'all' | '1' | '2';
  activeOnly: boolean;
  lastFocused: boolean;
  url: 'all' | 'developer.chrome.com' | 'github.com';
  tabsPermission: boolean;
}

export interface QuerySnapshot {
  matched: number;
  total: number;
  urlFilter: string;
  sensitiveFields: string;
}

export interface QueryInstance {
  update(options: QueryOptions): void;
  dispose(): void;
}

// 窗口 2 是最近聚焦的窗口；分组颜色与标题仅用于快照绘制
const LAST_FOCUSED_WINDOW = 2;

const GROUP_HEX: Record<number, string> = { 7: '#64748b', 8: '#2563eb' };

const TABS: FakeTab[] = [
  {
    id: 101,
    windowId: 1,
    index: 0,
    active: false,
    pinned: true,
    status: 'complete',
    groupId: -1,
    audible: false,
    discarded: false,
    url: 'https://developer.chrome.com/docs/extensions',
    title: 'Chrome Extensions 文档',
    favIconUrl: 'https://developer.chrome.com/favicon.ico',
    host: 'developer.chrome.com',
  },
  {
    id: 102,
    windowId: 1,
    index: 1,
    active: false,
    pinned: false,
    status: 'loading',
    groupId: 7,
    audible: false,
    discarded: false,
    url: 'https://developer.chrome.com/docs/extensions/reference/api/tabs',
    title: 'tabs API 参考',
    favIconUrl: 'https://developer.chrome.com/favicon.ico',
    host: 'developer.chrome.com',
  },
  {
    id: 103,
    windowId: 1,
    index: 2,
    active: true,
    pinned: false,
    status: 'complete',
    groupId: -1,
    audible: false,
    discarded: false,
    url: 'https://github.com/nicepage/awesome-extensions',
    title: 'awesome-extensions',
    favIconUrl: 'https://github.com/favicon.ico',
    host: 'github.com',
  },
  {
    id: 104,
    windowId: 2,
    index: 0,
    active: true,
    pinned: false,
    status: 'complete',
    groupId: 8,
    audible: false,
    discarded: false,
    url: 'https://developer.chrome.com/docs/extensions/reference/api/tabGroups',
    title: 'tabGroups API 参考',
    favIconUrl: 'https://developer.chrome.com/favicon.ico',
    host: 'developer.chrome.com',
  },
  {
    id: 105,
    windowId: 2,
    index: 1,
    active: false,
    pinned: false,
    status: 'complete',
    groupId: -1,
    audible: true,
    discarded: false,
    url: 'https://github.com/microsoft/TypeScript',
    title: 'microsoft/TypeScript',
    favIconUrl: 'https://github.com/favicon.ico',
    host: 'github.com',
  },
  {
    id: 106,
    windowId: 2,
    index: 2,
    active: false,
    pinned: false,
    status: 'unloaded',
    groupId: -1,
    audible: false,
    discarded: true,
    url: 'https://mail.example.com/inbox',
    title: '收件箱',
    favIconUrl: 'https://mail.example.com/favicon.ico',
    host: 'mail.example.com',
  },
  {
    id: 107,
    windowId: 2,
    index: 3,
    active: false,
    pinned: false,
    status: 'complete',
    groupId: -1,
    audible: false,
    discarded: false,
    url: 'https://example.com/docs/tutorial',
    title: '示例教程',
    favIconUrl: 'https://example.com/favicon.ico',
    host: 'example.com',
  },
];

const URL_PATTERN: Record<QueryOptions['url'], string | null> = {
  all: null,
  'developer.chrome.com': 'https://developer.chrome.com/*',
  'github.com': 'https://github.com/*',
};

const URL_LABEL: Record<QueryOptions['url'], string> = {
  all: '（未设置）',
  'developer.chrome.com': '"https://developer.chrome.com/*"',
  'github.com': '"https://github.com/*"',
};

// query 的过滤语义：所有指定条件同时成立；url / title 过滤在无权限时被忽略
function runQuery(
  options: Pick<QueryOptions, 'window' | 'activeOnly' | 'lastFocused' | 'url' | 'tabsPermission'>,
): { matched: FakeTab[]; urlIgnored: boolean } {
  const pattern = URL_PATTERN[options.url];
  const urlIgnored = pattern !== null && !options.tabsPermission;
  const matched = TABS.filter((tab) => {
    if (options.window !== 'all' && tab.windowId !== Number(options.window)) {
      return false;
    }
    if (options.activeOnly && !tab.active) return false;
    if (options.lastFocused && tab.windowId !== LAST_FOCUSED_WINDOW) return false;
    if (pattern !== null && !urlIgnored) {
      // 简化模拟：只按 host 前缀匹配 match pattern
      const host = pattern.replace('https://', '').replace('/*', '');
      if (!tab.host.endsWith(host.replace('*.', ''))) return false;
    }
    return true;
  });
  return { matched, urlIgnored };
}

export function createQueryExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: QuerySnapshot) => void,
): QueryInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: QueryOptions = {
    window: 'all',
    activeOnly: false,
    lastFocused: false,
    url: 'all',
    tabsPermission: true,
  };

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

  function markers(tab: FakeTab, withSensitive: boolean): string {
    const parts: string[] = [];
    if (tab.active) parts.push('激活');
    if (tab.pinned) parts.push('固定');
    if (tab.groupId !== -1) parts.push(`分组 ${tab.groupId}`);
    if (tab.audible) parts.push('播放中');
    if (tab.discarded) parts.push('已丢弃');
    if (tab.status === 'loading') parts.push('加载中');
    if (withSensitive && tab.host === 'developer.chrome.com') parts.push('host 敏感字段可见');
    return parts.length > 0 ? ` · ${parts.join(' · ')}` : '';
  }

  function drawWindowBox(x: number, y: number, width: number, height: number, windowId: number) {
    const tabs = TABS.filter((tab) => tab.windowId === windowId);
    drawingContext.fillStyle = '#f8fafc';
    drawingContext.fillRect(x, y, width, height);
    drawingContext.strokeStyle = '#cbd5e1';
    drawingContext.lineWidth = 1;
    drawingContext.strokeRect(x, y, width, height);
    text(`窗口 ${windowId} · ${tabs.length} 个标签页`, x + 12, y + 18, {
      color: '#475569',
      font: '600 13px ui-sans-serif, system-ui, sans-serif',
    });

    tabs.forEach((tab, row) => {
      const cellY = y + 30 + row * 26;
      const isActive = tab.active;
      drawingContext.fillStyle = isActive ? '#dbeafe' : '#e2e8f0';
      drawingContext.fillRect(x + 12, cellY, width - 24, 20);
      if (isActive) {
        drawingContext.strokeStyle = '#2563eb';
        drawingContext.strokeRect(x + 12, cellY, width - 24, 20);
      }
      if (tab.groupId !== -1) {
        drawingContext.fillStyle = GROUP_HEX[tab.groupId] ?? '#64748b';
        drawingContext.fillRect(x + 12, cellY, 4, 20);
      }
      const host = current.tabsPermission ? tab.host : '（未授权）';
      text(
        `idx${tab.index} T${tab.id} ${host}${markers(tab, current.tabsPermission)}`,
        x + 22,
        cellY + 14,
        {
          color: tab.discarded ? '#94a3b8' : '#172033',
          font: '12px ui-monospace, SFMono-Regular, Menlo, monospace',
        },
      );
    });
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(760, size.width);
    const height = 430;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const { matched, urlIgnored } = runQuery(current);
    const left = 40;
    const right = width - 40;

    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 18px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('chrome.tabs.query 过滤与权限可见性（模拟）', left, 28);

    // 权限徽章
    const badge = current.tabsPermission ? 'tabs 权限：已声明' : 'tabs 权限：未声明';
    drawingContext.fillStyle = current.tabsPermission ? '#dcfce7' : '#fee2e2';
    drawingContext.fillRect(right - 150, 12, 150, 24);
    drawingContext.strokeStyle = current.tabsPermission ? '#16a34a' : '#dc2626';
    drawingContext.strokeRect(right - 150, 12, 150, 24);
    text(badge, right - 75, 28, {
      color: current.tabsPermission ? '#166534' : '#991b1b',
      font: '600 13px ui-sans-serif, system-ui, sans-serif',
      align: 'center',
    });

    // 浏览器快照：两个窗口
    const boxWidth = (width - 120) / 2;
    drawWindowBox(left, 48, boxWidth, 116, 1);
    drawWindowBox(left + boxWidth + 40, 48, boxWidth, 116, 2);

    // query 调用回显
    const queryParts: string[] = [];
    if (current.window !== 'all') queryParts.push(`windowId: ${current.window}`);
    if (current.activeOnly) queryParts.push('active: true');
    if (current.lastFocused) queryParts.push('lastFocusedWindow: true');
    if (current.url !== 'all') queryParts.push(`url: ${URL_LABEL[current.url]}`);
    const queryEcho =
      queryParts.length > 0 ? `{ ${queryParts.join(', ')} }` : '{}（全部标签页）';
    text(`tabs.query(${queryEcho})`, left, 190, {
      font: '600 14px ui-monospace, SFMono-Regular, Menlo, monospace',
    });
    text(`命中 ${matched.length} / ${TABS.length} 个标签页`, left, 210, {
      color: '#475569',
    });

    // 左下：命中列表
    const listWidth = Math.round((width - 80) * 0.56);
    text('命中结果', left, 236, {
      color: '#475569',
      font: '600 13px ui-sans-serif, system-ui, sans-serif',
    });
    matched.forEach((tab, row) => {
      if (row >= 8) return;
      text(
        `T${tab.id} · 窗口${tab.windowId} · idx${tab.index}${markers(tab, false)}`,
        left,
        256 + row * 20,
        {
          font: '12px ui-monospace, SFMono-Regular, Menlo, monospace',
        },
      );
    });
    if (matched.length === 0) {
      text('（无命中）', left, 256, {
        color: '#94a3b8',
        font: '12px ui-monospace, SFMono-Regular, Menlo, monospace',
      });
    }

    // 右下：敏感字段可见性（取第一个命中项）
    const fieldX = left + listWidth + 24;
    text('第一个命中项的敏感字段', fieldX, 236, {
      color: '#475569',
      font: '600 13px ui-sans-serif, system-ui, sans-serif',
    });
    const first = matched[0];
    const fields: Array<[string, string]> = first
      ? [
          ['url', current.tabsPermission ? first.url : "''"],
          ['title', current.tabsPermission ? first.title : "''"],
          ['favIconUrl', current.tabsPermission ? first.favIconUrl : "''"],
        ]
      : [
          ['url', '—'],
          ['title', '—'],
          ['favIconUrl', '—'],
        ];
    fields.forEach(([key, value], row) => {
      text(`${key}`, fieldX, 256 + row * 20, {
        font: '12px ui-monospace, SFMono-Regular, Menlo, monospace',
      });
      const shown = current.tabsPermission ? value : "''（未授权）";
      text(shown, fieldX + 76, 256 + row * 20, {
        color: current.tabsPermission ? '#172033' : '#dc2626',
        font: '12px ui-monospace, SFMono-Regular, Menlo, monospace',
      });
    });

    // 底部边界说明
    const note = urlIgnored
      ? 'url 过滤未授权：官方行为是整个过滤条件被忽略（不是返回空），其余过滤仍生效'
      : current.url !== 'all'
        ? 'url 过滤生效：按 match pattern 匹配，片段标识符（# 之后）不参与匹配'
        : '敏感字段只有 url / pendingUrl / title / favIconUrl 四项，其余字段不需要权限';
    text(note, left, height - 18, {
      color: urlIgnored ? '#dc2626' : '#475569',
      font: '12px ui-sans-serif, system-ui, sans-serif',
    });

    emit({
      matched: matched.length,
      total: TABS.length,
      urlFilter:
        urlIgnored ? '被忽略（未授权）' : current.url === 'all' ? '未设置' : '生效',
      sensitiveFields: current.tabsPermission ? '可见' : '不可见（空字符串）',
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
