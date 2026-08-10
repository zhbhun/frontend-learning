import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createMotionAndRobot,
  type MotionRobotInstance,
  type MotionRobotSnapshot,
  type RobotAction,
} from './example';

interface MotionRobotArgs {
  progress: number;
  action: RobotAction;
  fps: number;
  autoRotate: boolean;
}

const renderInteractive = canvasStory({
  create: createMotionAndRobot,
  apply(instance: MotionRobotInstance, args: MotionRobotArgs) {
    instance.update(args);
  },
  readout(snapshot: MotionRobotSnapshot) {
    return [
      ['运动进度', snapshot.progress],
      ['朝向', snapshot.rotation],
      ['当前帧', snapshot.frame],
      ['动作', snapshot.action],
    ];
  },
});

const meta = {
  id: 'motion-and-robot',
  title: '状态与动画/运动路径与精灵帧',
  tags: ['!dev'],
  args: {
    progress: 50,
    action: 'walk',
    fps: 12,
    autoRotate: true,
  },
  argTypes: {
    progress: {
      name: '沿路径位置',
      description:
        'Robot 在路径上的位置（百分比），对应 motion: { type: "percent", value }。',
      control: {
        type: 'range',
        min: 0,
        max: 100,
        step: 1,
      },
    },
    action: {
      name: '精灵动作',
      description:
        'walk 循环播放行走帧、idle 停在静止帧；切换会重建 Robot 的动作定时器。',
      control: {
        type: 'inline-radio',
      },
      options: ['walk', 'idle'],
    },
    fps: {
      name: '帧率（FPS）',
      description: 'Robot 行走帧的播放速率，对应 IRobotAttrData.FPS。',
      control: {
        type: 'range',
        min: 4,
        max: 24,
        step: 1,
      },
    },
    autoRotate: {
      name: '朝向跟随路径',
      description:
        '开启后 motionRotation 自动转向路径切线；关闭则 Robot 保持竖直、朝向归 0。',
      control: {
        type: 'boolean',
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<MotionRobotArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
