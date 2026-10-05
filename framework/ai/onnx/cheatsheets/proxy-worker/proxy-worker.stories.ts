import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
// Show code 绑定核心文件：三档线程形态的分发、env.wasm.proxy 的设置与真实计时都在那里。
import ortAttemptsSource from './ort-attempts.ts?raw';
import {
  MODE_OPTIONS,
  createProbe,
  type ProbeArgs,
  type ProbeInstance,
  type ProbeSnapshot,
} from './responsiveness-probe';

const renderProbe = canvasStory({
  create: createProbe,
  apply(instance: ProbeInstance, args: ProbeArgs) {
    instance.update(args);
  },
  readout(snapshot: ProbeSnapshot) {
    return [
      ['线程形态', snapshot.modeLabel],
      ['会话创建', snapshot.createMs === null ? '—' : `${snapshot.createMs.toFixed(0)} ms`],
      [
        '单次推理',
        snapshot.avgRunMs === null
          ? '—'
          : `${snapshot.runs} 次均值 ${snapshot.avgRunMs.toFixed(1)} ms（峰值 ${(snapshot.maxRunMs ?? 0).toFixed(1)} ms）`,
      ],
      [
        '推理期间最大帧间隔',
        snapshot.maxFrameGapMs === null ? '—' : `${snapshot.maxFrameGapMs.toFixed(0)} ms`,
      ],
      ['估算掉帧', snapshot.missedFrames === null ? '—' : `${snapshot.missedFrames} 帧`],
      [
        '输出类别',
        snapshot.digit === null
          ? '—'
          : `${snapshot.digit}（置信 ${((snapshot.confidence ?? 0) * 100).toFixed(0)}%）`,
      ],
    ];
  },
  captions: ['画布：旋转标记与帧间隔时间线（真实计时）', '读数：推理计时与帧计时'],
});

// 用类型标注（而非 satisfies）携带 args 元数据，与既有课程写法一致。
const meta: Meta<ProbeArgs> = {
  id: 'proxy-worker',
  title: '工程与性能/浏览器运行时/proxy 工作线程',
  tags: ['!dev'],
};

export default meta;

type Story = StoryObj<ProbeArgs>;

export const Responsiveness: Story = {
  name: '响应性现场',
  args: {
    mode: 'main',
    runs: 20,
  },
  argTypes: {
    mode: {
      name: '线程形态',
      description: '切换后以相同输入、模型与次数重跑一轮，对比推理期间的帧间隔。',
      control: {
        type: 'radio',
        labels: Object.fromEntries(MODE_OPTIONS.map((option) => [option.id, option.label])),
      },
      options: MODE_OPTIONS.map((option) => option.id),
    },
    runs: {
      name: '连续推理次数',
      description: '本轮依次执行的 run 次数；主线程档被整段占用的时间随次数增长。',
      control: {
        type: 'range',
        min: 1,
        max: 40,
        step: 1,
      },
    },
  },
  render: renderProbe,
  parameters: storySource(ortAttemptsSource),
};
