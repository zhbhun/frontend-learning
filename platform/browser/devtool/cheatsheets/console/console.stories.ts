import type { Meta, StoryObj } from '@storybook/html-vite';

import { storySource } from '../../assets/story-source.js';
import specimenSource from './log-specimen.ts?raw';
import {
  createLogSpecimen,
  type LogApiId,
  type LogSpecimenInstance,
} from './log-specimen';

interface SpecimenArgs {
  api: LogApiId;
  times: number;
}

/*
  与其他课程的 DOM 标本相同的生命周期：舞台只创建一次，参数变化只触发一轮输出；
  舞台被 Storybook 移出文档时释放实例并重置闭包，返回 Docs 页可完整重建。
*/
const renderSpecimen = (() => {
  let stage: HTMLElement | undefined;
  let instance: LogSpecimenInstance | undefined;

  return (args: SpecimenArgs) => {
    if (!stage || !instance) {
      stage = document.createElement('div');
      instance = createLogSpecimen(stage);

      const observedStage = stage;
      const observedInstance = instance;
      requestAnimationFrame(() => {
        const parent = observedStage.parentElement;
        if (!parent) {
          return;
        }

        const observer = new MutationObserver(() => {
          if (!observedStage.isConnected) {
            observer.disconnect();
            observedInstance.dispose();

            if (stage === observedStage) {
              stage = undefined;
              instance = undefined;
            }
          }
        });
        observer.observe(parent, { childList: true });
      });
    }

    instance.update(args);
    return stage;
  };
})();

const meta = {
  id: 'console',
  title: 'JavaScript 调试/Console 入门',
  tags: ['!dev'],
  args: {
    api: 'log',
    times: 1,
  },
  argTypes: {
    api: {
      name: 'console API',
      description:
        '选择要触发的方法；每次参数变化都向浏览器真实的 Console 输出一轮日志，切到 DevTools 的 Console 面板对照观察。',
      control: {
        type: 'select',
        labels: {
          log: 'console.log（基础输出）',
          info: 'console.info（与 log 相同）',
          debug: 'console.debug（Verbose 级）',
          warn: 'console.warn（Warning 级）',
          error: 'console.error（Error 级 + 堆栈）',
          table: 'console.table（表格输出）',
          group: 'console.group（分组）',
          count: 'console.count（计数递增）',
          time: 'console.time（计时三连）',
          assert: 'console.assert（失败才输出）',
          trace: 'console.trace（调用栈）',
        },
      },
      options: [
        'log',
        'info',
        'debug',
        'warn',
        'error',
        'table',
        'group',
        'count',
        'time',
        'assert',
        'trace',
      ],
    },
    times: {
      name: '连发次数',
      description:
        '一次触发连发几条相同消息（console.time 每次固定走一步）。调到 3 触发 console.log，可观察 Group similar messages 的折叠计数。',
      control: {
        type: 'range',
        min: 1,
        max: 5,
        step: 1,
      },
    },
  },
  render: renderSpecimen,
  parameters: storySource(specimenSource),
} satisfies Meta<SpecimenArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Specimen: Story = {};
