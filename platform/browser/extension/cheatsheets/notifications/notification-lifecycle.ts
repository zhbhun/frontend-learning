/**
 * 范例介绍：模拟 create / update / clear / getAll 在一条通知上的完整生命周期，
 * 后台行为对齐 chrome.notifications API 参考。
 * 前置状态：模拟环境已在 service worker 中注册 onClicked / onButtonClicked /
 * onClosed 三个监听器；面板上的四个按钮对应一次真实调用。
 * 主要操作：发送通知 → 用新文案再发一次（同名）→ 更新通知 → 清除通知；
 * 「通知 ID」参数在自动生成与指定 "sync" 之间切换，「更新字段」决定 update
 * 传入哪些字段。
 * 预期结果：自动模式下每次 create 都是新通知，返回浏览器生成的 id；指定
 * "sync" 后同名再发会先清除旧通知再创建；update 只改变传入字段，命中返回
 * true、目标不存在返回 false；clear 返回是否确有通知被清除；getAll 是当前
 * 存活 id 的集合。
 * 阅读主线：上半部分是调用按钮、当前 ID 模式与存活通知（getAll 的结果），
 * 下半部分日志按发生顺序记录；「→」行是 API 调用，「on*」行是事件回调。
 */

export type IdMode = 'auto' | 'fixed';

export type UpdateField = 'message' | 'progress';

export interface LifecycleOptions {
  idMode: IdMode;
  updateField: UpdateField;
}

export interface LifecycleInstance {
  element: HTMLElement;
  update(options: LifecycleOptions): void;
  snapshot(): Array<[string, string]>;
  dispose(): void;
}

interface LiveNotification {
  id: string;
  title: string;
  message: string;
  progress: number;
}

type CreateInput = Omit<LiveNotification, 'id'>;

type EventName = 'onClicked' | 'onButtonClicked' | 'onClosed';

// 共享样式（assets/story-canvas.css）只提供 .cs-stage 外壳，本课范例的
// .nl-* 样式随范例文件注入，不修改共享基础设施
const STYLE_ID = 'notification-lifecycle-style';

