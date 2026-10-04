import type { Meta, StoryObj } from '@storybook/html-vite';

import { storySource } from '../../assets/story-source.js';
import specimenSource from './load-specimen.ts?raw';
import {
  createLoadSpecimen,
  type LoadSpecimenInstance,
} from './load-specimen';

interface SpecimenArgs {
  load: number;
}

/*
  与其他课程的 DOM 标本相同的生命周期：舞台只创建一次，参数变化只更新负载；
  舞台被 Storybook 移出文档时释放实例并重置闭包，返回 Docs 页可完整重建。
  范例内部的 rAF 循环在离屏或标签页隐藏时自动暂停，FPS 读数冻结属正常现象。
*/
const renderSpecimen = (() => {
  let stage: HTMLElement | undefined;
  let instance: LoadSpecimenInstance | undefined;

  return (args: SpecimenArgs) => {
    if (!stage || !instance) {
      stage = document.createElement('div');
      instance = createLoadSpecimen(stage);

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
  id: 'performance-metrics',
  title: '性能分析/性能录制与分析/性能指标',
  tags: ['!dev'],
  args: {
    load: 150,
  },
  argTypes: {
    load: {
      name: '任务负载（ms）',
      description:
        '每次心跳与点击「触发一次交互」注入主线程的同步阻塞时长。调大后点按钮：处理耗时与最近交互延迟同步变大、FPS 估计跌落；到 DevTools 的 Performance 面板看 Live metrics 的 INP 卡片、Interactions 表与 Main 轨道的红三角长任务。',
      control: {
        type: 'range',
        min: 0,
        max: 500,
        step: 25,
      },
    },
  },
  render: renderSpecimen,
  parameters: storySource(specimenSource),
} satisfies Meta<SpecimenArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Specimen: Story = {};
