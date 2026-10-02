import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import {
  createCharacterCountDemo,
  type CharacterCountArgs,
  type CharacterCountInstance,
  type CharacterCountSnapshot,
} from './character-count';
import characterCountSource from './character-count.ts?raw';
import './demo.css';
import {
  createFocusDemo,
  type FocusArgs,
  type FocusInstance,
  type FocusSnapshot,
} from './focus';
import focusSource from './focus.ts?raw';
import {
  createTrailingNodeDemo,
  type TrailingNodeArgs,
  type TrailingNodeInstance,
  type TrailingNodeSnapshot,
} from './trailing-node';
import trailingNodeSource from './trailing-node.ts?raw';
import {
  createUndoRedoDemo,
  type UndoRedoInstance,
  type UndoRedoSnapshot,
} from './undo-redo';
import undoRedoSource from './undo-redo.ts?raw';

const focusRender = canvasStory({
  create: createFocusDemo,
  apply(instance: FocusInstance, args: FocusArgs) {
    instance.update(args);
  },
  readout(snapshot: FocusSnapshot) {
    return [['挂 has-focus 的节点', snapshot.chain]];
  },
});

const characterCountRender = canvasStory({
  create: createCharacterCountDemo,
  apply(instance: CharacterCountInstance, args: CharacterCountArgs) {
    instance.update(args);
  },
  readout(snapshot: CharacterCountSnapshot) {
    return [
      ['characters()', snapshot.characters],
      ['words()', snapshot.words],
      ['最近一次操作', snapshot.note],
    ];
  },
});

const undoRedoRender = canvasStory({
  create: createUndoRedoDemo,
  apply(instance: UndoRedoInstance) {
    instance.update();
  },
  readout(snapshot: UndoRedoSnapshot) {
    return [
      ['文档文字', snapshot.text],
      ['can().undo()', String(snapshot.canUndo)],
      ['can().redo()', String(snapshot.canRedo)],
    ];
  },
});

const trailingNodeRender = canvasStory({
  create: createTrailingNodeDemo,
  apply(instance: TrailingNodeInstance, args: TrailingNodeArgs) {
    instance.update(args);
  },
  readout(snapshot: TrailingNodeSnapshot) {
    return [
      ['最后一个节点', snapshot.lastNode],
      ['doc 子节点', `${snapshot.docChildren} 个`],
    ];
  },
});

const meta = {
  id: 'behavior-extensions',
  title: '常用扩展/行为扩展',
  tags: ['!dev'],
} satisfies Meta;

export default meta;

export const Focus = {
  name: '焦点高亮',
  args: {
    mode: 'all' as FocusArgs['mode'],
  },
  argTypes: {
    mode: {
      name: 'mode',
      description: 'has-focus 挂到包含光标的哪些层级（all 为默认值）',
      control: {
        type: 'select',
        labels: {
          all: 'all（所有层级）',
          deepest: 'deepest（最内层文本块）',
          shallowest: 'shallowest（最外层节点）',
        },
      },
      options: ['all', 'deepest', 'shallowest'],
    },
  },
  render: focusRender,
  parameters: storySource(focusSource),
} satisfies StoryObj<FocusArgs>;

export const CharacterCount = {
  name: '字数与限制',
  args: {
    limit: 50,
    mode: 'textSize' as CharacterCountArgs['mode'],
  },
  argTypes: {
    limit: {
      name: 'limit',
      description: '0 表示不限（limit: null）；超过上限的输入在事务层被拦截',
      control: {
        type: 'select',
        labels: {
          0: '不限（null）',
          50: '50',
        },
      },
      options: [0, 50],
    },
    mode: {
      name: 'mode',
      description: 'textSize 按文本计（默认），nodeSize 含结构开销',
      control: {
        type: 'select',
        labels: {
          textSize: 'textSize',
          nodeSize: 'nodeSize',
        },
      },
      options: ['textSize', 'nodeSize'],
    },
  },
  render: characterCountRender,
  parameters: storySource(characterCountSource),
} satisfies StoryObj<CharacterCountArgs>;

export const UndoRedo = {
  name: '撤销分组',
  render: undoRedoRender,
  parameters: storySource(undoRedoSource),
} satisfies StoryObj;

export const TrailingNode = {
  name: '末尾补段',
  args: {
    enabled: true,
    ending: 'heading' as TrailingNodeArgs['ending'],
  },
  argTypes: {
    enabled: {
      name: 'TrailingNode',
      description: 'StarterKit 默认启用；关闭用 StarterKit.configure({ trailingNode: false })',
      control: {
        type: 'boolean',
      },
    },
    ending: {
      name: '结尾预设',
      description: '切换后重建编辑器；点进编辑区或点按钮触发补段检查',
      control: {
        type: 'select',
        labels: {
          heading: '标题结尾',
          paragraph: '段落结尾',
          table: '表格结尾',
        },
      },
      options: ['heading', 'paragraph', 'table'],
    },
  },
  render: trailingNodeRender,
  parameters: storySource(trailingNodeSource),
} satisfies StoryObj<TrailingNodeArgs>;
