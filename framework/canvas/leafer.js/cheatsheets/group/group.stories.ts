import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createGroupDemo,
  type GroupInstance,
  type GroupSnapshot,
  type GroupOptions,
} from './example';

interface GroupArgs extends GroupOptions {}

const renderInteractive = canvasStory({
  create: createGroupDemo,
  apply(instance: GroupInstance, args: GroupArgs) {
    instance.update(args);
  },
  readout(snapshot: GroupSnapshot) {
    return [
      ['选中数量', snapshot.selectedCount],
      ['首个选中类型', snapshot.selectedTag],
      ['tree 直接子节点', snapshot.treeChildCount],
      ['组内元素数', snapshot.groupChildCount],
    ];
  },
});

const meta = {
  id: 'group',
  title: '编辑器/编组与对齐/框选、打组与解组',
  tags: ['!dev'],
  args: {
    action: 'boxSelect',
  },
  argTypes: {
    action: {
      name: '操作',
      description:
        '在当前场景上执行：框选全部（模拟拖框覆盖区域）、打组 editor.group()、解组 editor.ungroup()、还原为 4 个独立元素。',
      control: {
        type: 'select',
      },
      options: ['boxSelect', 'group', 'ungroup', 'reset'],
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<GroupArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
