import type { Meta, StoryObj } from '@storybook/html-vite';

import { storySource } from '../../assets/story-source.js';
import specimenSource from './query-specimen.ts?raw';
import {
  createQuerySpecimen,
  type QuerySpecimenInstance,
  type SelectorId,
} from './query-specimen';

interface SpecimenArgs {
  selector: SelectorId;
}

/*
  与其他课程的 DOM 标本相同的生命周期：舞台只创建一次，参数变化只刷新读数；
  舞台被 Storybook 移出文档时释放实例并重置闭包，返回 Docs 页可完整重建。
*/
const renderSpecimen = (() => {
  let stage: HTMLElement | undefined;
  let instance: QuerySpecimenInstance | undefined;

  return (args: SpecimenArgs) => {
    if (!stage || !instance) {
      stage = document.createElement('div');
      instance = createQuerySpecimen(stage);

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
  id: 'command-line-api',
  title: 'JavaScript 调试/与页面交互',
  tags: ['!dev'],
  args: {
    selector: '.specimen-btn',
  },
  argTypes: {
    selector: {
      name: '目标选择器',
      description:
        'readout 用 document.querySelector / querySelectorAll 计算 $() 首个匹配与 $$() 匹配数；打开 DevTools Console，在命令行运行相同的 $ / $$ 表达式与 readout 对答案。',
      control: {
        type: 'select',
        labels: {
          '.specimen-btn': '.specimen-btn（三个按钮）',
          '.specimen-list li': '.specimen-list li（三个待办项）',
          '.specimen-list li.done': '.specimen-list li.done（已完成项）',
          'input.specimen-input': 'input.specimen-input（输入框）',
          '#specimen-hero': '#specimen-hero（主视觉块）',
          '.specimen-nothing': '.specimen-nothing（故意无匹配）',
        },
      },
      options: [
        '.specimen-btn',
        '.specimen-list li',
        '.specimen-list li.done',
        'input.specimen-input',
        '#specimen-hero',
        '.specimen-nothing',
      ],
    },
  },
  render: renderSpecimen,
  parameters: storySource(specimenSource),
} satisfies Meta<SpecimenArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Specimen: Story = {};
