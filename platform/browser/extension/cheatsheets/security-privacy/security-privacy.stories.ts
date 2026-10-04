import type { Meta, StoryObj } from '@storybook/html-vite';

import { storySource } from '../../assets/story-source.js';
import senderValidationSource from './sender-validation.ts?raw';
import xssRenderSource from './xss-render.ts?raw';
import {
  createSenderValidation,
  type SenderValidationInstance,
  type SenderValidationOptions,
} from './sender-validation';
import { createXssRender, type XssRenderInstance, type XssRenderOptions } from './xss-render';

interface XssRenderArgs {
  renderMode: string;
  payload: string;
}

interface SenderValidationArgs {
  source: string;
  externallyConnectable: string;
}

// 把 DOM 范例实例接到 Storybook args 上：实例只创建一次，后续参数变化只调用
// apply；读数由实例通过 emit 推送（onerror 是异步事件，结论会晚一帧回读），
// 离开当前 Docs 页（节点被移除）时调用实例的 dispose。
function demoStory<
  Args,
  T extends { element: HTMLElement; dispose(): void },
>(options: {
  create: (emit: (entries: Array<[string, string]>) => void) => T;
  captions: string[];
  apply: (instance: T, args: Args) => void;
}): (args: Args) => HTMLElement {
  let instance: T | undefined;
  let readoutEl: HTMLDListElement | undefined;

  return (args: Args): HTMLElement => {
    let current = instance;
    if (!current) {
      current = options.create((entries) => {
        if (readoutEl) {
          paintReadout(readoutEl, entries);
        }
      });
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

const RENDER_MODE_BY_LABEL: Record<string, XssRenderOptions['renderMode']> = {
  'container.innerHTML = payload': 'innerHTML',
  'createElement + innerText': 'dom-api',
};

const PAYLOAD_BY_LABEL: Record<string, XssRenderOptions['payload']> = {
  '纯文本': 'text',
  '事件属性载荷': 'event-attr',
  'script 标签载荷': 'script-tag',
};

const SOURCE_BY_LABEL: Record<string, SenderValidationOptions['source']> = {
  '本扩展的 content script': 'content-script',
  'content script 转帖页面可控内容': 'content-script-tainted',
  '白名单内的其他扩展': 'extension-listed',
  '白名单外的其他扩展': 'extension-unknown',
  'matches 命中的外部网页': 'web-partner',
};

const EXTERNALLY_CONNECTABLE_BY_LABEL: Record<
  string,
  SenderValidationOptions['externallyConnectable']
> = {
  '未声明': 'undeclared',
  'ids + matches 白名单': 'allowlist',
};

const renderXssRender = demoStory<XssRenderArgs, XssRenderInstance>({
  create: createXssRender,
  captions: [
    '同一段页面数据的两种渲染路径（真实浏览器行为）',
    'onerror 载荷只在 innerHTML 路径下触发',
  ],
  apply(instance: XssRenderInstance, args: XssRenderArgs) {
    instance.update({
      renderMode: RENDER_MODE_BY_LABEL[args.renderMode],
      payload: PAYLOAD_BY_LABEL[args.payload],
    });
  },
});

const renderSenderValidation = demoStory<
  SenderValidationArgs,
  SenderValidationInstance
>({
  create: createSenderValidation,
  captions: [
    '消息来源 × manifest 声明的放行判断（模拟）',
    '到达 ≠ 放行：到达之后仍要按白名单校验',
  ],
  apply(instance: SenderValidationInstance, args: SenderValidationArgs) {
    instance.update({
      source: SOURCE_BY_LABEL[args.source],
      externallyConnectable:
        EXTERNALLY_CONNECTABLE_BY_LABEL[args.externallyConnectable],
    });
  },
});

const meta = {
  id: 'security-privacy',
  title: '进阶能力/安全与隐私',
  tags: ['!dev'],
} satisfies Meta;

export default meta;

export const XssRender: StoryObj<XssRenderArgs> = {
  args: {
    renderMode: 'container.innerHTML = payload',
    payload: '事件属性载荷',
  },
  argTypes: {
    renderMode: {
      name: '渲染方式',
      description:
        '把页面数据写进扩展页面的两条路径：innerHTML 会解析标记，createElement + innerText 只插入文本。',
      control: { type: 'select' },
      options: ['container.innerHTML = payload', 'createElement + innerText'],
    },
    payload: {
      name: '数据载荷',
      description:
        '视同来自网页的字符串。事件属性载荷在 innerHTML 路径下会真实执行 onerror。',
      control: { type: 'select' },
      options: ['纯文本', '事件属性载荷', 'script 标签载荷'],
    },
  },
  render: renderXssRender,
  parameters: storySource(xssRenderSource),
};

export const SenderValidation: StoryObj<SenderValidationArgs> = {
  args: {
    source: '本扩展的 content script',
    externallyConnectable: '未声明',
  },
  argTypes: {
    source: {
      name: '消息来源',
      description:
        'sender 字段随来源变化：content script 与外部扩展带 sender.id，网页带 sender.origin / sender.url。',
      control: { type: 'select' },
      options: [
        '本扩展的 content script',
        'content script 转帖页面可控内容',
        '白名单内的其他扩展',
        '白名单外的其他扩展',
        'matches 命中的外部网页',
      ],
    },
    externallyConnectable: {
      name: 'externally_connectable 声明',
      description:
        '未声明时其他扩展都能连、网页都不能；声明后按 ids / matches 白名单收窄。',
      control: { type: 'select' },
      options: ['未声明', 'ids + matches 白名单'],
    },
  },
  render: renderSenderValidation,
  parameters: storySource(senderValidationSource),
};
