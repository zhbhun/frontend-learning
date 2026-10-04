import type { Meta, StoryObj } from '@storybook/html-vite';

import { storySource } from '../../assets/story-source.js';
import specimenSource from './leak-specimen.ts?raw';
import {
  createLeakSpecimen,
  type LeakInstance,
  type LeakOptions,
  type LeakMode,
} from './leak-specimen';

interface SpecimenArgs {
  mode: LeakMode;
  payloadSize: number;
}

/*
  与其他课程的 DOM 标本相同的生命周期：舞台与实例只创建一次，参数变化只调用
  update；舞台被 Storybook 移出文档时释放实例并重置闭包，返回 Docs 页可完整重建。
  与内存快照课的分配标本不同，本标本的状态是跨参数持续累积的（泄漏本身就该累积）：
  泄漏模式每次「执行一次操作」都登记监听器、interval、缓存与游离节点且不注销；
  dispose 负责把标本自己登记的资源全部注销，不留真实泄漏在 Storybook 里。
*/
const renderSpecimen = (() => {
  let stage: HTMLElement | undefined;
  let instance: LeakInstance | undefined;

  return (args: SpecimenArgs) => {
    if (!stage || !instance) {
      stage = document.createElement('div');
      instance = createLeakSpecimen(stage);

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

    instance.update(args as LeakOptions);
    return stage;
  };
})();

const meta = {
  id: 'memory-leaks',
  title: '性能分析/内存分析/定位内存泄漏',
  tags: ['!dev'],
  args: {
    mode: 'leak',
    payloadSize: 64,
  },
  argTypes: {
    mode: {
      name: '实现模式',
      description:
        '同一个「收到一条消息」操作的两种实现：泄漏模式每次操作登记监听器、新开 interval、缓存只进不出、游离卡片留引用；修复模式完成同样功能但随手清理。切换只影响后续操作，已积累的泄漏用页内「清理已积累」按钮修复。',
      control: {
        type: 'radio',
        labels: {
          leak: '泄漏模式（登记不注销）',
          fixed: '修复模式（随操作清理）',
        },
      },
      options: ['leak', 'fixed'],
    },
    payloadSize: {
      name: '每条消息的负载条数',
      description:
        '每条 MessageEnvelope 携带的 body 字符串条数，决定单条消息在快照里的 Shallow / Retained 贡献与 Comparison 的 Size delta——调大后泄漏更容易在快照里看出来。点「执行一次操作」时生效。',
      control: {
        type: 'range',
        min: 4,
        max: 256,
        step: 4,
      },
    },
  },
  render: renderSpecimen,
  parameters: storySource(specimenSource),
} satisfies Meta<SpecimenArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Specimen: Story = {};
