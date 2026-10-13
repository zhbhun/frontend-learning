import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import kanbanRankSource from './kanban-rank.ts?raw';
import arrayMoveSource from './array-move.ts?raw';
import {
  createKanbanRank,
  type KanbanInstance,
  type KanbanSnapshot,
  type DragActionA,
  type DragActionB,
} from './kanban-rank';
import {
  createArrayMove,
  type ArrayMoveInstance,
  type ArrayMoveSnapshot,
  type MoveScenario,
} from './array-move';

/** 全部范例的控件集合;每个 story 只取自己需要的字段。 */
interface DataModelingArgs {
  actionA?: DragActionA;
  actionB?: DragActionB;
  scenario?: MoveScenario;
}

const ACTION_A_LABELS: Record<DragActionA, string> = {
  none: '不操作',
  'dev-to-end': '开发 → 待办末尾',
  'test-between': '测试 → 设计与开发之间',
  'dev-to-done': '开发 → 已完成末尾',
};

const ACTION_B_LABELS: Record<DragActionB, string> = {
  none: '不操作',
  'design-to-end': '设计 → 待办末尾',
  'test-to-front': '测试 → 待办最前',
  'test-to-done': '测试 → 已完成末尾',
};

const SCENARIO_LABELS: Record<MoveScenario, string> = {
  'same-card': '两端同时移动同一张卡',
  'different-card': '两端把不同卡移到同一位置',
};

const renderKanbanRank = canvasStory({
  create: createKanbanRank,
  apply(instance: KanbanInstance, args: DataModelingArgs) {
    instance.update({
      actionA: args.actionA ?? 'dev-to-end',
      actionB: args.actionB ?? 'design-to-end',
    });
  },
  readout(snapshot: KanbanSnapshot) {
    return [
      ['A 侧待办顺序', snapshot.orderA],
      ['B 侧待办顺序', snapshot.orderB],
      ['两副本', snapshot.converged],
      ['同 rank 冲突', snapshot.conflict],
    ];
  },
  captions: ['副本 A', '副本 B'],
});

const renderArrayMove = canvasStory({
  create: createArrayMove,
  apply(instance: ArrayMoveInstance, args: DataModelingArgs) {
    instance.update({
      scenario: args.scenario ?? 'same-card',
    });
  },
  readout(snapshot: ArrayMoveSnapshot) {
    return [
      ['A 侧顺序', snapshot.sequenceA],
      ['B 侧顺序', snapshot.sequenceB],
      ['两副本', snapshot.converged],
      ['重复卡片', snapshot.duplicates],
    ];
  },
});

const meta = {
  id: 'data-modeling',
  title: '进阶与原理/协同数据建模',
  tags: ['!dev'],
} satisfies Meta<DataModelingArgs>;

export default meta;

type Story = StoryObj<DataModelingArgs>;

export const KanbanRank: Story = {
  name: 'rank 键与并发拖拽',
  args: {
    actionA: 'dev-to-end',
    actionB: 'design-to-end',
  },
  argTypes: {
    actionA: {
      name: '客户端 A 拖拽',
      description: 'A 副本离线执行的拖拽;rank 由 A 自己的视图算出。',
      control: {
        type: 'select',
        labels: ACTION_A_LABELS,
      },
      options: ['none', 'dev-to-end', 'test-between', 'dev-to-done'],
    },
    actionB: {
      name: '客户端 B 拖拽',
      description: 'B 副本离线执行的拖拽;选「待办末尾」会与 A 的默认动作撞出同一个 rank。',
      control: {
        type: 'select',
        labels: ACTION_B_LABELS,
      },
      options: ['none', 'design-to-end', 'test-to-front', 'test-to-done'],
    },
  },
  render: renderKanbanRank,
  parameters: storySource(kanbanRankSource),
};

export const ArrayMoveConflict: Story = {
  name: 'Y.Array 移动的并发行为',
  args: {
    scenario: 'same-card',
  },
  argTypes: {
    scenario: {
      name: '并发场景',
      description: '两副本各自离线移动,再互换更新。',
      control: {
        type: 'select',
        labels: SCENARIO_LABELS,
      },
      options: ['same-card', 'different-card'],
    },
  },
  render: renderArrayMove,
  parameters: storySource(arrayMoveSource),
};
