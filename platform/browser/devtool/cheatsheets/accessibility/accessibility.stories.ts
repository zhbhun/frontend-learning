import type { Meta, StoryObj } from '@storybook/html-vite';

import { storySource } from '../../assets/story-source.js';
import specimenSource from './a11y-specimen.ts?raw';
import {
  createA11ySpecimen,
  type A11yInstance,
  type A11ySpecimenOptions,
} from './a11y-specimen';

interface SpecimenArgs {
  fixed: boolean;
}

/*
  DOM 标本的渲染适配：舞台与实例只创建一次，参数变化只切换修复模式；
  舞台被 Storybook 移出文档时释放实例并重置闭包，返回 Docs 页可完整重建。
  标本没有持续动画，无需 rAF 生命周期。
*/
const renderSpecimen = (() => {
  let stage: HTMLElement | undefined;
  let instance: A11yInstance | undefined;

  return (args: SpecimenArgs) => {
    if (!stage || !instance) {
      stage = document.createElement('div');
      instance = createA11ySpecimen(stage);

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
  id: 'accessibility',
  title: '模拟与测试/可访问性调试',
  tags: ['!dev'],
  args: {
    fixed: false,
  },
  argTypes: {
    fixed: {
      name: '修复模式',
      description:
        '在「无障碍标本」的问题版与修复版之间切换：无 label 的输入框、无可访问名称的图标按钮与状态图形、键盘不可达的假按钮、低对比度提示文字逐一修复，readout 的真实统计随之归零。',
      control: {
        type: 'boolean',
      },
    },
  },
  render: renderSpecimen,
  parameters: storySource(specimenSource),
} satisfies Meta<SpecimenArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Specimen: Story = {};
