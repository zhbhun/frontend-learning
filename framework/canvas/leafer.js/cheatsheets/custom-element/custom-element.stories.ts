import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createBadgeScene,
  type BadgeInstance,
  type BadgeSnapshot,
} from './example';

// 范例：注册自定义元素 StarBadge，调整 score 观察星星增减与读数同步。
interface BadgeArgs {
  score: number;
}

const renderBadge = canvasStory({
  create: createBadgeScene,
  apply(instance: BadgeInstance, args: BadgeArgs) {
    instance.update(args);
  },
  readout(snapshot: BadgeSnapshot) {
    return [
      ['注册标识 __tag', snapshot.tag],
      ['自定义属性 score', snapshot.score],
      ['子星数', snapshot.starCount],
      ['数据层 StarBadgeData', snapshot.customData ? '✓' : '✗'],
      ['tag 已注册', snapshot.registered ? '✓' : '✗'],
    ];
  },
});

const meta = {
  id: 'custom-element',
  title: '进阶与工程/自定义元素',
  tags: ['!dev'],
  args: {
    score: 3,
  },
  argTypes: {
    score: {
      name: '自定义属性 score',
      description:
        'StarBadge 自定义属性的值（0–5）。赋值会触发数据层 setScore 钩子，自动重建星星子节点；同时 readout 的注册标识、子星数、数据层类型同步刷新。',
      control: {
        type: 'range',
        min: 0,
        max: 5,
        step: 1,
      },
    },
  },
  render: renderBadge,
  parameters: storySource(exampleSource),
} satisfies Meta<BadgeArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
