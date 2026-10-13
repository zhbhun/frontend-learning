import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import framesSegmentsSource from './frames-segments.ts?raw';
import {
  createFramesSegments,
  type FramesSegmentsInstance,
  type FramesSegmentsSnapshot,
} from './frames-segments';

interface FramesSegmentsArgs {
  segStart: number;
  segEnd: number;
  forceFlag: boolean;
  loop: boolean;
  progress: number;
}

const renderFramesSegments = canvasStory({
  create: createFramesSegments,
  apply(instance: FramesSegmentsInstance, args: FramesSegmentsArgs) {
    instance.update(args);
  },
  readout(snapshot: FramesSegmentsSnapshot) {
    return [
      ['当前帧（段内）', snapshot.frame],
      ['segment 区间', `${snapshot.segStart} – ${snapshot.segEnd}`],
      ['totalFrames', snapshot.totalFrames],
      ['播放状态', snapshot.status],
      ['段内循环', `${snapshot.loops} 轮`],
    ];
  },
});

const meta = {
  id: 'frames-segments',
  title: 'lottie-web 核心/帧与片段',
  tags: ['!dev'],
  args: {
    segStart: 0,
    segEnd: 120,
    forceFlag: true,
    loop: true,
    progress: 0,
  },
  argTypes: {
    segStart: {
      name: 'segment 起点',
      description:
        'playSegments 的 start：新区间起始帧（0–120）；拖过终点时按二者中较小值生效。',
      control: {
        type: 'range',
        min: 0,
        max: 120,
        step: 1,
      },
    },
    segEnd: {
      name: 'segment 终点',
      description:
        'playSegments 的 end：新区间结束帧（0–120）；拖过起点时按二者中较大值生效。',
      control: {
        type: 'range',
        min: 0,
        max: 120,
        step: 1,
      },
    },
    forceFlag: {
      name: '立即生效（forceFlag）',
      description:
        'playSegments 的第二参数：开（true）立即跳到新段起点；关（省略）新段入队，当前循环走完才切换。',
      control: { type: 'boolean' },
    },
    loop: {
      name: '循环',
      description:
        'setLoop 的入参：开时帧指针在 segment 内反复回卷；关时播到段尾触发 complete 并暂停。',
      control: { type: 'boolean' },
    },
    progress: {
      name: '进度（帧）',
      description:
        'goToAndStop 的原始入参（isFrame=true）：segment 激活时按段内相对帧解释，落点 = 入参 + firstFrame；跳转后动画暂停。',
      control: {
        type: 'range',
        min: 0,
        max: 120,
        step: 1,
      },
    },
  },
  render: renderFramesSegments,
  parameters: storySource(framesSegmentsSource),
} satisfies Meta<FramesSegmentsArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const FramesSegments: Story = {};
