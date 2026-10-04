import type { Meta, StoryObj } from '@storybook/html-vite';

import { storySource } from '../../assets/story-source.js';
import templateSource from './notification-template.ts?raw';
import lifecycleSource from './notification-lifecycle.ts?raw';
import clickSource from './notification-click.ts?raw';
import { createNotificationTemplate } from './notification-template';
import type {
  NotificationPlatform,
  NotificationTemplate,
  TemplateInstance,
} from './notification-template';
import { createNotificationLifecycle } from './notification-lifecycle';
import type {
  IdMode,
  LifecycleInstance,
  UpdateField,
} from './notification-lifecycle';
import { createNotificationClick } from './notification-click';
import type { ClickInstance, ResponseMode } from './notification-click';

// 把 DOM 范例实例接到 Storybook args 上：实例只创建一次，后续参数变化只调用
// apply；实例自带的 snapshot 由左下角读数显示；离开当前 Docs 页（节点被移除）
// 时调用实例的 dispose。
function domStory<
  Args,
  T extends {
    element: HTMLElement;
    snapshot(): Array<[string, string]>;
    dispose(): void;
  },
>(options: {
  create: () => T;
  captions: string[];
  apply: (instance: T, args: Args) => void;
}): (args: Args) => HTMLElement {
  let instance: T | undefined;
  let readoutEl: HTMLDListElement | undefined;

  return (args: Args): HTMLElement => {
    let current = instance;
    if (!current) {
      current = options.create();
      instance = current;
      const created = current;
      const stage = created.element;

      const captions = document.createDocumentFragment();
      options.captions.forEach((text, index) => {
        const caption = document.createElement('p');
        caption.className =
          index === 0
            ? 'cs-caption cs-caption--left'
            : 'cs-caption cs-caption--right';
        caption.textContent = text;
        captions.append(caption);
      });
      stage.insertBefore(captions, stage.firstChild);

      readoutEl = document.createElement('dl');
      readoutEl.className = 'cs-readout';
      stage.append(readoutEl);

      requestAnimationFrame(() => {
        const parent = created.element.parentElement;
        if (!parent) {
          return;
        }
        const observer = new MutationObserver(() => {
          if (!created.element.isConnected) {
            observer.disconnect();
            created.dispose();
            if (instance === created) {
              instance = undefined;
              readoutEl = undefined;
            }
          }
        });
        observer.observe(parent, { childList: true });
      });
    }

    options.apply(current, args);
    paintReadout(readoutEl!, current.snapshot());
    return current.element;
  };
}

// 读数重绘：dt/dd 数量固定，只更新标签与取值
function paintReadout(
  root: HTMLDListElement,
  entries: Array<[string, string]>,
): void {
  if (root.childElementCount !== entries.length * 2) {
    root.replaceChildren();
    for (const [label] of entries) {
      const term = document.createElement('dt');
      term.textContent = label;
      root.append(term, document.createElement('dd'));
    }
  }

  const terms = root.querySelectorAll('dt');
  const values = root.querySelectorAll('dd');
  entries.forEach(([label, value], index) => {
    const term = terms[index];
    const cell = values[index];
    if (term && term.textContent !== label) {
      term.textContent = label;
    }
    if (cell && cell.textContent !== value) {
      cell.textContent = value;
    }
  });
}

interface TemplateArgs {
  template: string;
  platform: string;
  buttons: boolean;
  requireInteraction: boolean;
}

interface LifecycleArgs {
  idMode: string;
  updateField: string;
}

interface ClickArgs {
  response: string;
  targetOpen: boolean;
}

const TEMPLATE_BY_LABEL: Record<string, NotificationTemplate> = {
  basic: 'basic',
  image: 'image',
  list: 'list',
  progress: 'progress',
};

const PLATFORM_BY_LABEL: Record<string, NotificationPlatform> = {
  'Windows / Linux': 'windows',
  macOS: 'macos',
};

const ID_MODE_BY_LABEL: Record<string, IdMode> = {
  '自动生成': 'auto',
  '指定 "sync"': 'fixed',
};

const UPDATE_FIELD_BY_LABEL: Record<string, UpdateField> = {
  'message（只改消息）': 'message',
  'progress（只改进度）': 'progress',
};

const RESPONSE_BY_LABEL: Record<string, ResponseMode> = {
  '聚焦已有标签页（tabs.update + windows.update）': 'focus',
  '新建标签页（tabs.create）': 'newTab',
};

