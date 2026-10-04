/**
 * 范例介绍：模拟点击通知后 onClicked / onButtonClicked / onClosed 的事件派发，
 * 以及两种典型响应——聚焦已有标签页、新建标签页。
 * 前置状态：通知 id 为 "docs-backlog"，带两个按钮；标签页条中「扩展开发文档」
 * 页是否打开由「目标标签页」参数决定；service worker 初始为休眠。
 * 主要操作：点击通知正文、按钮一、按钮二或 × 关闭；「响应方式」参数决定
 * onClicked / 按钮二的处理函数做什么。
 * 预期结果：onClicked 只带 notificationId；onButtonClicked 带 buttonIndex；
 * onClosed 的 byUser 区分用户关闭与系统关闭；聚焦策略把已有的目标标签页设为
 * 激活并前置窗口，目标不在时退回新建；新建策略直接 tabs.create 并激活。
 * 阅读主线：每次点击先把休眠的 service worker 唤醒，再执行顶层注册的监听器；
 * 日志同时记录事件参数与实际调用的 tabs / windows API。
 */

export type ResponseMode = 'focus' | 'newTab';

export interface ClickOptions {
  response: ResponseMode;
  targetOpen: boolean;
}

export interface ClickInstance {
  element: HTMLElement;
  update(options: ClickOptions): void;
  snapshot(): Array<[string, string]>;
  dispose(): void;
}

interface SimTab {
  id: number;
  windowId: number;
  title: string;
  url: string;
}

// 共享样式（assets/story-canvas.css）只提供 .cs-stage 外壳，本课范例的
// .nc-* 样式随范例文件注入，不修改共享基础设施
const STYLE_ID = 'notification-click-style';

const STYLE = `
.cs-stage.nc-stage {
  aspect-ratio: auto;
  min-height: 470px;
  padding: 38px 14px 104px;
  background: #f8fafc;
}
.nc-notice {
  width: 320px;
  max-width: 100%;
  border: 1px solid #dbe3f0;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 12px 28px rgb(15 23 42 / 14%);
  color: #172033;
  cursor: pointer;
}
.nc-notice[hidden] { display: none; }
.nc-notice-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px 0;
  color: #64748b;
  font-size: 11px;
}
.nc-notice-close {
  border: none;
  background: none;
  color: #64748b;
  font-size: 12px;
  cursor: pointer;
}
.nc-notice-title {
  padding: 2px 10px 0;
  font-size: 13px;
  font-weight: 700;
}
.nc-notice-message {
  padding: 2px 10px 6px;
  font-size: 12px;
}
.nc-notice-buttons {
  display: flex;
  gap: 6px;
  padding: 0 10px 10px;
}
.nc-notice-button {
  flex: 1;
  padding: 5px 6px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #ffffff;
  color: #172033;
  font-size: 11px;
  cursor: pointer;
}
.nc-notice-button:hover { border-color: #4f7cff; color: #3b5bdb; }
.nc-notice-hint {
  padding: 0 10px 8px;
  color: #94a3b8;
  font-size: 10px;
}
.nc-sw {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding: 7px 12px;
  border: 1px solid #dbe3f0;
  border-radius: 8px;
  background: #ffffff;
  color: #475569;
  font-size: 12px;
}
.nc-sw-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #94a3b8;
}
.nc-sw--asleep .nc-sw-dot { background: #94a3b8; }
.nc-sw--woken .nc-sw-dot { background: #f59e0b; }
.nc-sw--running .nc-sw-dot { background: #22c55e; }
.nc-sw--running { color: #166534; }
.nc-tabs {
  display: flex;
  gap: 6px;
  margin-top: 10px;
}
.nc-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  max-width: 190px;
  padding: 6px 10px;
  border: 1px solid #dbe3f0;
  border-radius: 8px 8px 0 0;
  background: #e2e8f0;
  color: #475569;
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
}
.nc-tab--active {
  border-color: #4f7cff;
  background: #ffffff;
  color: #172033;
  font-weight: 700;
}
.nc-tab-id {
  border-radius: 3px;
  background: rgb(148 163 184 / 30%);
  padding: 0 4px;
  font: 10px ui-monospace, SFMono-Regular, Menlo, monospace;
}
.nc-log {
  height: 128px;
  margin-top: 10px;
  padding: 8px 10px;
  border: 1px solid #dbe3f0;
  border-radius: 8px;
  background: #0f172a;
  color: #e2e8f0;
  font: 11px/1.7 ui-monospace, SFMono-Regular, Menlo, monospace;
  overflow-y: auto;
}
.nc-log-line--event { color: #fcd34d; }
.nc-log-line--call { color: #93c5fd; }
.nc-log-line--note { color: #cbd5e1; }
`;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) {
    node.className = className;
  }
  if (text !== undefined) {
    node.textContent = text;
  }
  return node;
}

