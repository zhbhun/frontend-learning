import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createGroup,
  type GroupInstance,
  type GroupSnapshot,
} from './example';

interface GroupArgs {
  /** Group 在舞台上的水平位置。 */
  groupX: number;
  /** Group 在舞台上的竖直位置。 */
  groupY: number;
  /** Group 的旋转角度（度）。 */
  groupRotation: number;
}

const renderInteractive = canvasStory({
  create: createGroup,
  apply(instance: GroupInstance, args: GroupArgs) {
    instance.update(args);
  },
  readout(snapshot: GroupSnapshot) {
    return [
      ['组 变换', `(${snapshot.groupX}, ${snapshot.groupY}) @ ${snapshot.groupRotation}°`],
      ['圆 本地坐标', `(${snapshot.circleLocalX}, ${snapshot.circleLocalY})`],
      ['圆 绝对坐标', `(${snapshot.circleAbsX}, ${snapshot.circleAbsY})`],
    ];
  },
});

const meta = {
  id: 'group',
  title: '变换与组织/分组',
  tags: ['!dev'],
  args: {
    groupX: 180,
    groupY: 160,
    groupRotation: 0,
  },
  argTypes: {
    groupX: {
      name: '组 x',
      description:
        'Group 在舞台上的水平位置。子节点随之整体平移，本地坐标不变。',
      control: { type: 'range', min: 40, max: 520, step: 2 },
    },
    groupY: {
      name: '组 y',
      description: 'Group 在舞台上的竖直位置。',
      control: { type: 'range', min: 40, max: 340, step: 2 },
    },
    groupRotation: {
      name: '组 rotation',
      description:
        'Group 的旋转角度（度）。整条臂绕原点转动，末端圆沿虚线弧滑动。',
      control: { type: 'range', min: 0, max: 360, step: 1 },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<GroupArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
