import type { Meta, StoryObj } from '@storybook/html-vite';

import { storySource } from '../../assets/story-source.js';
import specimenSource from './benchmark-specimen.ts?raw';
import {
  createBenchmarkSpecimen,
  type BenchmarkInstance,
  type BenchmarkOptions,
} from './benchmark-specimen';

interface SpecimenArgs {
  suite: 'sort' | 'fib';
  sortSize: number;
  fibN: number;
}

/*
  与其他课程的 DOM 标本相同的生命周期：舞台与实例只创建一次，参数变化只调用
  update；舞台被 Storybook 移出文档时释放实例并重置闭包，返回 Docs 页可完整重建。
  标本是同步 CPU 负载：点「运行基准」后页面冻结到计算结束，那正是被剖析的长任务。
*/
const renderSpecimen = (() => {
  let stage: HTMLElement | undefined;
  let instance: BenchmarkInstance | undefined;

  return (args: SpecimenArgs) => {
    if (!stage || !instance) {
      stage = document.createElement('div');
      instance = createBenchmarkSpecimen(stage);

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

    instance.update(args as BenchmarkOptions);
    return stage;
  };
})();

/* 算法组的下拉选项：标签用中文，值仍是 benchmark-specimen 里的算法组名。 */
const SUITE_OPTIONS = ['sort', 'fib'] as const;

const SUITE_LABELS: Record<(typeof SUITE_OPTIONS)[number], string> = {
  sort: '排序对比',
  fib: '斐波那契对比',
};

const meta = {
  id: 'cpu-profiler',
  title: '性能分析/性能录制与分析/CPU 热点',
  tags: ['!dev'],
  args: {
    suite: 'sort',
    sortSize: 20000,
    fibN: 36,
  },
  argTypes: {
    suite: {
      name: '算法组',
      description:
        '选择要对比的两种实现：排序对比（bubbleSort vs nativeSort）或斐波那契对比（fibNaive vs fibMemo）。点「运行基准」生效，再到 Performance 面板的 Bottom-up / Call tree 里找同名函数的热点。',
      control: {
        type: 'select',
        labels: SUITE_LABELS,
      },
      options: SUITE_OPTIONS,
    },
    sortSize: {
      name: '数组长度（排序）',
      description:
        '排序对比生成的数组元素个数。调大后点「运行基准」：readout 实测毫秒变大，Bottom-up 里 bubbleSort 的 Self Time 占比随之上升。只对排序对比生效。',
      control: {
        type: 'range',
        min: 4000,
        max: 30000,
        step: 2000,
      },
    },
    fibN: {
      name: 'n（斐波那契）',
      description:
        '斐波那契对比的 n。调大后点「运行基准」：fibNaive 的调用次数指数增长，Bottom-up 里它的 Self Time 榜首位置愈发突出；fibMemo 的 Self Time 始终趋近于零。只对斐波那契对比生效。',
      control: {
        type: 'range',
        min: 30,
        max: 40,
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