function ensureStyles(): void {
  if (document.getElementById(STYLE_ID)) {
    return;
  }
  const style = el('style', undefined, STYLE);
  style.id = STYLE_ID;
  document.head.append(style);
}

const NOTICE_ID = 'docs-backlog';

const DOC_URL = 'https://developer.chrome.com/docs/extensions';

const TABS: SimTab[] = [
  { id: 3, windowId: 1, title: '随便看看', url: 'https://example.com' },
  { id: 7, windowId: 1, title: '扩展开发文档', url: DOC_URL },
];

export function createNotificationClick(): ClickInstance {
  ensureStyles();
  const root = el('div', 'cs-stage nc-stage');

  // —— 通知卡片：点击正文 / 按钮一 / 按钮二 / 关闭 ——
  const notice = el('div', 'nc-notice');
  const head = el('div', 'nc-notice-head');
  const idLabel = el('span', undefined, `"${NOTICE_ID}"`);
  const close = el('button', 'nc-notice-close', '×');
  close.type = 'button';
  head.append(idLabel, close);
  const title = el('div', 'nc-notice-title', '继续阅读《Chrome 扩展开发》');
  const message = el('div', 'nc-notice-message', '上次读到「消息通信」，点击从这里继续。');
  const buttons = el('div', 'nc-notice-buttons');
  const laterButton = el('button', 'nc-notice-button', '稍后处理');
  laterButton.type = 'button';
  const viewButton = el('button', 'nc-notice-button', '立即查看');
  viewButton.type = 'button';
  buttons.append(laterButton, viewButton);
  const hint = el(
    'div',
    'nc-notice-hint',
    '点正文 → onClicked · 按钮 → onButtonClicked · × → onClosed',
  );
  notice.append(head, title, message, buttons, hint);

  // —— service worker 状态条：休眠 / 被唤醒 / 监听器运行 ——
  const sw = el('div', 'nc-sw nc-sw--asleep');
  const swDot = el('span', 'nc-sw-dot');
  const swText = el('span', undefined, 'service worker：休眠（无事件处理）');
  sw.append(swDot, swText);

  const tabStrip = el('div', 'nc-tabs');

  const log = el('div', 'nc-log');

  root.append(notice, sw, tabStrip, log);

  let options: ClickOptions = { response: 'focus', targetOpen: true };
  // 文档标签页是否打开：初始由参数给出，之后随「新建标签页」响应变化
  let docTabOpen = options.targetOpen;
  let activeTabId = 3;
  let lastEvent = '—';
  let lastAction = '—';
  let wakeTimer: number | undefined;

  function logLine(kind: 'event' | 'call' | 'note', text: string) {
    log.append(el('div', `nc-log-line nc-log-line--${kind}`, text));
    log.scrollTop = log.scrollHeight;
  }

  function renderTabs(): void {
    tabStrip.replaceChildren();
    for (const tab of TABS) {
      if (tab.id === 7 && !docTabOpen) {
        continue;
      }
      const chip = el('div', 'nc-tab');
      if (tab.id === activeTabId) {
        chip.classList.add('nc-tab--active');
      }
      chip.append(
        el('span', 'nc-tab-id', `tab ${tab.id}`),
        el('span', undefined, tab.title),
      );
      tabStrip.append(chip);
    }
  }

  function wakeSw(reason: string): void {
    swText.textContent = `service worker：被 ${reason} 唤醒`;
    sw.className = 'nc-sw nc-sw--woken';
  }

  function runHandler(): void {
    swText.textContent = 'service worker：执行顶层注册的监听器';
    sw.className = 'nc-sw nc-sw--running';
    window.clearTimeout(wakeTimer);
    wakeTimer = window.setTimeout(() => {
      swText.textContent = 'service worker：处理完成，空闲计时重新开始';
      sw.className = 'nc-sw nc-sw--running';
      wakeTimer = window.setTimeout(() => {
        swText.textContent = 'service worker：休眠（无事件处理）';
        sw.className = 'nc-sw nc-sw--asleep';
      }, 1600);
    }, 900);
  }

  function openDoc(): void {
    // onClicked / 按钮二的典型响应：先聚焦已有标签页，不在则新建
    if (options.response === 'focus' && docTabOpen) {
      const docTab = TABS.find((tab) => tab.id === 7)!;
      logLine(
        'call',
        `chrome.tabs.update(${docTab.id}, { active: true }) → 切到已有页面`,
      );
      logLine(
        'call',
        `chrome.windows.update(${docTab.windowId}, { focused: true }) → 浏览器窗口前置`,
      );
      activeTabId = docTab.id;
      lastAction = `tabs.update(${docTab.id}, { active: true })`;
    } else {
      const reason = docTabOpen ? '响应方式为新建' : '目标标签页未打开';
      logLine(
        'call',
        `chrome.tabs.create({ url: "${DOC_URL}", active: true })`,
      );
      docTabOpen = true;
      activeTabId = 7;
      lastAction = `tabs.create({ url }) · ${reason}`;
    }
    renderTabs();
  }

  function onUserInteract(reason: string): void {
    wakeSw(reason);
    runHandler();
  }

  notice.addEventListener('click', () => {
    logLine('event', `onClicked(notificationId="${NOTICE_ID}")`);
    lastEvent = `onClicked(notificationId="${NOTICE_ID}")`;
    onUserInteract('onClicked');
    openDoc();
  });

  viewButton.addEventListener('click', (event) => {
    event.stopPropagation();
    logLine(
      'event',
      `onButtonClicked(notificationId="${NOTICE_ID}", buttonIndex=1)`,
    );
    lastEvent = `onButtonClicked(notificationId="${NOTICE_ID}", buttonIndex=1)`;
    onUserInteract('onButtonClicked');
    openDoc();
  });

  laterButton.addEventListener('click', (event) => {
    event.stopPropagation();
    logLine(
      'event',
      `onButtonClicked(notificationId="${NOTICE_ID}", buttonIndex=0)`,
    );
    lastEvent = `onButtonClicked(notificationId="${NOTICE_ID}", buttonIndex=0)`;
    onUserInteract('onButtonClicked');
    logLine('note', '「稍后处理」：只记录意图，不做任何标签页或窗口操作');
    lastAction = '无（按钮一只记录）';
  });

  close.addEventListener('click', (event) => {
    event.stopPropagation();
    logLine('event', `onClosed(notificationId="${NOTICE_ID}", byUser=true)`);
    lastEvent = `onClosed(notificationId="${NOTICE_ID}", byUser=true)`;
    notice.hidden = true;
    lastAction = '通知关闭';
    wakeSw('onClosed');
    runHandler();
  });

  logLine(
    'note',
    '提示：切换「响应方式」「目标标签页」后，再点击通知正文或「立即查看」',
  );

  renderTabs();

  return {
    element: root,
    update(next: ClickOptions) {
      options = next;
      // 参数即世界状态：切换后重置目标标签页，并让被关闭的通知重新出现
      docTabOpen = next.targetOpen;
      activeTabId = docTabOpen ? activeTabId : 3;
      notice.hidden = false;
      renderTabs();
    },
    snapshot(): Array<[string, string]> {
      return [
        [
          '响应方式',
          options.response === 'focus'
            ? '聚焦已有标签页 tabs.update'
            : '新建标签页 tabs.create',
        ],
        ['目标标签页', docTabOpen ? '已打开（tab 7）' : '未打开'],
        ['最后事件', lastEvent],
        ['窗口操作', lastAction],
      ];
    },
    dispose() {
      window.clearTimeout(wakeTimer);
    },
  };
}