const STYLE = `
.cs-stage.nl-stage {
  aspect-ratio: auto;
  min-height: 480px;
  padding: 38px 14px 104px;
  background: #f8fafc;
}
.nl-panel {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.nl-action {
  padding: 7px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 7px;
  background: #ffffff;
  color: #172033;
  font-size: 12px;
  cursor: pointer;
}
.nl-action:hover { border-color: #4f7cff; color: #3b5bdb; }
.nl-mode {
  margin-top: 10px;
  color: #475569;
  font-size: 12px;
}
.nl-mode b { color: #3b5bdb; }
.nl-section-title {
  margin: 12px 0 6px;
  color: #64748b;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
}
.nl-alive {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-height: 30px;
}
.nl-none {
  color: #94a3b8;
  font-size: 12px;
}
.nl-chip {
  padding: 5px 10px;
  border: 1px solid #dbe3f0;
  border-radius: 999px;
  background: #ffffff;
  color: #172033;
  font-size: 11px;
  cursor: pointer;
}
.nl-chip:hover { border-color: #4f7cff; }
.nl-card {
  width: 300px;
  max-width: 100%;
  border: 1px solid #dbe3f0;
  border-radius: 10px;
  background: #ffffff;
  color: #172033;
  cursor: pointer;
}
.nl-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px 0;
  color: #64748b;
  font-size: 11px;
}
.nl-card-close {
  border: none;
  background: none;
  color: #64748b;
  font-size: 12px;
  cursor: pointer;
}
.nl-card-title {
  padding: 2px 10px 0;
  font-size: 13px;
  font-weight: 700;
}
.nl-card-message {
  padding: 2px 10px 6px;
  font-size: 12px;
}
.nl-card-progress {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 10px 8px;
  color: #475569;
  font-size: 11px;
}
.nl-card-progress-track {
  flex: 1;
  height: 5px;
  border-radius: 999px;
  background: #e2e8f0;
  overflow: hidden;
}
.nl-card-progress-bar {
  height: 100%;
  background: #4f7cff;
}
.nl-card-buttons {
  display: flex;
  gap: 6px;
  padding: 0 10px 10px;
}
.nl-card-button {
  flex: 1;
  padding: 4px 6px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #ffffff;
  color: #172033;
  font-size: 11px;
  cursor: pointer;
}
.nl-card-button:hover { border-color: #4f7cff; color: #3b5bdb; }
.nl-card-hint {
  padding: 0 10px 8px;
  color: #94a3b8;
  font-size: 10px;
}
.nl-log {
  height: 132px;
  padding: 8px 10px;
  border: 1px solid #dbe3f0;
  border-radius: 8px;
  background: #0f172a;
  color: #e2e8f0;
  font: 11px/1.7 ui-monospace, SFMono-Regular, Menlo, monospace;
  overflow-y: auto;
}
.nl-log-line--call { color: #93c5fd; }
.nl-log-line--result { color: #86efac; }
.nl-log-line--event { color: #fcd34d; }
.nl-log-line--note { color: #cbd5e1; }
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

const INITIAL: CreateInput = {
  title: '课程更新提醒',
  message: '新内容已就绪，点击查看。',
  progress: 20,
};

const SECOND: CreateInput = {
  title: '配送状态已更新',
  message: '包裹已到达自提柜，取件码 8823。',
  progress: 60,
};

const UPDATED_MESSAGE = '已更新：新增「常见问题」一节';

const PROGRESS_STEPS = [40, 60, 80, 100];

export function createNotificationLifecycle(): LifecycleInstance {
  ensureStyles();
  const root = el('div', 'cs-stage nl-stage');

  const panel = el('div', 'nl-panel');
  const sendButton = el('button', 'nl-action', '发送通知 create');
  sendButton.type = 'button';
  const resendButton = el('button', 'nl-action', '用新文案再发一次 create');
  resendButton.type = 'button';
  resendButton.title = '固定使用 id "sync"：与已存在的同名通知相撞';
  const updateButton = el('button', 'nl-action', '更新通知 update');
  updateButton.type = 'button';
  const clearButton = el('button', 'nl-action', '清除通知 clear');
  clearButton.type = 'button';
  panel.append(sendButton, resendButton, updateButton, clearButton);

  const mode = el('div', 'nl-mode');
  const aliveTitle = el('div', 'nl-section-title', 'getAll() · 当前存活通知');
  const aliveBox = el('div', 'nl-alive');
  const logTitle = el('div', 'nl-section-title', '调用与事件日志');
  const log = el('div', 'nl-log');

  root.append(panel, mode, aliveTitle, aliveBox, logTitle, log);

  // —— 模拟后端：对齐 chrome.notifications 的方法与事件约定 ——

  const notifications = new Map<string, LiveNotification>();
  let autoSeq = 0;
  let progressStep = 0;
  let lastCreateId = '—';
  let lastUpdateResult = '—';
  let lastClearResult = '—';

  let options: LifecycleOptions = { idMode: 'auto', updateField: 'message' };

  function logLine(kind: 'call' | 'result' | 'event' | 'note', text: string) {
    log.append(el('div', `nl-log-line nl-log-line--${kind}`, text));
    log.scrollTop = log.scrollHeight;
  }

  function dispatchEvent(name: EventName, args: string[]) {
    // 事件参数按 API 参考的签名记录：onClicked(notificationId)、
    // onButtonClicked(notificationId, buttonIndex)、onClosed(notificationId, byUser)
    logLine('event', `${name}(${args.join(', ')})`);
  }

  function create(id: string | undefined, input: CreateInput): string {
    if (id !== undefined && id !== '' && notifications.has(id)) {
      // API 参考：create 的 id 与已存在的通知相同时，先清除旧通知再执行创建
      notifications.delete(id);
      logLine('note', `旧通知 "${id}" 被同名 create 先清除，再创建`);
    }
    const notificationId =
      id === undefined || id === ''
        ? `generated-${++autoSeq}`
        : id;
    notifications.set(notificationId, { id: notificationId, ...input });
    lastCreateId = notificationId;
    return notificationId;
  }

  function update(id: string, patch: Partial<CreateInput>): boolean {
    const target = notifications.get(id);
    if (!target) {
      return false;
    }
    // update 只改变 options 中给出的字段，其余保持原值
    Object.assign(target, patch);
    return true;
  }

  function clear(id: string): boolean {
    if (!notifications.has(id)) {
      return false;
    }
    notifications.delete(id);
    dispatchEvent('onClosed', [`notificationId="${id}"`, 'byUser=false']);
    return true;
  }

  function getAll(): string[] {
    return [...notifications.keys()];
  }

  function targetId(): string | undefined {
    return notifications.has(lastCreateId) ? lastCreateId : undefined;
  }

  function renderAlive(): void {
    aliveBox.replaceChildren();
    const ids = getAll();
    if (ids.length === 0) {
      aliveBox.append(el('div', 'nl-none', 'getAll() → {}（没有存活通知）'));
      return;
    }
    for (const id of ids) {
      aliveBox.append(createCard(notifications.get(id)!));
    }
  }

  function createCard(notification: LiveNotification): HTMLElement {
    const card = el('div', 'nl-card');
    card.dataset.id = notification.id;

    const head = el('div', 'nl-card-head');
    const idLabel = el('span', undefined, `"${notification.id}"`);
    const close = el('button', 'nl-card-close', '×');
    close.type = 'button';
    close.title = '用户手动关闭 → onClosed(notificationId, byUser=true)';
    close.addEventListener('click', (event) => {
      event.stopPropagation();
      logLine('note', `用户点击 × 关闭 "${notification.id}"`);
      dispatchEvent('onClosed', [
        `notificationId="${notification.id}"`,
        'byUser=true',
      ]);
      notifications.delete(notification.id);
      renderAlive();
    });
    head.append(idLabel, close);

    const title = el('div', 'nl-card-title', notification.title);
    const message = el('div', 'nl-card-message', notification.message);

    const progress = el('div', 'nl-card-progress');
    const progressText = el('span', undefined, `progress: ${notification.progress}`);
    const progressTrack = el('div', 'nl-card-progress-track');
    const progressBar = el('div', 'nl-card-progress-bar');
    progressBar.style.width = `${notification.progress}%`;
    progressTrack.append(progressBar);
    progress.append(progressText, progressTrack);

    const buttons = el('div', 'nl-card-buttons');
    ['稍后处理', '立即查看'].forEach((label, index) => {
      const button = el('button', 'nl-card-button', label);
      button.type = 'button';
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        dispatchEvent('onButtonClicked', [
          `notificationId="${notification.id}"`,
          `buttonIndex=${index}`,
        ]);
      });
      buttons.append(button);
    });

    const hint = el(
      'div',
      'nl-card-hint',
      '点卡片派发 onClicked · 按钮派发 onButtonClicked · × 派发 onClosed',
    );

    // 点击正文（非按钮区域）派发 onClicked
    card.addEventListener('click', () => {
      dispatchEvent('onClicked', [`notificationId="${notification.id}"`]);
    });

    card.append(head, title, message, progress, buttons, hint);
    return card;
  }

  function renderMode(): void {
    const modeText = el('b', undefined,
      options.idMode === 'fixed'
        ? '指定 "sync"（同名再发会替换旧通知）'
        : '自动生成（每次 create 都是新通知）',
    );
    mode.replaceChildren(
      el('span', undefined, '当前 ID 模式：'),
      modeText,
      el(
        'span',
        undefined,
        '　·　「用新文案再发一次」固定调用 create("sync", …)，用来观察同名规则',
      ),
    );
  }

  sendButton.addEventListener('click', () => {
    const id = options.idMode === 'fixed' ? 'sync' : undefined;
    logLine(
      'call',
      id === undefined
        ? 'chrome.notifications.create({ type: "basic", … })'
        : `chrome.notifications.create("${id}", { type: "basic", … })`,
    );
    const returned = create(id, { ...INITIAL });
    logLine('result', `→ Promise<"${returned}">`);
    progressStep = 0;
    renderAlive();
  });

  resendButton.addEventListener('click', () => {
    logLine('call', 'chrome.notifications.create("sync", { … 新文案 … })');
    const returned = create('sync', { ...SECOND });
    logLine('result', `→ Promise<"${returned}">`);
    renderAlive();
  });

  updateButton.addEventListener('click', () => {
    const id = targetId();
    if (id === undefined) {
      logLine('note', 'update 目标不存在：先发送一条通知，或用指定 ID 模式');
      lastUpdateResult = 'false（无目标）';
      return;
    }
    if (options.updateField === 'progress') {
      const value = PROGRESS_STEPS[Math.min(progressStep, PROGRESS_STEPS.length - 1)];
      progressStep += 1;
      logLine('call', `chrome.notifications.update("${id}", { progress: ${value} })`);
      lastUpdateResult = String(update(id, { progress: value }));
      logLine('result', `→ ${lastUpdateResult}`);
    } else {
      logLine(
        'call',
        `chrome.notifications.update("${id}", { message: "${UPDATED_MESSAGE}" })`,
      );
      lastUpdateResult = String(update(id, { message: UPDATED_MESSAGE }));
      logLine('result', `→ ${lastUpdateResult}`);
    }
    renderAlive();
  });

  clearButton.addEventListener('click', () => {
    const id = targetId();
    if (id === undefined) {
      const tried =
        lastCreateId === '—' ? '（尚未发送过通知）' : `clear("${lastCreateId}")`;
      logLine('note', `clear 目标不存在：${tried} 将返回 false`);
      lastClearResult = 'false（无目标）';
      return;
    }
    logLine('call', `chrome.notifications.clear("${id}")`);
    lastClearResult = String(clear(id));
    logLine('result', `→ ${lastClearResult}`);
    renderAlive();
  });

  logLine(
    'note',
    '提示：「发送通知」在自动模式下每次返回新 id；指定 "sync" 后再点「用新文案再发一次」观察同名替换',
  );

  renderMode();
  renderAlive();

  return {
    element: root,
    update(next: LifecycleOptions) {
      options = next;
      renderMode();
    },
    snapshot(): Array<[string, string]> {
      const ids = getAll();
      return [
        ['ID 模式', options.idMode === 'fixed' ? '指定 "sync"' : '自动生成'],
        ['最后 create 返回', lastCreateId],
        ['update 结果', lastUpdateResult],
        ['clear 结果', lastClearResult],
        ['getAll', ids.length === 0 ? '空' : `${ids.length} 条：${ids.join('、')}`],
      ];
    },
    dispose() {
      // 没有定时器或全局监听，节点移除后随 DOM 一起回收
    },
  };
}
