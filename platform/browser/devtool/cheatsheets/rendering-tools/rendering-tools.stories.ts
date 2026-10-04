import type { Meta, StoryObj } from '@storybook/html-vite';

import { storySource } from '../../assets/story-source.js';
import specimenSource from './render-specimen.ts?raw';
import {
  ANIMATION_LABELS,
  createRenderSpecimen,
  INSERTION_LABELS,
  type AnimationMode,
  type InsertionMode,
  type RenderInstance,
} from './render-specimen';

interface SpecimenArgs {
  animation: AnimationMode;
  insertion: InsertionMode;
}

/*
  DOM 标本的渲染适配：舞台与实例只创建一次，参数变化只更新动画实现与插入方式；
  舞台被 Storybook 移出文档时释放实例并重置闭包，返回 Docs 页可完整重建。
  标本内部的 rAF 采样循环在离屏或标签页隐藏时自动暂停。
*/
const renderSpecimen = (() => {
  let stage: HTMLElement | undefined;
  let instance: RenderInstance | undefined;

  return (args: SpecimenArgs) => {
    if (!stage || !instance) {
      stage = document.createElement('div');
      instance = createRenderSpecimen(stage);

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

/* 单选控件：值是标本里的模式名，中文标签取自各 LABELS 记录。 */
const ANIMATION_OPTIONS = Object.keys(ANIMATION_LABELS);
const INSERTION_OPTIONS = Object.keys(INSERTION_LABELS);

const meta = {
  id: 'rendering-tools',
  title: '性能分析/性能录制与分析/渲染诊断',
  tags: ['!dev'],
  args: {
    animation: 'layout',
    insertion: 'async',
  },
  argTypes: {
    animation: {
      name: '动画实现',
      description:
        '动画区同一段往返运动的两种实现：每帧改 top/left 每帧触发布局与重绘，开启 Paint flashing 后持续闪绿；只用 transform 由合成器直接移动已绘制的层，基本不闪绿。',
      control: {
        type: 'radio',
        labels: ANIMATION_LABELS,
      },
      options: ANIMATION_OPTIONS,
    },
    insertion: {
      name: '插入方式',
      description:
        '点「插入一段内容」后横幅何时出现：网络返回后插入（约 700ms，已脱离输入窗口，偏移计入）；点击立即插入（同帧生效，hadRecentInput=true，不计入）。两种插入都会让 Layout Shift Regions 闪紫。',
      control: {
        type: 'radio',
        labels: INSERTION_LABELS,
      },
      options: INSERTION_OPTIONS,
    },
  },
  render: renderSpecimen,
  parameters: storySource(specimenSource),
} satisfies Meta<SpecimenArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Specimen: Story = {};
