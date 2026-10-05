import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
// Show code 绑定 worker 文件：隔离读数、numThreads 设置、真实 create 与
// 警告捕获都发生在那里；主线程的 isolation-probe.ts 只负责画前提链外壳。
import isolationProbeWorkerSource from './isolation-probe.worker.ts?raw';
import {
  createIsolationProbe,
  softWrap,
  THREAD_OPTIONS,
  type IsolationProbeArgs,
  type IsolationProbeInstance,
  type IsolationProbeSnapshot,
} from './isolation-probe';

const renderProbe = canvasStory({
  create: createIsolationProbe,
  apply(instance: IsolationProbeInstance, args: IsolationProbeArgs) {
    instance.update({ setting: args.setting });
  },
  readout(snapshot: IsolationProbeSnapshot) {
    const threadsText =
      snapshot.phase === 'running'
        ? '进行中…'
        : snapshot.threadsAfter === undefined
          ? '—'
          : String(snapshot.threadsAfter);
    return [
      ['numThreads 设置值', snapshot.settingLabel],
      ['numThreads 归一化结果', threadsText],
      [
        'worker 内 crossOriginIsolated',
        snapshot.workerIsolated === null ? '—' : String(snapshot.workerIsolated),
      ],
      [
        'SharedArrayBuffer（worker 内）',
        snapshot.workerSabType ?? '—',
      ],
      ["'crossOriginIsolated' in window", String(snapshot.hasIsolationApi)],
      ['硬件线程数', String(snapshot.cores)],
      [
        '回落警告',
        snapshot.warnings.length > 0
          ? `${snapshot.warnings.length} 条：${softWrap(snapshot.warnings[0])}`
          : snapshot.phase === 'running'
            ? '—'
            : '无',
      ],
    ];
  },
  captions: ['画布：前提链四级判定（上：本页实测，下：已隔离示意）', '读数：真实 create 的归一化结果与警告原文'],
});

// 用类型标注（而非 satisfies）携带 args 元数据，与既有课程写法一致。
const meta: Meta<IsolationProbeArgs> = {
  id: 'cross-origin-isolation',
  title: '工程与性能/浏览器运行时/多线程与跨域隔离',
  tags: ['!dev'],
};

export default meta;

type Story = StoryObj<IsolationProbeArgs>;

export const IsolationProbe: Story = {
  name: '前提链体检',
  args: {
    setting: 'auto',
  },
  argTypes: {
    setting: {
      name: 'numThreads 设置值',
      description:
        '切换后终止旧 worker、派生全新 worker 重跑一次真实 create，每次都是首次初始化。',
      control: {
        type: 'radio',
        labels: Object.fromEntries(
          THREAD_OPTIONS.map((option) => [option.id, option.label]),
        ),
      },
      options: THREAD_OPTIONS.map((option) => option.id),
    },
  },
  render: renderProbe,
  parameters: storySource(isolationProbeWorkerSource),
};
