import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createAnimationLab,
  type AnimationLabInstance,
  type AnimationLabOptions,
  type AnimationLabSnapshot,
} from './example';

const renderInteractive = canvasStory({
  create: createAnimationLab,
  apply(instance: AnimationLabInstance, args: AnimationLabOptions) {
    instance.update(args);
  },
  readout(snapshot: AnimationLabSnapshot) {
    return [
      ['属性当前值', snapshot.propValue],
      ['值进度', snapshot.valueProgress],
      ['时间进度', snapshot.durationProgress],
      ['已运行时长', `${snapshot.elapsedMs} ms`],
      ['缓动', snapshot.easing],
      ['状态', snapshot.state],
      ['覆盖重启次数', snapshot.restarts],
    ];
  },
  captions: ['虚线框为起点 / 终点参照 · 改任一控件即覆盖重启当前补间'],
});

/** util.ease 清单的选段：覆盖线性感、幂次、弹性、回退、反弹各族代表 */
const EASING_OPTIONS = [
  'defaultEasing',
  'easeInQuad',
  'easeOutQuad',
  'easeInOutQuad',
  'easeInCubic',
  'easeOutCubic',
  'easeInOutSine',
  'easeOutExpo',
  'easeOutElastic',
  'easeInOutBack',
  'easeOutBounce',
  'easeInOutBounce',
];

const meta = {
  id: 'animation',
  title: '滤镜与动画/动画',
  tags: ['!dev'],
  args: {
    target: 'left',
    easing: 'defaultEasing',
    duration: 1000,
    markDirty: true,
  },
  argTypes: {
    target: {
      name: '目标属性',
      description:
        'obj.animate 的目标值映射键：fill 命中 colorProperties 会自动改走 util.animateColor；scale 同时驱动 scaleX / scaleY 两条并行补间。',
      control: {
        type: 'inline-radio',
        labels: {
          left: '位置 left',
          angle: '旋转 angle',
          scale: '缩放 scaleX/Y',
          fill: '填充色 fill',
        },
      },
      options: ['left', 'angle', 'scale', 'fill'],
    },
    easing: {
      name: '缓动曲线（util.ease）',
      description:
        'easing（默认 defaultEasing，公式同 easeInSine）：每帧 (t, b, c, d) 形态的缓动函数；此处为 util.ease 全量清单的选段。',
      control: {
        type: 'select',
        options: EASING_OPTIONS,
      },
    },
    duration: {
      name: '时长 ms（duration）',
      description:
        'duration（默认 500）：补间总时长；时长太短时帧数少、读数（约 100ms 节流）也难分辨。',
      control: {
        type: 'range',
        min: 200,
        max: 3000,
        step: 100,
      },
    },
    markDirty: {
      name: '补间时标记缓存失效（dirty）',
      description:
        '仅影响 fill 目标：obj.animate 写颜色走直接赋值、不置 dirty；开启后每帧 rect.set(\'dirty\', true) 重建缓存位图，关闭可复现“读数在变、画面颜色不动”。',
      control: { type: 'boolean' },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<AnimationLabOptions>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
