import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import coreSource from './format-event.ts?raw';
import { createFormatStage } from './format-stage';
import type { FormatStageInstance } from './format-stage';
import type { FormatEventArgs, FormatSnapshot } from './format-event';

const STATUS_LABELS: Record<FormatSnapshot['status'], string> = {
  sync: '已同步返回',
  pending: '等待中',
  fulfilled: '已兑现',
  rejected: '已拒绝',
};

const renderFormatDemo = canvasStory({
  create: createFormatStage,
  apply(instance: FormatStageInstance, args: FormatEventArgs) {
    instance.update(args);
  },
  readout(snapshot: FormatSnapshot) {
    return [
      ['触发结果', snapshot.result],
      ['已执行', snapshot.executed.length ? snapshot.executed.join(' → ') : '—'],
      ['兜底实现', snapshot.inner ? '已执行' : '未执行'],
      ['触发状态', STATUS_LABELS[snapshot.status]],
    ];
  },
});

const meta = {
  id: 'dispatch-modes',
  title: '副作用与事件/分发模式',
  tags: ['!dev'],
  args: {
    mode: 'emit',
    responder: 'none',
    asyncB: false,
    throwB: false,
  },
  argTypes: {
    mode: {
      name: '分发模式',
      description:
        '同一组监听器用哪种方法触发：emit 同步广播；parallel 并发等待；serial 逐个等待并短路；bail 同步短路；waterfall 沿 next() 委托到兜底实现。',
      options: ['emit', 'parallel', 'serial', 'bail', 'waterfall'],
      control: {
        type: 'radio',
      },
    },
    responder: {
      name: '抢答监听器',
      description:
        '返回有效值的监听器：serial / bail 在此处短路（后面的不再执行），waterfall 在此处停止委托（兜底实现不执行）；emit / parallel 丢弃返回值，不受影响。',
      options: ['none', 'B', 'C'],
      control: {
        type: 'radio',
      },
    },
    asyncB: {
      name: 'B 异步',
      description:
        'B 改为异步监听器（约 400ms）：parallel 同时启动等待全部；serial 逐个等待；emit 不等待、其 Promise 无人消费；bail / waterfall 同步拿到 Promise 对象。',
      control: {
        type: 'boolean',
      },
    },
    throwB: {
      name: 'B 抛错',
      description:
        'B 抛出异常：emit 同步炸给触发方并中断后续；parallel 等全部执行完抛 AggregateError；serial 立即 reject 并中断后续；bail / waterfall 同步抛出。',
      control: {
        type: 'boolean',
      },
    },
  },
  render: renderFormatDemo,
  parameters: storySource(coreSource),
} satisfies Meta<FormatEventArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
