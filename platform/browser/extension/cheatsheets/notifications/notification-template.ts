/**
 * 范例介绍：模拟 chrome.notifications.create 的四种模板（basic / image / list /
 * progress）按 NotificationOptions 画出的通知卡片，演示同一份参数在不同平台上的
 * 实际渲染结果。
 * 前置状态：iconUrl / title / message 是 create 的必填字段，这里各有默认值；
 * 按钮最多两个，卡片显示「稍后处理」与「立即查看」。
 * 主要操作：切换 type、平台（Windows / Linux 与 macOS），开关 buttons 与
 * requireInteraction。
 * 预期结果：image 模板出现大图、list 出现条目、progress 出现进度条；macOS 上
 * image 与按钮图标不显示、list 只保留第一条；requireInteraction: true 时卡片
 * 常驻到用户处理，否则数秒后自动关闭。
 * 阅读主线：卡片即用户在系统通知中心看到的样子，读数给出实际参与渲染的字段；
 * 卡片下方回显的调用参数与 API 字段同名。
 */

export type NotificationTemplate = 'basic' | 'image' | 'list' | 'progress';

export type NotificationPlatform = 'windows' | 'macos';

export interface TemplateOptions {
  template: NotificationTemplate;
  platform: NotificationPlatform;
  buttons: boolean;
  requireInteraction: boolean;
}

export interface TemplateInstance {
  element: HTMLElement;
  update(options: TemplateOptions): void;
  snapshot(): Array<[string, string]>;
  dispose(): void;
}

// 卡片内容字段与模板解耦：四类模板共用同一份基础内容，形状由 type 决定
const BASE_OPTIONS = {
  iconUrl: 'icons/icon-32.png',
  title: '课程更新提醒',
  message: '《通知》一课新增了两个小节，点击继续上次的进度。',
  contextMessage: 'contextMessage：来自 chrome.notifications.create',
};

const TEMPLATE_LABEL: Record<NotificationTemplate, string> = {
  basic: 'basic',
  image: 'image',
  list: 'list',
  progress: 'progress',
};

const PLATFORM_LABEL: Record<NotificationPlatform, string> = {
  windows: 'Windows / Linux',
  macos: 'macOS',
};

const DEFAULT_OPTIONS: TemplateOptions = {
  template: 'basic',
  platform: 'windows',
  buttons: true,
  requireInteraction: false,
};

const LIST_ITEMS = [
  { title: 'item 1 · 发出通知', message: 'items: [{ title, message }]' },
  { title: 'item 2 · 模板与字段', message: 'type 决定卡片形状' },
];

const BUTTONS = ['稍后处理', '立即查看'];

const PROGRESS = 62;

const MACOS_NO_IMAGE = "macOS 不显示 image（imageUrl 自 Chrome 59 起弃用）";

const MACOS_NO_BUTTON_ICON =
  'macOS 不显示按钮图标（NotificationButton.iconUrl 自 Chrome 59 起弃用）';

// 共享样式（assets/story-canvas.css）只提供 .cs-stage 外壳，本课范例的
// .nt-* 样式随范例文件注入，不修改共享基础设施
const STYLE_ID = 'notification-template-style';

