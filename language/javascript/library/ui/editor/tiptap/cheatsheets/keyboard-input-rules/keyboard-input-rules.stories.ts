import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import './demo.css';
import {
  createInputRulesDemo,
  type InputRulesArgs,
  type InputRulesInstance,
  type InputRulesSnapshot,
} from './input-rules';
import inputRulesSource from './input-rules.ts?raw';
import {
  createKeyboardShortcutsDemo,
  type KeyboardShortcutsArgs,
  type KeyboardShortcutsInstance,
  type KeyboardShortcutsSnapshot,
} from './keyboard-shortcuts';
import keyboardShortcutsSource from './keyboard-shortcuts.ts?raw';
import {
  createPasteRulesDemo,
  type PasteRulesArgs,
  type PasteRulesInstance,
  type PasteRulesSnapshot,
} from './paste-rules';
import pasteRulesSource from './paste-rules.ts?raw';

const keyboardShortcutsRender = canvasStory({
  create: createKeyboardShortcutsDemo,
  apply(instance: KeyboardShortcutsInstance, args: KeyboardShortcutsArgs) {
    instance.update(args);
  },
  readout(snapshot: KeyboardShortcutsSnapshot) {
    return [
      ['最近触发', snapshot.log],
      ['getHTML', snapshot.html],
    ];
  },
});

const inputRulesRender = canvasStory({
  create: createInputRulesDemo,
  apply(instance: InputRulesInstance, args: InputRulesArgs) {
    instance.update(args);
  },
  readout(snapshot: InputRulesSnapshot) {
    return [
      ['getHTML', snapshot.html],
      ['上次操作', snapshot.lastAction],
    ];
  },
});

const pasteRulesRender = canvasStory({
  create: createPasteRulesDemo,
  apply(instance: PasteRulesInstance, args: PasteRulesArgs) {
    instance.update(args);
  },
  readout(snapshot: PasteRulesSnapshot) {
    return [
      ['getHTML', snapshot.html],
      ['上次操作', snapshot.lastAction],
    ];
  },
});

const meta = {
  id: 'keyboard-input-rules',
  title: '原理与自定义/快捷键与输入规则',
  tags: ['!dev'],
} satisfies Meta;

export default meta;

export const KeyboardShortcuts = {
  name: '快捷键的绑定与放行',
  args: {
    preset: 'add',
  },
  argTypes: {
    preset: {
      name: '快捷键预设',
      description: '新增绑定、覆盖内置 Mod-b、返回 false 放行三种写法',
      control: {
        type: 'select',
        labels: {
          add: '新增绑定 Mod-Shift-9',
          override: '覆盖内置 Mod-b（返回 true）',
          passthrough: '放行 Mod-b（返回 false）',
        },
      },
      options: ['add', 'override', 'passthrough'],
    },
  },
  render: keyboardShortcutsRender,
  parameters: storySource(keyboardShortcutsSource),
} satisfies StoryObj<KeyboardShortcutsArgs>;

export const InputRules = {
  name: '输入规则的触发',
  args: {
    preset: 'marks',
  },
  argTypes: {
    preset: {
      name: '规则预设',
      description: '内置 mark 规则、内置块级规则与自定义 helper 三组',
      control: {
        type: 'select',
        labels: {
          marks: '内置 mark 规则（**、*、~~、`）',
          blocks: '内置块级规则（#、>、-、1.）',
          custom: '自定义 helper（==、->、===）',
        },
      },
      options: ['marks', 'blocks', 'custom'],
    },
  },
  render: inputRulesRender,
  parameters: storySource(inputRulesSource),
} satisfies StoryObj<InputRulesArgs>;

export const PasteRules = {
  name: '粘贴规则的触发',
  args: {
    preset: 'markdown',
  },
  argTypes: {
    preset: {
      name: '规则预设',
      description: '内置 markdown 粘贴、URL 自动链接与自定义高亮',
      control: {
        type: 'select',
        labels: {
          markdown: '内置 mark 粘贴规则',
          url: 'URL 自动链接（Link）',
          custom: '自定义 ==重点== 高亮',
        },
      },
      options: ['markdown', 'url', 'custom'],
    },
  },
  render: pasteRulesRender,
  parameters: storySource(pasteRulesSource),
} satisfies StoryObj<PasteRulesArgs>;
