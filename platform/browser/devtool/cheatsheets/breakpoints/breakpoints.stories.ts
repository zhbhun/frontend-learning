import type { Meta, StoryObj } from '@storybook/html-vite';

import { storySource } from '../../assets/story-source.js';
import specimenSource from './calc-specimen.ts?raw';
import {
  createCalcSpecimen,
  type CalcSpecimenInstance,
  type CalcSpecimenOptions,
} from './calc-specimen';

type SpecimenArgs = CalcSpecimenOptions;

/*
  与其他课程的 DOM 标本相同的生命周期：舞台只创建一次，参数变化只触发一轮计算；
  舞台被 Storybook 移出文档时释放实例并重置闭包，返回 Docs 页可完整重建。
  每轮计算都真实调用一次 calcOrder 调用链，读者在 Sources 面板对该链路设置的
  行断点会在下一次参数变化时触发暂停。
*/
const renderSpecimen = (() => {
  let stage: HTMLElement | undefined;
  let instance: CalcSpecimenInstance | undefined;

  return (args: SpecimenArgs) => {
    if (!stage || !instance) {
      stage = document.createElement('div');
      instance = createCalcSpecimen(stage);

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
  id: 'breakpoints',
  title: 'JavaScript 调试/断点调试',
  tags: ['!dev'],
  args: {
    price: 68,
    quantity: 3,
    discount: 10,
  },
  argTypes: {
    price: {
      name: '单价（元）',
      description:
        '计算标本的输入之一；任一参数变化都触发一轮重新计算，并在 Console 输出一条 [标本] 消息。设好行断点后再调整参数即可触发暂停。',
      control: {
        type: 'range',
        min: 1,
        max: 100,
        step: 1,
      },
    },
    quantity: {
      name: '数量',
      description: '计算标本的输入之一；与单价相乘得到小计。',
      control: {
        type: 'range',
        min: 1,
        max: 20,
        step: 1,
      },
    },
    discount: {
      name: '折扣 %',
      description:
        '计算标本的输入之一，0 表示不打折。报告行金额偏离人工核算的偏差随它出现——定位练习的主要触发器。',
      control: {
        type: 'range',
        min: 0,
        max: 50,
        step: 5,
      },
    },
  },
  render: renderSpecimen,
  parameters: storySource(specimenSource),
} satisfies Meta<SpecimenArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Specimen: Story = {};
