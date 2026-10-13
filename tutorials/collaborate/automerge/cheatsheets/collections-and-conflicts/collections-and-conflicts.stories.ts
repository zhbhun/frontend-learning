import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import {
  SCENARIO_OPTIONS,
  createConflictLab,
  type LabArgsView,
  type LabInstance,
  type LabSnapshot,
} from './concurrent-conflicts';
import {
  IDENTITY_ACTION_OPTIONS,
  createIdentityDemo,
  type IdentityArgsView,
  type IdentityInstance,
  type IdentitySnapshot,
} from './object-identity';
import conflictSource from './concurrent-conflicts.ts?raw';
import identitySource from './object-identity.ts?raw';

/**
 * 每个故事独立的 canvasStory 闭包：同一页上多个 Canvas 各自持有舞台，
 * 互不串位。场景切换与文本输入都通过 args 重新驱动实例重算。
 */
function labRenderer() {
  return canvasStory({
    create: createConflictLab,
    apply(instance: LabInstance, args: LabArgsView) {
      instance.update(args);
    },
    readout(snapshot: LabSnapshot) {
      return [
        ['合并后读到', snapshot.mergedShort],
        [
          '冲突值',
          snapshot.conflicts.length > 0
            ? `${snapshot.conflicts.length} 个候选值`
            : '无',
        ],
        ['双向合并一致', snapshot.converged ? '是' : '否'],
      ];
    },
  });
}

const identityRenderer = canvasStory({
  create: createIdentityDemo,
  apply(instance: IdentityInstance, args: IdentityArgsView) {
    instance.update(args);
  },
  readout(snapshot: IdentitySnapshot) {
    const shortId = (id: string) => (id.length > 18 ? `${id.slice(0, 17)}…` : id);
    return [
      ['first ObjID', shortId(snapshot.firstId)],
      ['second ObjID', shortId(snapshot.secondId)],
      [
        '同一对象',
        snapshot.sameObject === null
          ? '无法赋值'
          : snapshot.sameObject
            ? '是'
            : '否（两次拷贝）',
      ],
    ];
  },
});

interface CourseArgs extends LabArgsView, IdentityArgsView {}

const meta = {
  id: 'collections-and-conflicts',
  title: '核心基础/集合类型与冲突',
  tags: ['!dev'],
  args: {
    scenario: SCENARIO_OPTIONS[0],
    aliceValue: '来自 A 的值',
    bobValue: '来自 B 的值',
    action: IDENTITY_ACTION_OPTIONS[0],
  },
  argTypes: {
    scenario: {
      name: '并发场景',
      description:
        '两个副本从同一状态分叉后执行的并发操作：并发赋值、同位置插入、改写与删除、整体替换。',
      control: { type: 'select' },
      options: SCENARIO_OPTIONS,
    },
    aliceValue: {
      name: '副本 aaaa 写入',
      description: '副本 aaaa（冲突键形如 2@aaaa）写入的内容。',
      control: { type: 'text' },
    },
    bobValue: {
      name: '副本 bbbb 写入',
      description: '副本 bbbb（冲突键形如 2@bbbb）写入的内容。',
      control: { type: 'text' },
    },
    action: {
      name: '身份操作',
      description: '切换演示对象身份规则的场景：重复拷贝或文档内移动。',
      control: { type: 'select' },
      options: IDENTITY_ACTION_OPTIONS,
    },
  },
  render: labRenderer(),
} satisfies Meta<CourseArgs>;

export default meta;

type Story = StoryObj<CourseArgs>;

export const MapConflict: Story = {
  name: 'map 并发赋值',
  args: { scenario: SCENARIO_OPTIONS[0] },
  render: labRenderer(),
  parameters: storySource(conflictSource),
};

export const ListInsert: Story = {
  name: 'list 同位置插入',
  args: { scenario: SCENARIO_OPTIONS[1] },
  render: labRenderer(),
  parameters: storySource(conflictSource),
};

export const ListOverwrite: Story = {
  name: 'list 改写与删除',
  args: { scenario: SCENARIO_OPTIONS[2] },
  render: labRenderer(),
  parameters: storySource(conflictSource),
};

export const IdentityDemo: Story = {
  name: '对象身份规则',
  args: { action: IDENTITY_ACTION_OPTIONS[0] },
  render: identityRenderer,
  parameters: storySource(identitySource),
};
