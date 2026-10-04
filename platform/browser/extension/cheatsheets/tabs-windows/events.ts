/**
 * 范例介绍：浏览器里的操作会触发哪些标签页 / 窗口 / 分组事件，以及各事件的参数形状。
 * 前置状态：模拟两个窗口——窗口 1 有 T301（激活）与 T302（在分组 7「文档」中），
 * 窗口 2 只有 T304（激活）；事件监听器注册在 service worker 顶层。
 * 主要操作：选择动作（切换 / 关闭标签页 / 关闭窗口最后一个标签页 / 导航 / 拖到另一
 * 窗口 / 切换焦点窗口 / 缩放窗口）并设置重复次数；事件按触发顺序进入日志。
 * 预期结果：跨窗口拖拽是 onDetached + onAttached 而不是 onMoved；关闭窗口最后一个
 * 标签页时该标签页带 isWindowClosing: true，随后还有 windows.onRemoved；切换 Chrome
 * 窗口焦点时会先收到 WINDOW_ID_NONE（-1）再收到新窗口 id；一次导航会触发多条
 * onUpdated，等 status "complete" 才是页面加载完成。
 * 阅读主线：上半部分是当前浏览器状态，下半部分是按时间排列的事件日志。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type EventAction =
  | 'switch'
  | 'close-tab'
  | 'close-window-last-tab'
  | 'navigate'
  | 'drag'
  | 'focus-window'
  | 'resize';

export interface EventsOptions {
  action: EventAction;
  times: number;
}

export interface EventsSnapshot {
  listening: string;
  action: string;
  eventCount: number;
  latest: string;
}

export interface EventsInstance {
  update(options: EventsOptions): void;
  dispose(): void;
}

interface SimTab {
  id: number;
  windowId: number;
  index: number;
  active: boolean;
  groupId: number;
  title: string;
}

interface SimWindow {
  id: number;
  width: number;
  height: number;
}

const GROUP_HEX: Record<number, string> = { 7: '#64748b' };

const ACTION_LABEL: Record<EventAction, string> = {
  switch: '在窗口 1 内切换标签页',
  'close-tab': '关闭窗口 1 的 T302（非激活）',
  'close-window-last-tab': '关闭窗口 2 唯一的 T304',
  navigate: 'T301 导航到新页面',
  drag: '把 T302 拖到窗口 2',
  'focus-window': '把焦点切到窗口 2',
  resize: '缩放窗口 2',
};

interface SimState {
  windows: SimWindow[];
  tabs: SimTab[];
  groups: Array<{ id: number; windowId: number; title: string }>;
  log: string[];
}

function initialState(): SimState {
  return {
    windows: [
      { id: 1, width: 900, height: 700 },
      { id: 2, width: 1000, height: 760 },
    ],
    tabs: [
      { id: 301, windowId: 1, index: 0, active: true, groupId: -1, title: 'tabs API 参考' },
      { id: 302, windowId: 1, index: 1, active: false, groupId: 7, title: 'windows API 参考' },
      { id: 304, windowId: 2, index: 0, active: true, groupId: -1, title: 'tabGroups API 参考' },
    ],
    groups: [{ id: 7, windowId: 1, title: '文档' }],
    log: [],
  };
}

// 关闭标签页：重排 index，原本激活时由相邻标签页接替激活，分组变空则分组消失
function closeTabInState(state: SimState, tabId: number): void {
  const target = state.tabs.find((tab) => tab.id === tabId);
  if (!target) return;
  const wasActive = target.active;
  const siblings = state.tabs.filter(
    (tab) => tab.windowId === target.windowId && tab.id !== tabId,
  );
  state.tabs = state.tabs.filter((tab) => tab.id !== tabId);
  for (const tab of state.tabs) {
    if (tab.windowId === target.windowId && tab.index > target.index) tab.index -= 1;
  }
  state.groups = state.groups.filter(
    (group) => state.tabs.some((tab) => tab.groupId === group.id),
  );
  if (wasActive && siblings.length > 0) {
    // Chrome 规则：右侧标签页优先接替激活，没有则左侧
    const right = siblings
      .filter((tab) => tab.index >= target.index)
      .sort((a, b) => a.index - b.index)[0];
    const left = siblings
      .filter((tab) => tab.index < target.index)
      .sort((a, b) => b.index - a.index)[0];
    const nextActive = right ?? left;
    if (nextActive) {
      nextActive.active = true;
      state.log.push(
        `chrome.tabs.onActivated({ tabId: ${nextActive.id}, windowId: ${nextActive.windowId} })`,
      );
    }
  }
}

// 每个动作执行一次，把触发的事件按顺序追加到日志；状态随之更新
function perform(state: SimState, action: EventAction, navigateRound: number): void {
  const push = (text: string) => state.log.push(text);
  const note = (text: string) => push(`（${text}）`);

  switch (action) {
    case 'switch': {
      const next = state.tabs.find((tab) => tab.windowId === 1 && !tab.active);
      if (!next) {
        note('窗口 1 没有非激活标签页，无切换');
        return;
      }
      for (const tab of state.tabs) {
        tab.active = tab.windowId === 1 && tab.id === next.id;
      }
      push(`chrome.tabs.onActivated({ tabId: ${next.id}, windowId: 1 })`);
      return;
    }
    case 'close-tab': {
      if (!state.tabs.some((tab) => tab.id === 302)) {
        note('T302 已关闭，无事件');
        return;
      }
      push('chrome.tabs.onRemoved(302, { windowId: 1, isWindowClosing: false })');
      closeTabInState(state, 302);
      if (!state.groups.some((group) => group.id === 7) && state.tabs.every((tab) => tab.groupId !== 7)) {
        push('chrome.tabGroups.onRemoved(7)');
      }
      return;
    }
    case 'close-window-last-tab': {
      if (!state.windows.some((win) => win.id === 2)) {
        note('窗口 2 已关闭，无事件');
        return;
      }
      push('chrome.tabs.onRemoved(304, { windowId: 2, isWindowClosing: true })');
      push('chrome.windows.onRemoved(2)');
      state.tabs = state.tabs.filter((tab) => tab.windowId !== 2);
      state.windows = state.windows.filter((win) => win.id !== 2);
      return;
    }
    case 'navigate': {
      if (!state.tabs.some((tab) => tab.id === 301)) {
        note('T301 已关闭，无事件');
        return;
      }
      const title = navigateRound % 2 === 0 ? 'windows API 参考' : 'alarms API 参考';
      push('chrome.tabs.onUpdated(301, { status: "loading" }, …)');
      push(`chrome.tabs.onUpdated(301, { title: "${title}", favIconUrl: … }, …)`);
      push('chrome.tabs.onUpdated(301, { status: "complete" }, …)');
      const tab = state.tabs.find((item) => item.id === 301);
      if (tab) tab.title = title;
      return;
    }
    case 'drag': {
      if (!state.windows.some((win) => win.id === 2)) {
        note('窗口 2 已关闭，没有拖拽目标');
        return;
      }
      const target = state.tabs.find((tab) => tab.id === 302);
      if (!target) {
        note('T302 已不在窗口 1，无事件');
        return;
      }
      push('chrome.tabs.onDetached(302, { oldPosition: 1, oldWindowId: 1 })');
      push('chrome.tabs.onAttached(302, { newPosition: 1, newWindowId: 2 })');
      push('chrome.tabs.onUpdated(302, { groupId: -1 }, …)');
      target.windowId = 2;
      target.index = 1;
      target.groupId = -1;
      state.groups = state.groups.filter(
        (group) => state.tabs.some((tab) => tab.groupId === group.id),
      );
      if (!state.groups.some((group) => group.id === 7)) {
        push('chrome.tabGroups.onRemoved(7)');
      }
      return;
    }
    case 'focus-window': {
      if (!state.windows.some((win) => win.id === 2)) {
        note('窗口 2 已关闭，无事件');
        return;
      }
      push('chrome.windows.onFocusChanged(-1)  // WINDOW_ID_NONE');
      push('chrome.windows.onFocusChanged(2)');
      return;
    }
    case 'resize': {
      if (!state.windows.some((win) => win.id === 2)) {
        note('窗口 2 已关闭，无事件');
        return;
      }
      const win = state.windows.find((item) => item.id === 2);
      if (!win) return;
      win.width += 200;
      push(
        `chrome.windows.onBoundsChanged({ id: 2, width: ${win.width}, height: ${win.height} })`,
      );
      return;
    }
  }
}

export function createEventsExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: EventsSnapshot) => void,
): EventsInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: EventsOptions = { action: 'switch', times: 1 };
  let state: SimState = initialState();
  let executed = 0;
  let navigateRound = 0;

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

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(760, size.width);
    const height = 430;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const left = 40;
    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 18px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('浏览器操作触发的事件（模拟，service worker 中监听）', left, 28);

    // 窗口与标签页快照
    const boxWidth = (width - 140) / 2;
    state.windows.forEach((win, i) => {
      const x = left + i * (boxWidth + 40);
      const tabs = state.tabs.filter((tab) => tab.windowId === win.id);
      drawingContext.fillStyle = '#f8fafc';
      drawingContext.fillRect(x, 44, boxWidth, 112);
      drawingContext.strokeStyle = '#cbd5e1';
      drawingContext.strokeRect(x, 44, boxWidth, 112);
      text(`窗口 ${win.id} · ${win.width}×${win.height} · ${tabs.length} 个标签页`, x + 12, 62, {
        color: '#475569',
        font: '600 13px ui-sans-serif, system-ui, sans-serif',
      });
      tabs.forEach((tab, row) => {
        const cellY = 74 + row * 24;
        drawingContext.fillStyle = tab.active ? '#dbeafe' : '#e2e8f0';
        drawingContext.fillRect(x + 12, cellY, boxWidth - 24, 19);
        if (tab.active) {
          drawingContext.strokeStyle = '#2563eb';
          drawingContext.strokeRect(x + 12, cellY, boxWidth - 24, 19);
        }
        if (tab.groupId !== -1) {
          drawingContext.fillStyle = GROUP_HEX[tab.groupId] ?? '#64748b';
          drawingContext.fillRect(x + 12, cellY, 4, 19);
        }
        const groupMark = tab.groupId !== -1 ? ` · 分组 ${tab.groupId}` : '';
        text(`T${tab.id} ${tab.title}${groupMark}`, x + 22, cellY + 13, {
          font: '12px ui-monospace, SFMono-Regular, Menlo, monospace',
        });
      });
      const group = state.groups.find((item) => item.windowId === win.id);
      if (group) {
        text(`分组 ${group.id}「${group.title}」`, x + 12, 148, {
          color: '#64748b',
          font: '11px ui-sans-serif, system-ui, sans-serif',
        });
      }
    });

    // 事件日志
    text('事件日志（最近 7 条，按触发顺序）', left, 200, {
      color: '#475569',
      font: '600 13px ui-sans-serif, system-ui, sans-serif',
    });
    const entries = state.log
      .slice(-7)
      .map((line, index) => `${index - state.log.length}. ${line}`);
    entries.forEach((entry, row) => {
      const y = 226 + row * 22;
      drawingContext.fillStyle = '#eff6ff';
      drawingContext.fillRect(left, y - 14, width - 80, 18);
      text(entry, left + 8, y, {
        font: '11px ui-monospace, SFMono-Regular, Menlo, monospace',
      });
    });
    for (let row = entries.length; row < 7; row += 1) {
      drawingContext.strokeStyle = '#f1f5f9';
      drawingContext.strokeRect(left, 212 + row * 22, width - 80, 18);
    }

    // 底部提示
    const hint =
      current.action === 'close-window-last-tab'
        ? 'isWindowClosing: true 表示整个窗口在关闭；随后固定还有一条 windows.onRemoved'
        : current.action === 'drag'
          ? '跨窗口拖拽不会触发 tabs.onMoved，而是 onDetached + onAttached'
          : current.action === 'focus-window'
            ? 'Chrome 窗口之间切换焦点时，先收到 WINDOW_ID_NONE（-1）再收到新窗口 id'
            : current.action === 'navigate'
              ? '一次导航触发多条 onUpdated；等 changeInfo.status === "complete" 再发消息'
              : '每次事件都会唤醒 service worker；监听器须注册在脚本顶层';
    text(hint, left, height - 16, {
      color: '#475569',
      font: '12px ui-sans-serif, system-ui, sans-serif',
    });

    emit({
      listening: 'service worker 顶层注册',
      action: ACTION_LABEL[current.action],
      eventCount: state.log.length,
      latest: state.log.length > 0 ? state.log[state.log.length - 1] : '（暂无）',
    });
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options) {
      // 换动作 = 重置到初始状态并按次数重放；次数增大 = 追加执行
      if (options.action !== current.action) {
        state = initialState();
        executed = 0;
        navigateRound = 0;
      }
      current = { action: options.action, times: Math.max(1, Math.round(options.times)) };
      while (executed < current.times) {
        if (current.action === 'navigate') navigateRound += 1;
        perform(state, current.action, navigateRound);
        executed += 1;
      }
      draw();
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
