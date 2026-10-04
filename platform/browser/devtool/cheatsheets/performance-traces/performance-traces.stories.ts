import type { Meta, StoryObj } from '@storybook/html-vite';

import { storySource } from '../../assets/story-source.js';
import specimenSource from './workload-specimen.ts?raw';
import {
  createWorkloadSpecimen,
  WORKLOAD_LABELS,
  type WorkloadInstance,
  type WorkloadKind,
} from './workload-specimen';

interface SpecimenArgs {
  workload: WorkloadKind;
}

/*
  DOM 标本的渲染适配：舞台与实例只创建一次，参数变化只更新负载类型；
  舞台被 Storybook 移出文档时释放实例并重置闭包，返回 Docs 页可完整重建。
  标本内部的 rAF 循环在离屏或标签页隐藏时自动暂停。
*/
const renderSpecimen = (() => {
  let stage: HTMLElement | undefined;
  let instance: WorkloadInstance | undefined;

  return (args: SpecimenArgs) => {
    if (!stage || !instance) {
      stage = document.createElement('div');
      instance = createWorkloadSpecimen(stage);

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

/* 负载类型单选：值是标本里的负载名，中文标签取自 WORKLOAD_LABELS。 */
const WORKLOAD_OPTIONS = Object.keys(WORKLOAD_LABELS);

const meta = {
  id: 'performance-traces',
  title: '性能分析/性能录制与分析/录制与分析轨迹',
  tags: ['!dev'],
  args: {
    workload: 'mixed',
  },
  argTypes: {
    workload: {
      name: '负载类型',
      description:
        '标本注入的负载：混合（默认）录出两条长任务加三条 Network 请求；长脚本任务录出一条纯 JS 长任务；布局抖动录出黄紫锯齿与强制同步布局。到 Performance 面板点 Record，点「执行一次操作」后 Stop，用 readout 的耗时在 Timings 轨道与 Main 火焰图里定位这次操作。',
      control: {
        type: 'radio',
        labels: WORKLOAD_LABELS,
      },
      options: WORKLOAD_OPTIONS,
    },
  },
  render: renderSpecimen,
  parameters: storySource(specimenSource),
} satisfies Meta<SpecimenArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Specimen: Story = {};
