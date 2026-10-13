import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import interactivitySource from './interactivity.ts?raw';
import {
  createInteractivity,
  type InteractivityInstance,
  type InteractivitySnapshot,
} from './interactivity';

interface InteractivityArgs {
  progress: number;
  seekMode: 'full' | 'segment';
  segStart: number;
  segEnd: number;
}

const renderInteractivity = canvasStory({
  create: createInteractivity,
  apply(instance: InteractivityInstance, args: InteractivityArgs) {
    instance.update(args);
  },
  captions: ['拖动右侧滚动条模拟页面滚动'],
  readout(snapshot: InteractivitySnapshot) {
    return [
      ['输入', `${snapshot.progress}%`],
      ['映射区间', `${snapshot.rangeStart} – ${snapshot.rangeEnd}`],
      ['映射帧', snapshot.mappedFrame],
      ['当前帧', snapshot.frame],
    ];
  },
});

const meta = {
  id: 'interactivity',
  title: '交互与生态/交互式动画',
  tags: ['!dev'],
  args: {
    progress: 30,
    seekMode: 'full',
    segStart: 20,
    segEnd: 80,
  },
  argTypes: {
    progress: {
      name: '滚动进度',
      description:
        '外部输入归一化后的百分比（0–100）：映射公式 frame = 比例 × 区间帧数。与画面内自制滚动条写同一个进度状态。',
      control: {
        type: 'range',
        min: 0,
        max: 100,
        step: 1,
      },
    },
    seekMode: {
      name: '映射模式',
      description:
        '全片 seek：比例映射 [0, 120]；segment 内 seek：先 playSegments 激活区间，比例映射到 [起点, 终点]，帧号按段内相对帧解释。',
      options: ['full', 'segment'],
      control: {
        type: 'select',
        labels: {
          full: '全片 seek',
          segment: 'segment 内 seek',
        },
      },
    },
    segStart: {
      name: 'segment 起点',
      description:
        'playSegments 的 start（绝对帧），仅 segment 内 seek 模式生效；拖过终点时按二者中较小值生效，长度不足 1 帧按 1 帧处理。',
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
        'playSegments 的 end（绝对帧），仅 segment 内 seek 模式生效；拖过起点时按二者中较大值生效。',
      control: {
        type: 'range',
        min: 0,
        max: 120,
        step: 1,
      },
    },
  },
  render: renderInteractivity,
  parameters: storySource(interactivitySource),
} satisfies Meta<InteractivityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
