import type { Meta, StoryObj } from '@storybook/html-vite';

import { storySource } from '../../assets/story-source.js';
import omniboxSessionSource from './omnibox-session.ts?raw';
import suggestionMarkupSource from './suggestion-markup.ts?raw';
import {
  createOmniboxSession,
  type OmniboxSessionInstance,
  type OpenMode,
} from './omnibox-session';
import {
  createSuggestionMarkup,
  type SuggestionExampleKey,
  type SuggestionMarkupInstance,
} from './suggestion-markup';

// 把 DOM 范例实例接到 Storybook 渲染上：实例只创建一次，后续参数变化只调用
// apply；离开当前 Docs 页（节点被移除）时调用实例的 dispose。
function domStory<
  Args,
  T extends { element: HTMLElement; dispose(): void },
>(options: { create: () => T; apply: (instance: T, args: Args) => void }) {
  let instance: T | undefined;
  return (args: Args): HTMLElement => {
    let current = instance;
    if (!current) {
      current = options.create();
      instance = current;
      const created = current;
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

interface OmniboxSessionArgs {
  disposition: string;
}

interface SuggestionMarkupArgs {
  example: string;
}

const OPEN_MODE_BY_LABEL: Record<string, OpenMode> = {
  'currentTab · 当前标签页': 'currentTab',
  'newForegroundTab · 新前台标签页': 'newForegroundTab',
  'newBackgroundTab · 新后台标签页': 'newBackgroundTab',
};

const EXAMPLE_BY_LABEL: Record<string, SuggestionExampleKey> = {
  纯文本: 'plain',
  'match 命中标记': 'match',
  'url 与 dim': 'url-dim',
  标记嵌套: 'nested',
  '未转义的用户输入': 'unescaped',
  '转义后拼接': 'escaped',
};

const renderInputSession = domStory<OmniboxSessionArgs, OmniboxSessionInstance>({
  create: createOmniboxSession,
  apply(instance: OmniboxSessionInstance, args: OmniboxSessionArgs) {
    instance.setOpenMode(OPEN_MODE_BY_LABEL[args.disposition]);
  },
});

const renderSuggestionMarkup = domStory<
  SuggestionMarkupArgs,
  SuggestionMarkupInstance
>({
  create: createSuggestionMarkup,
  apply(instance: SuggestionMarkupInstance, args: SuggestionMarkupArgs) {
    instance.update(EXAMPLE_BY_LABEL[args.example]);
  },
});

const meta = {
  id: 'omnibox',
  title: '浏览器界面/地址栏建议',
  tags: ['!dev'],
} satisfies Meta;

export default meta;

export const InputSession: StoryObj<OmniboxSessionArgs> = {
  args: {
    disposition: 'currentTab · 当前标签页',
  },
  argTypes: {
    disposition: {
      name: 'disposition',
      description:
        '模拟 onInputEntered 收到的 disposition，决定示例用 tabs.update 还是 tabs.create 打开；真实 Chrome 由激活手势决定。',
      control: { type: 'select' },
      options: Object.keys(OPEN_MODE_BY_LABEL),
    },
  },
  render: renderInputSession,
  parameters: storySource(omniboxSessionSource),
};

export const SuggestionMarkup: StoryObj<SuggestionMarkupArgs> = {
  args: {
    example: 'match 命中标记',
  },
  argTypes: {
    example: {
      name: '示例 description',
      description:
        '切换 suggest([...]) 传出的 description 字符串，下拉与原始字符串同步重绘。',
      control: { type: 'select' },
      options: Object.keys(EXAMPLE_BY_LABEL),
    },
  },
  render: renderSuggestionMarkup,
  parameters: storySource(suggestionMarkupSource),
};
