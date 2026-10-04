import type { Meta, StoryObj } from '@storybook/html-vite';

import { storySource } from '../../assets/story-source.js';
import specimenSource from './alloc-specimen.ts?raw';
import {
  createAllocSpecimen,
  type AllocInstance,
  type AllocOptions,
} from './alloc-specimen';

interface SpecimenArgs {
  count: number;
  fields: number;
  itemsPerArray: number;
}

/*
  与其他课程的 DOM 标本相同的生命周期：舞台与实例只创建一次，参数变化只调用
  update；舞台被 Storybook 移出文档时释放实例并重置闭包，返回 Docs 页可完整重建。
  标本是真实的堆分配：点「分配」创建 SnapshotSpecimen 对象并挂在 window.allocSpecimens
  上持有引用，点「释放」清空引用等 GC——读者对页面拍 Heap Snapshot 完成练习。
*/
const renderSpecimen = (() => {
  let stage: HTMLElement | undefined;
  let instance: AllocInstance | undefined;

  return (args: SpecimenArgs) => {
    if (!stage || !instance) {
      stage = document.createElement('div');
      instance = createAllocSpecimen(stage);

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

    instance.update(args as AllocOptions);
    return stage;
  };
})();

const meta = {
  id: 'memory-snapshots',
  title: '性能分析/内存分析/内存快照',
  tags: ['!dev'],
  args: {
    count: 1000,
    fields: 8,
    itemsPerArray: 8,
  },
  argTypes: {
    count: {
      name: '对象数量',
      description:
        '每次「分配」创建的 SnapshotSpecimen 实例个数。调大后点「分配」再拍快照：Summary 里 SnapshotSpecimen 行的对象总数随之增加，Comparison 的 # New / # Delta 等于它。点「分配」时生效。',
      control: {
        type: 'range',
        min: 100,
        max: 5000,
        step: 100,
      },
    },
    fields: {
      name: '字段数',
      description:
        '每个对象携带的 SnapshotPayload 数值字段个数，决定对象自身的 Shallow size 估算——字段内联在对象存储里，不产生额外堆对象。调大后新分配的对象更「胖」。点「分配」时生效。',
      control: {
        type: 'range',
        min: 0,
        max: 32,
        step: 1,
      },
    },
    itemsPerArray: {
      name: '字符串数组长度',
      description:
        '每个对象携带的 tags 字符串数组长度，决定 Retained size 里字符串与数组贡献的部分——调大后 Retained size 与 Shallow size 的差距拉开。点「分配」时生效。',
      control: {
        type: 'range',
        min: 0,
        max: 32,
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
