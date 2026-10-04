import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import menuTreeSource from './menu-tree.ts?raw';
import shortcutActivationSource from './shortcut-activation.ts?raw';
import {
  createMenuTree,
  type MenuTreeInstance,
  type MenuTreeOptions,
  type MenuTreeSnapshot,
} from './menu-tree';
import {
  createShortcutActivation,
  type ShortcutActivationInstance,
  type ShortcutActivationOptions,
  type ShortcutActivationSnapshot,
} from './shortcut-activation';

interface MenuTreeArgs {
  clickContext: MenuTreeOptions['clickContext'];
  contexts: MenuTreeOptions['contexts'];
  type: MenuTreeOptions['type'];
  hasParent: boolean;
  title: string;
}

interface ShortcutActivationArgs {
  shortcut: string;
  platform: ShortcutActivationOptions['platform'];
  global: boolean;
  special: boolean;
  occupied: boolean;
}

const renderMenuTree = canvasStory({
  create: createMenuTree,
  apply(instance: MenuTreeInstance, args: MenuTreeArgs) {
    instance.update({
      clickContext: args.clickContext,
      contexts: args.contexts,
      type: args.type,
      hasParent: args.hasParent,
      title: args.title,
    });
  },
  readout(snapshot: MenuTreeSnapshot) {
    return [
      ['右键位置', snapshot.clickLabel],
      ['菜单项 contexts', snapshot.contextsLabel],
      ['本次是否出现', snapshot.visibleLabel],
      ['标题渲染', snapshot.titleLabel],
      ['菜单形态', snapshot.shapeLabel],
    ];
  },
  captions: ['左侧是示例页面与右键位置，右侧是那一刻弹出的右键菜单'],
});

const renderShortcutActivation = canvasStory({
  create: createShortcutActivation,
  apply(instance: ShortcutActivationInstance, args: ShortcutActivationArgs) {
    instance.update({
      shortcut: args.shortcut,
      platform: args.platform,
      global: args.global,
      special: args.special,
      occupied: args.occupied,
    });
  },
  readout(snapshot: ShortcutActivationSnapshot) {
    return [
      ['组合解析', snapshot.parseLabel],
      ['manifest 校验', snapshot.validateLabel],
      ['注册状态', snapshot.registerLabel],
      ['按下快捷键时', snapshot.dispatchLabel],
      ['作用范围', snapshot.scopeLabel],
    ];
  },
  captions: ['键盘条是 suggested_key 声明的组合，状态卡给出校验、注册与派发流水线'],
});

const meta = {
  id: 'context-menus-commands',
  title: '浏览器界面/右键菜单与快捷键',
  tags: ['!dev'],
} satisfies Meta;

export default meta;

export const MenuTree: StoryObj<MenuTreeArgs> = {
  args: {
    clickContext: 'selection',
    contexts: 'selection',
    type: 'normal',
    hasParent: false,
    title: '高亮「%s」',
  },
  argTypes: {
    clickContext: {
      name: '右键位置',
      description: '在示例页面的哪个元素上右键，对应 Chrome 判断的上下文。',
      control: { type: 'select' },
      options: ['page', 'selection', 'link', 'image'],
    },
    contexts: {
      name: '菜单项 contexts',
      description:
        'contextMenus.create 的 contexts 参数，缺省为 ["page"]；"all" 覆盖除 launcher 外的全部上下文。',
      control: { type: 'select' },
      options: ['all', 'page', 'selection', 'link', 'image'],
    },
    type: {
      name: '菜单项类型',
      description: 'create 的 type 参数：normal / checkbox / radio / separator。',
      control: { type: 'select' },
      options: ['normal', 'checkbox', 'radio', 'separator'],
    },
    hasParent: {
      name: '注册为父项的子菜单',
      description: 'create 时传 parentId，菜单项成为父菜单「高亮工具」的子级。',
      control: { type: 'boolean' },
    },
    title: {
      name: '菜单标题',
      description:
        'selection 上下文里 %s 会被替换为选中的文字；type 为 separator 时忽略标题。',
      control: { type: 'text' },
    },
  },
  render: renderMenuTree,
  parameters: storySource(menuTreeSource),
};

export const ShortcutActivation: StoryObj<ShortcutActivationArgs> = {
  args: {
    shortcut: 'Ctrl+Shift+Y',
    platform: 'windows',
    global: false,
    special: false,
    occupied: false,
  },
  argTypes: {
    shortcut: {
      name: 'suggested_key',
      description: 'manifest commands 里声明的组合键，大小写敏感。',
      control: { type: 'select' },
      options: [
        'Ctrl+Shift+Y',
        'Alt+Shift+Y',
        'Shift+Y',
        'Ctrl+Alt+Y',
        'Command+Shift+Y',
        'MacCtrl+Shift+Y',
        'Ctrl+Shift+5',
        'Ctrl+MediaPlayPause',
      ],
    },
    platform: {
      name: '平台',
      description: '同一份 suggested_key 在不同平台上的校验规则不同。',
      control: { type: 'select' },
      options: ['windows', 'mac', 'linux', 'chromeos'],
    },
    global: {
      name: 'global 命令',
      description: 'manifest 里为命令声明 "global": true 后的校验与作用范围。',
      control: { type: 'boolean' },
    },
    special: {
      name: '_execute_action',
      description: '命令是否为保留命令 _execute_action，它不派发 onCommand。',
      control: { type: 'boolean' },
    },
    occupied: {
      name: '被其他扩展占用',
      description: '另一扩展已注册同一组合时，本扩展的快捷键注册不上。',
      control: { type: 'boolean' },
    },
  },
  render: renderShortcutActivation,
  parameters: storySource(shortcutActivationSource),
};