const renderTemplate = domStory<TemplateArgs, TemplateInstance>({
  create: createNotificationTemplate,
  captions: [
    'chrome.notifications.create 的四种模板（模拟）',
    '同一份参数在两种平台上的显示差异',
  ],
  apply(instance: TemplateInstance, args: TemplateArgs) {
    instance.update({
      template: TEMPLATE_BY_LABEL[args.template],
      platform: PLATFORM_BY_LABEL[args.platform],
      buttons: args.buttons,
      requireInteraction: args.requireInteraction,
    });
  },
});

const renderLifecycle = domStory<LifecycleArgs, LifecycleInstance>({
  create: createNotificationLifecycle,
  captions: [
    'create / update / clear 的调用序列（模拟）',
    '事件名与参数名和 chrome.notifications 一致',
  ],
  apply(instance: LifecycleInstance, args: LifecycleArgs) {
    instance.update({
      idMode: ID_MODE_BY_LABEL[args.idMode],
      updateField: UPDATE_FIELD_BY_LABEL[args.updateField],
    });
  },
});

const renderClick = domStory<ClickArgs, ClickInstance>({
  create: createNotificationClick,
  captions: [
    '点击通知后的事件派发与响应（模拟）',
    '每次点击先唤醒 service worker，再执行监听器',
  ],
  apply(instance: ClickInstance, args: ClickArgs) {
    instance.update({
      response: RESPONSE_BY_LABEL[args.response],
      targetOpen: args.targetOpen,
    });
  },
});

const meta = {
  id: 'notifications',
  title: '浏览器界面/通知',
  tags: ['!dev'],
} satisfies Meta;

export default meta;

export const Template: StoryObj<TemplateArgs> = {
  args: {
    template: 'basic',
    platform: 'Windows / Linux',
    buttons: true,
    requireInteraction: false,
  },
  argTypes: {
    template: {
      name: 'type',
      description: '模板类型：basic / image / list / progress，create 的必填字段。',
      control: { type: 'select' },
      options: ['basic', 'image', 'list', 'progress'],
    },
    platform: {
      name: '平台',
      description: '同一份参数在 Windows / Linux 与 macOS 上的显示差异。',
      control: { type: 'select' },
      options: ['Windows / Linux', 'macOS'],
    },
    buttons: {
      name: 'buttons',
      description: '是否附带最多两个操作按钮；按下时派发 onButtonClicked。',
      control: { type: 'boolean' },
    },
    requireInteraction: {
      name: 'requireInteraction',
      description: 'true 时通知常驻到用户处理；默认 false，展示数秒后自动关闭。',
      control: { type: 'boolean' },
    },
  },
  render: renderTemplate,
  parameters: storySource(templateSource),
};

export const Lifecycle: StoryObj<LifecycleArgs> = {
  args: {
    idMode: '自动生成',
    updateField: 'message（只改消息）',
  },
  argTypes: {
    idMode: {
      name: '通知 ID',
      description:
        'create 的第一个参数：省略时由浏览器生成 id；指定后同名再发会先清除旧通知。',
      control: { type: 'select' },
      options: ['自动生成', '指定 "sync"'],
    },
    updateField: {
      name: 'update 传入的字段',
      description: 'update 的 options 只写要改的字段，其余保持原值。',
      control: { type: 'select' },
      options: ['message（只改消息）', 'progress（只改进度）'],
    },
  },
  render: renderLifecycle,
  parameters: storySource(lifecycleSource),
};

export const Click: StoryObj<ClickArgs> = {
  args: {
    response: '聚焦已有标签页（tabs.update + windows.update）',
    targetOpen: true,
  },
  argTypes: {
    response: {
      name: '响应方式',
      description:
        'onClicked 与「立即查看」按钮的处理方式：聚焦已有标签页，或新建标签页。',
      control: { type: 'select' },
      options: [
        '聚焦已有标签页（tabs.update + windows.update）',
        '新建标签页（tabs.create）',
      ],
    },
    targetOpen: {
      name: '目标标签页已打开',
      description:
        '「扩展开发文档」页是否已经打开；未打开时聚焦策略会退回新建。',
      control: { type: 'boolean' },
    },
  },
  render: renderClick,
  parameters: storySource(clickSource),
};
