import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import {
  createChainTransactionDemo,
  type ChainTransactionInstance,
  type ChainTransactionSnapshot,
} from './chain-transaction';
import chainTransactionSource from './chain-transaction.ts?raw';
import './demo.css';
import {
  createExtensionCommandsDemo,
  type ExtensionCommandsArgs,
  type ExtensionCommandsInstance,
  type ExtensionCommandsSnapshot,
} from './extension-commands';
import extensionCommandsSource from './extension-commands.ts?raw';
import {
  createInsertContentDemo,
  type InsertContentArgs,
  type InsertContentInstance,
  type InsertContentSnapshot,
} from './insert-content';
import insertContentSource from './insert-content.ts?raw';

const chainTransactionRender = canvasStory({
  create: createChainTransactionDemo,
  apply(instance: ChainTransactionInstance) {
    instance.update();
  },
  readout(snapshot: ChainTransactionSnapshot) {
    return [
      ['上次操作 update 事件', `${snapshot.updateCount} 次`],
      ['加粗', snapshot.boldActive ? '是' : '否'],
      ['高亮', snapshot.highlightActive ? '是' : '否'],
    ];
  },
});

const insertContentRender = canvasStory({
  create: createInsertContentDemo,
  apply(instance: InsertContentInstance, args: InsertContentArgs) {
    instance.update(args);
  },
  readout(snapshot: InsertContentSnapshot) {
    return [
      ['顶层节点', snapshot.nodeTypes],
      ['光标 from–to', snapshot.cursor],
    ];
  },
});

const extensionCommandsRender = canvasStory({
  create: createExtensionCommandsDemo,
  apply(instance: ExtensionCommandsInstance, args: ExtensionCommandsArgs) {
    instance.update(args);
  },
  readout(snapshot: ExtensionCommandsSnapshot) {
    return [
      ['加粗', snapshot.boldActive ? '是' : '否'],
      ['标题', snapshot.headingActive ? '是' : '否'],
      ['引用', snapshot.blockquoteActive ? '是' : '否'],
      ['列表', snapshot.bulletListActive ? '是' : '否'],
      ['can().toggleBold()', snapshot.canToggleBold ? 'true' : 'false'],
      [
        '上次 run() 返回',
        snapshot.lastRunResult === null
          ? '—'
          : snapshot.lastRunResult
            ? 'true'
            : 'false',
      ],
    ];
  },
});

const meta = {
  id: 'commands',
  title: '内容与命令/命令',
  tags: ['!dev'],
} satisfies Meta;

export default meta;

export const ChainTransaction = {
  name: '命令链与事务',
  render: chainTransactionRender,
  parameters: storySource(chainTransactionSource),
} satisfies StoryObj;

export const InsertContent = {
  name: '插入内容',
  args: {
    preset: 'block-json',
    position: 'empty-paragraph',
    updateSelection: true,
  },
  argTypes: {
    preset: {
      name: '插入内容',
      description: '纯文本 / 行内 HTML / 块级 JSON 节点数组',
      control: {
        type: 'select',
        labels: {
          text: '纯文本',
          'inline-html': 'HTML 字符串',
          'block-json': 'JSON 节点数组',
        },
      },
      options: ['text', 'inline-html', 'block-json'],
    },
    position: {
      name: '插入位置',
      description: '当前选区（段中）/ 空段落 / 文档末尾（走 insertContentAt）',
      control: {
        type: 'select',
        labels: {
          selection: '当前选区（段中）',
          'empty-paragraph': '空段落',
          'doc-end': '文档末尾',
        },
      },
      options: ['selection', 'empty-paragraph', 'doc-end'],
    },
    updateSelection: {
      name: 'updateSelection',
      description: '默认 true：插入后光标移到插入内容末尾',
      control: {
        type: 'boolean',
      },
    },
  },
  render: insertContentRender,
  parameters: storySource(insertContentSource),
} satisfies StoryObj<InsertContentArgs>;

export const ExtensionCommands = {
  name: '扩展命令',
  args: {
    position: 'paragraph',
  },
  argTypes: {
    position: {
      name: '光标位置',
      description: '切换后重置内容，并选中对应块内的文字',
      control: {
        type: 'select',
        labels: {
          heading: '标题',
          paragraph: '普通段落',
          blockquote: '引用块',
          'list-item': '列表项',
          'code-block': '代码块',
        },
      },
      options: ['heading', 'paragraph', 'blockquote', 'list-item', 'code-block'],
    },
  },
  render: extensionCommandsRender,
  parameters: storySource(extensionCommandsSource),
} satisfies StoryObj<ExtensionCommandsArgs>;
