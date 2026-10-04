import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import optionsModeSource from './options-mode.ts?raw';
import overrideOwnershipSource from './override-ownership.ts?raw';
import {
  createOptionsModeExample,
  type OptionsDeclaration,
  type OptionsModeInstance,
  type OptionsModeOptions,
  type OptionsModeSnapshot,
  type OptionsTrigger,
} from './options-mode';
import {
  createOverrideOwnershipExample,
  type OverrideOwnershipInstance,
  type OverrideOwnershipOptions,
  type OverrideOwnershipSnapshot,
  type UserChoice,
} from './override-ownership';

interface OverrideOwnershipArgs {
  extensionA: boolean;
  extensionB: boolean;
  userChoice: string;
}

interface OptionsModeArgs {
  declaration: string;
  trigger: string;
}

const USER_CHOICE_BY_LABEL: Record<string, UserChoice> = {
  '保留 A 的页面': 'keepA',
  '换成 B 的页面': 'useB',
};

const DECLARATION_BY_LABEL: Record<string, OptionsDeclaration> = {
  'options_page（整页）': 'options_page',
  'options_ui（内嵌，默认）': 'embedded',
  'options_ui（open_in_tab: true）': 'open_in_tab',
};

const TRIGGER_BY_LABEL: Record<string, OptionsTrigger> = {
  'chrome://extensions 详情页': 'details',
  '工具栏图标右键菜单': 'iconMenu',
  '调用 runtime.openOptionsPage()': 'openOptionsPage',
};

const renderOverrideOwnership = canvasStory({
  create: createOverrideOwnershipExample,
  apply(instance: OverrideOwnershipInstance, args: OverrideOwnershipArgs) {
    const options: OverrideOwnershipOptions = {
      extensionA: args.extensionA,
      extensionB: args.extensionB,
      userChoice: USER_CHOICE_BY_LABEL[args.userChoice],
    };
    instance.update(options);
  },
  readout(snapshot: OverrideOwnershipSnapshot) {
    return [
      ['新标签页显示', snapshot.ntpDisplay],
      ['扩展 A 的覆盖', snapshot.statusA],
      ['扩展 B 的覆盖', snapshot.statusB],
      ['安装 B 时的提示', snapshot.installPrompt],
    ];
  },
  captions: ['覆盖归属演算：两个扩展都想接管 chrome://newtab', '安装选择对话框只出现在两个扩展都装着时'],
});

const renderOptionsMode = canvasStory({
  create: createOptionsModeExample,
  apply(instance: OptionsModeInstance, args: OptionsModeArgs) {
    const options: OptionsModeOptions = {
      declaration: DECLARATION_BY_LABEL[args.declaration],
      trigger: TRIGGER_BY_LABEL[args.trigger],
    };
    instance.update(options);
  },
  readout(snapshot: OptionsModeSnapshot) {
    return [
      ['选项页打开位置', snapshot.openLocation],
      ['页面容器', snapshot.container],
      ['chrome.tabs', snapshot.tabsApi],
      ['消息 sender.tab', snapshot.senderTab],
    ];
  },
  captions: ['选项页模式演算：三个打开入口，一份声明决定去向', '左栏为 manifest 声明与触发代码'],
});

const meta = {
  id: 'override-options',
  title: '浏览器界面/替换页面与选项页',
  tags: ['!dev'],
} satisfies Meta;

export default meta;

export const OverrideOwnership: StoryObj<OverrideOwnershipArgs> = {
  args: {
    extensionA: true,
    extensionB: true,
    userChoice: '保留 A 的页面',
  },
  argTypes: {
    extensionA: {
      name: '扩展 A 已安装（先装）',
      description: '扩展 A 声明 chrome_url_overrides.newtab，指向 ntp-a.html。',
      control: { type: 'boolean' },
    },
    extensionB: {
      name: '扩展 B 已安装（后装）',
      description: '扩展 B 同样声明 chrome_url_overrides.newtab，指向 ntp-b.html。',
      control: { type: 'boolean' },
    },
    userChoice: {
      name: '安装 B 时用户的选择',
      description:
        '两个扩展都在时 Chrome 弹出选择对话框；只装一个扩展时该选择不起作用。',
      control: { type: 'select' },
      options: ['保留 A 的页面', '换成 B 的页面'],
    },
  },
  render: renderOverrideOwnership,
  parameters: storySource(overrideOwnershipSource),
};

export const OptionsMode: StoryObj<OptionsModeArgs> = {
  args: {
    declaration: 'options_ui（内嵌，默认）',
    trigger: '调用 runtime.openOptionsPage()',
  },
  argTypes: {
    declaration: {
      name: 'manifest 声明方式',
      description:
        'options_page 与 open_in_tab: true 开整页；options_ui 默认内嵌在 chrome://extensions 详情页。',
      control: { type: 'select' },
      options: [
        'options_page（整页）',
        'options_ui（内嵌，默认）',
        'options_ui（open_in_tab: true）',
      ],
    },
    trigger: {
      name: '打开入口',
      description:
        '详情页入口、图标右键菜单与 openOptionsPage() 都通向声明决定的位置。',
      control: { type: 'select' },
      options: [
        'chrome://extensions 详情页',
        '工具栏图标右键菜单',
        '调用 runtime.openOptionsPage()',
      ],
    },
  },
  render: renderOptionsMode,
  parameters: storySource(optionsModeSource),
};