const STYLE = `
.cs-stage.nt-stage {
  aspect-ratio: auto;
  min-height: 460px;
  padding: 38px 16px 104px;
  background: linear-gradient(160deg, #e2e8f0, #f8fafc);
}
.nt-card {
  width: 320px;
  max-width: 100%;
  border: 1px solid #dbe3f0;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 12px 28px rgb(15 23 42 / 14%);
  color: #172033;
}
.nt-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px 0;
  color: #475569;
  font-size: 12px;
}
.nt-appicon {
  display: grid;
  width: 18px;
  height: 18px;
  border-radius: 4px;
  background: #cbd5e1;
  color: #475569;
  font-size: 9px;
  font-weight: 700;
  place-items: center;
}
.nt-source {
  flex: 1;
  min-width: 0;
}
.nt-close {
  padding: 0 2px;
  border: none;
  background: none;
  color: #64748b;
  font-size: 12px;
  cursor: pointer;
}
.nt-body {
  padding: 4px 12px 10px;
}
.nt-title {
  font-size: 14px;
  font-weight: 700;
}
.nt-message {
  margin-top: 3px;
  font-size: 13px;
}
.nt-context {
  margin-top: 5px;
  color: #94a3b8;
  font-size: 11px;
}
.nt-image {
  display: grid;
  height: 84px;
  margin: 8px 12px 0;
  border: 1px dashed #94a3b8;
  border-radius: 8px;
  background: #eef2ff;
  color: #3b5bdb;
  font-size: 11px;
  place-items: center;
}
.nt-missing {
  margin: 8px 12px 0;
  padding: 7px 10px;
  border-radius: 8px;
  background: #fef3c7;
  color: #92400e;
  font-size: 11px;
}
.nt-items {
  margin: 8px 12px 0;
  padding: 0;
  list-style: none;
}
.nt-item {
  padding: 6px 2px;
  border-top: 1px solid #e2e8f0;
  font-size: 12px;
}
.nt-item:first-child {
  border-top: none;
}
.nt-item--note {
  color: #92400e;
}
.nt-item-title {
  font-weight: 600;
}
.nt-item-message {
  color: #64748b;
  font-size: 11px;
}
.nt-progress-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 9px 12px 0;
  color: #475569;
  font-size: 11px;
}
.nt-progress-track {
  flex: 1;
  height: 6px;
  border-radius: 999px;
  background: #e2e8f0;
  overflow: hidden;
}
.nt-progress-bar {
  height: 100%;
  border-radius: 999px;
  background: #4f7cff;
}
.nt-buttons {
  display: flex;
  gap: 8px;
  padding: 10px 12px 12px;
}
.nt-button {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border: 1px solid #cbd5e1;
  border-radius: 7px;
  background: #ffffff;
  color: #172033;
  font-size: 12px;
  cursor: pointer;
}
.nt-button:hover {
  border-color: #4f7cff;
  color: #3b5bdb;
}
.nt-button-icon {
  display: grid;
  width: 14px;
  height: 14px;
  border-radius: 3px;
  background: #e2e8f0;
  color: #475569;
  font-size: 8px;
  place-items: center;
}
.nt-button-note {
  padding: 0 12px 10px;
  color: #92400e;
  font-size: 11px;
}
.nt-lifetime {
  margin: 0 12px 10px;
  padding: 6px 10px;
  border-radius: 6px;
  background: #eef2ff;
  color: #3b5bdb;
  font-size: 11px;
}
.nt-call {
  margin: 12px 0 0;
  color: #475569;
  font: 11px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace;
  white-space: pre-wrap;
  word-break: break-all;
}
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

/** 模板特有区域：按 type 只渲染对应字段，并给出当前平台是否显示 */
function createTemplateArea(options: TemplateOptions): HTMLElement[] {
  if (options.template === 'image') {
    return options.platform === 'macos'
      ? [el('div', 'nt-missing', MACOS_NO_IMAGE)]
      : [el('div', 'nt-image', "imageUrl：大图（type: 'image'）")];
  }
  if (options.template === 'list') {
    const list = el('ul', 'nt-items');
    const visible =
      options.platform === 'macos' ? LIST_ITEMS.slice(0, 1) : LIST_ITEMS;
    for (const item of visible) {
      const li = el('li', 'nt-item');
      li.append(
        el('div', 'nt-item-title', item.title),
        el('div', 'nt-item-message', item.message),
      );
      list.append(li);
    }
    if (options.platform === 'macos') {
      list.append(
        el('li', 'nt-item nt-item--note', 'macOS 只显示第一条：items[1] 被忽略'),
      );
    }
    return [list];
  }
  if (options.template === 'progress') {
    const row = el('div', 'nt-progress-row');
    const label = el('span', undefined, `progress: ${PROGRESS}`);
    const track = el('div', 'nt-progress-track');
    const bar = el('div', 'nt-progress-bar');
    bar.style.width = `${PROGRESS}%`;
    track.append(bar);
    row.append(label, track);
    return [row];
  }
  return [];
}

/** 按钮区：最多两个；图标只在非 macOS 平台出现 */
function createButtons(options: TemplateOptions): HTMLElement[] {
  if (!options.buttons) {
    return [];
  }
  const row = el('div', 'nt-buttons');
  BUTTONS.forEach((title) => {
    const button = el('button', 'nt-button');
    button.type = 'button';
    button.title = '按下后派发 onButtonClicked(notificationId, buttonIndex)';
    if (options.platform !== 'macos') {
      button.append(el('span', 'nt-button-icon', 'icon'));
    }
    button.append(el('span', undefined, title));
    row.append(button);
  });
  const children: HTMLElement[] = [row];
  if (options.platform === 'macos') {
    children.push(el('div', 'nt-button-note', MACOS_NO_BUTTON_ICON));
  }
  return children;
}

function createCallLine(options: TemplateOptions): string {
  const lines = [
    "chrome.notifications.create('notice', {",
    `  type: '${options.template}',`,
    `  iconUrl: '${BASE_OPTIONS.iconUrl}',`,
    `  title: '${BASE_OPTIONS.title}',`,
    `  message: '${BASE_OPTIONS.message}',`,
  ];
  if (options.template === 'image') {
    lines.push("  imageUrl: 'images/cover.png',");
  }
  if (options.template === 'list') {
    lines.push('  items: [{ title, message }, { title, message }],');
  }
  if (options.template === 'progress') {
    lines.push(`  progress: ${PROGRESS},`);
  }
  if (options.buttons) {
    lines.push(
      "  buttons: [{ title: '稍后处理' }, { title: '立即查看' }],",
    );
  }
  if (options.requireInteraction) {
    lines.push('  requireInteraction: true,');
  }
  lines.push('})');
  return lines.join('\n');
}

export function createNotificationTemplate(): TemplateInstance {
  ensureStyles();
  const root = el('div', 'cs-stage nt-stage');

  const card = el('div', 'nt-card');
  const head = el('div', 'nt-head');
  head.append(
    el('span', 'nt-appicon', 'icon'),
    el('span', 'nt-source', '课堂示例扩展 · 现在'),
    (() => {
      const close = el('button', 'nt-close', '×');
      close.type = 'button';
      close.title = '关闭通知 → onClosed(notificationId, byUser=true)';
      return close;
    })(),
  );
  const body = el('div', 'nt-body');
  body.append(
    el('div', 'nt-title', BASE_OPTIONS.title),
    el('div', 'nt-message', BASE_OPTIONS.message),
    el('div', 'nt-context', BASE_OPTIONS.contextMessage),
  );
  const call = el('p', 'nt-call');

  root.append(card, call);

  let current: TemplateOptions = { ...DEFAULT_OPTIONS };

  function render(): void {
    // 整卡重画：公共头部与内容 → 模板特有区域 → 常驻标记 → 按钮区
    card.replaceChildren(head, body);
    for (const node of createTemplateArea(current)) {
      card.append(node);
    }
    card.append(
      el(
        'div',
        'nt-lifetime',
        current.requireInteraction
          ? 'requireInteraction: true —— 常驻到用户处理或关闭'
          : 'requireInteraction: false —— 展示数秒后自动关闭（默认）',
      ),
    );
    for (const node of createButtons(current)) {
      card.append(node);
    }
    call.textContent = createCallLine(current);
  }

  render();

  return {
    element: root,
    update(options: TemplateOptions) {
      current = options;
      render();
    },
    snapshot(): Array<[string, string]> {
      const extra =
        current.template === 'image'
          ? 'imageUrl 大图'
          : current.template === 'list'
            ? '2 条 items'
            : current.template === 'progress'
              ? `progress ${PROGRESS}`
              : '无';
      return [
        ['type', TEMPLATE_LABEL[current.template]],
        ['平台', PLATFORM_LABEL[current.platform]],
        ['按钮', current.buttons ? '2 个' : '无'],
        ['模板特有字段', extra],
        ['常驻', current.requireInteraction ? '是' : '否（自动关闭）'],
      ];
    },
    dispose() {
      // 没有定时器或全局监听，节点移除后随 DOM 一起回收
    },
  };
}
