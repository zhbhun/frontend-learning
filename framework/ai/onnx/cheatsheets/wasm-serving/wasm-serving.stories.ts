import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
// Show code 绑定 worker 文件：设 wasmPaths 与真实 create 都发生在那里。
import pathAttemptWorkerSource from './path-attempt.worker.ts?raw';
import {
  BRANCH_OPTIONS,
  createPathAttempt,
  softWrap,
  type PathAttemptArgs,
  type PathAttemptInstance,
  type PathAttemptSnapshot,
} from './path-attempt';

const renderProbe = canvasStory({
  create: createPathAttempt,
  apply(instance: PathAttemptInstance, args: PathAttemptArgs) {
    instance.update({ branch: args.branch });
  },
  readout(snapshot: PathAttemptSnapshot) {
    const result =
      snapshot.phase === 'running'
        ? '进行中…'
        : snapshot.phase === 'ok'
          ? `成功（${(snapshot.durationMs ?? 0).toFixed(0)} ms）`
          : '失败';
    return [
      ['路径配置', snapshot.branchLabel],
      ['create 结果', result],
      [
        '实际拉取 .mjs',
        snapshot.mjsUrl
          ? softWrap(snapshot.mjsUrl)
          : snapshot.branch === 'none'
            ? '—（bundle 内嵌）'
            : '—',
      ],
      ['实际拉取 .wasm', snapshot.wasmUrl ? softWrap(snapshot.wasmUrl) : '—'],
      ['报错原文', snapshot.errorText ? softWrap(snapshot.errorText) : '—'],
    ];
  },
  captions: ['画布：create 的三阶段流水线与中断点', '读数：实际拉取的工件 URL 与报错原文'],
});

// 用类型标注（而非 satisfies）携带 args 元数据，与既有课程写法一致。
const meta: Meta<PathAttemptArgs> = {
  id: 'wasm-serving',
  title: '工程与性能/浏览器运行时/WASM 资源伺服',
  tags: ['!dev'],
};

export default meta;

type Story = StoryObj<PathAttemptArgs>;

export const PathProbe: Story = {
  name: '路径配置现场',
  args: {
    branch: 'cdn',
  },
  argTypes: {
    branch: {
      name: 'wasmPaths 配置',
      description: '切换后立即终止旧 worker、派生全新 worker 重跑一次真实 create。',
      control: {
        type: 'radio',
        labels: Object.fromEntries(
          BRANCH_OPTIONS.map((option) => [option.id, option.label]),
        ),
      },
      options: BRANCH_OPTIONS.map((option) => option.id),
    },
  },
  render: renderProbe,
  parameters: storySource(pathAttemptWorkerSource),
};
