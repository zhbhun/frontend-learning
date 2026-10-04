import type { Meta, StoryObj } from '@storybook/html-vite';

import { storySource } from '../../assets/story-source.js';
import localeSource from './locale-resolution.ts?raw';
import messageSource from './message-substitution.ts?raw';
import staticSource from './static-substitution.ts?raw';
import {
  createLocaleResolution,
  type LocaleInstance,
  type LocaleOptions,
} from './locale-resolution';
import {
  createMessageSubstitution,
  type MessageInstance,
  type MessageOptions,
} from './message-substitution';
import {
  createStaticSubstitution,
  type StaticInstance,
  type StaticOptions,
} from './static-substitution';

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

interface LocaleArgs {
  uiLanguage: string;
  acceptLanguages: string;
  installedLocales: string[];
  defaultLocale: string;
}

interface MessageArgs {
  locale: string;
  message: string;
  substitutions: string;
  escapeLt: boolean;
}

interface StaticArgs {
  locale: string;
  key: string;
}

function toLocaleOptions(args: LocaleArgs): LocaleOptions {
  return {
    uiLanguage: args.uiLanguage as LocaleOptions['uiLanguage'],
    acceptLanguages: args.acceptLanguages,
    installedLocales: args.installedLocales as LocaleOptions['installedLocales'],
    defaultLocale: args.defaultLocale as LocaleOptions['defaultLocale'],
  };
}

function toMessageOptions(args: MessageArgs): MessageOptions {
  return {
    locale: args.locale as MessageOptions['locale'],
    message: args.message as MessageOptions['message'],
    substitutions: args.substitutions as MessageOptions['substitutions'],
    escapeLt: args.escapeLt,
  };
}

function toStaticOptions(args: StaticArgs): StaticOptions {
  return {
    locale: args.locale as StaticOptions['locale'],
    key: args.key as StaticOptions['key'],
  };
}

const renderLocale = domStory<LocaleArgs, LocaleInstance>({
  create: createLocaleResolution,
  captions: [
    '_locales 查找三步模拟：首选 locale → 剥地区补查 → default_locale',
    '界面语言取值与 getUILanguage() 的接线格式一致',
  ],
  apply(instance: LocaleInstance, args: LocaleArgs) {
    instance.update(toLocaleOptions(args));
  },
});

const renderMessage = domStory<MessageArgs, MessageInstance>({
  create: createMessageSubstitution,
  captions: [
    'getMessage 对 messages.json 的读取与 $name$ 替换（模拟）',
    '行为与 chrome.i18n API 参考一致',
  ],
  apply(instance: MessageInstance, args: MessageArgs) {
    instance.update(toMessageOptions(args));
  },
});

const renderStatic = domStory<StaticArgs, StaticInstance>({
  create: createStaticSubstitution,
  captions: [
    '__MSG_key__ 在 manifest / HTML / CSS / JS 的替换差异（模拟）',
    '消息未定义时静态位置保留 token，getMessage 返回空串',
  ],
  apply(instance: StaticInstance, args: StaticArgs) {
    instance.update(toStaticOptions(args));
  },
});

const meta = {
  id: 'i18n',
  title: '发布/国际化',
  tags: ['!dev'],
} satisfies Meta;

export default meta;

export const LocaleResolution: StoryObj<LocaleArgs> = {
  args: {
    uiLanguage: 'zh-TW',
    acceptLanguages: 'zh-CN,en-US,zh',
    installedLocales: ['en', 'zh_CN', 'ja'],
    defaultLocale: 'zh_CN',
  },
  argTypes: {
    uiLanguage: {
      name: '浏览器界面语言',
      description: '即 getUILanguage() 的返回值，决定 _locales 选哪份 messages.json。',
      control: { type: 'select' },
      options: ['zh-TW', 'zh-CN', 'en-GB', 'en-US', 'fr-FR', 'pt-BR'],
    },
    acceptLanguages: {
      name: 'accept languages 列表',
      description: '即 getAcceptLanguages() 的返回值，只作展示、不参与 _locales 解析。',
      control: { type: 'text' },
    },
    installedLocales: {
      name: '已安装的 locale 目录',
      description: '_locales 下实际存在的目录；多装未被命中的目录时 Chrome 直接忽略。',
      control: { type: 'multi-select' },
      options: ['en', 'zh', 'zh_CN', 'ja', 'pt_BR'],
    },
    defaultLocale: {
      name: 'manifest 的 default_locale',
      description: '兜底语言，指向的目录必须存在，否则 manifest 加载失败。',
      control: { type: 'select' },
      options: ['en', 'zh_CN'],
    },
  },
  render: renderLocale,
  parameters: storySource(localeSource),
};

export const MessageSubstitution: StoryObj<MessageArgs> = {
  args: {
    locale: 'zh_CN',
    message: 'invite',
    substitutions: '数组 ["Cira", "Kathy"]',
    escapeLt: false,
  },
  argTypes: {
    locale: {
      name: '当前已加载的 messages.json',
      description: '模拟浏览器界面语言解析出的那份 messages.json。',
      control: { type: 'select' },
      options: ['zh_CN', 'en'],
    },
    message: {
      name: '消息名 messageName',
      description: '对应 messages.json 的顶层键，大小写不敏感；rich 消息含 HTML 标签用于演示 escapeLt。',
      control: { type: 'select' },
      options: ['greeting', 'error', 'invite', 'site', 'rich'],
    },
    substitutions: {
      name: 'substitutions',
      description: 'getMessage 的第二个参数：单值等价于只给第一位，数组按位置绑定 $N。',
      control: { type: 'select' },
      options: ['不传', '单值 "Cira"', '数组 ["Cira", "Kathy"]'],
    },
    escapeLt: {
      name: 'options.escapeLt',
      description: 'Chrome 79+：把消息文本中的 < 转义为 &lt;，不作用于占位符内容。',
      control: { type: 'boolean' },
    },
  },
  render: renderMessage,
  parameters: storySource(messageSource),
};

export const StaticSubstitution: StoryObj<StaticArgs> = {
  args: {
    locale: 'zh_CN',
    key: 'extName',
  },
  argTypes: {
    locale: {
      name: '当前已加载的 messages.json',
      description: '模拟浏览器界面语言解析出的那份 messages.json。',
      control: { type: 'select' },
      options: ['zh_CN', 'en'],
    },
    key: {
      name: '消息名',
      description: 'extName 与 greeting 已定义；typo 未定义，用来对比静态替换与 getMessage 对缺失消息的处理差异。',
      control: { type: 'select' },
      options: ['extName', 'greeting', 'typo'],
    },
  },
  render: renderStatic,
  parameters: storySource(staticSource),
};
