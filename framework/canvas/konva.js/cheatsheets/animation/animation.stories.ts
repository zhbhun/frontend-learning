import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createAnimationDemo,
  type AnimationInstance,
  type AnimationSnapshot,
} from './example';

interface AnimationArgs {
  /** 是否播放：true 调用 anim.start()，false 调用 anim.stop()。 */
  playing: boolean;
  /** 角速度（度/秒）：由 frame.timeDiff 换算成每帧增量，帧率无关。 */
  speed: number;
}

const renderInteractive = canvasStory({
  create: createAnimationDemo,
  apply(instance: AnimationInstance, args: AnimationArgs) {
    instance.update(args);
  },
  readout(snapshot: AnimationSnapshot) {
    return [
      ['状态', snapshot.running ? '运行中' : '已停止'],
      ['时间', `${snapshot.time} ms`],
      ['帧间隔', `${snapshot.timeDiff} ms`],
      ['帧率', `${snapshot.frameRate} fps`],
      ['角度', `${snapshot.angle}°`],
    ];
  },
});

const meta = {
  id: 'animation',
  title: '动画/帧动画',
  tags: ['!dev'],
  args: {
    playing: true,
    speed: 120,
  },
  argTypes: {
    playing: {
      name: '播放',
      description:
        '切换 Konva.Animation 的 start() / stop()。关闭后帧回调不再触发，自动重绘随之停止，读数冻结在最后一帧。',
      control: { type: 'boolean' },
    },
    speed: {
      name: '角速度',
      description:
        '运动节点每秒旋转的度数；由 frame.timeDiff 换算成每帧增量，运动速度与帧率无关。设为 0 时帧回调仍触发，但位置不变。',
      control: { type: 'range', min: 0, max: 360, step: 10 },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<AnimationArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
