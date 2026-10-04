import type { Meta, StoryObj } from '@storybook/html-vite';

import { storySource } from '../../assets/story-source.js';
import layoutSpecimenSource from './layout-specimen.ts?raw';
import stackSpecimenSource from './stack-specimen.ts?raw';
import {
  createLayoutSpecimen,
  PROBLEM_LABELS,
  type LayoutArgs,
} from './layout-specimen';
import { createStackSpecimen, type StackArgs } from './stack-specimen';

interface SpecimenInstance<A> {
  update(args: A): void;
  dispose(): void;
}

/*
  DOM 标本的渲染适配：舞台与实例只创建一次，参数变化只调用 update；
  舞台被 Storybook 移出文档时释放实例并重置闭包，返回 Docs 页可完整重建。
*/
function domStory<A>(
  createInstance: (stage: HTMLElement) => SpecimenInstance<A>,
) {
  let stage: HTMLElement | undefined;
  let instance: SpecimenInstance<A> | undefined;

  return (args: A) => {
    if (!stage || !instance) {
      const nextStage = document.createElement('div');
      instance = createInstance(nextStage);
      stage = nextStage;

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
}

const renderLayout = domStory<LayoutArgs>(createLayoutSpecimen);
const renderStack = domStory<StackArgs>(createStackSpecimen);

/* 问题场景的下拉选项：标签用中文，值仍是 layout-specimen 里的场景名。 */
const PROBLEM_OPTIONS = Object.keys(PROBLEM_LABELS);

const meta = {
  id: 'debug-layout',
  title: '上手与界面/DOM 与 CSS/调试布局',
  tags: ['!dev'],
} satisfies Meta;

export default meta;

export const LayoutSpecimen: StoryObj<LayoutArgs> = {
  args: {
    mode: 'flex',
    problem: 'normal',
  },
  argTypes: {
    mode: {
      name: '布局模式',
      description: '切换容器的 display，比较 flex 与 grid 两种布局的 overlay 读数。',
      control: {
        type: 'radio',
      },
      options: ['flex', 'grid'],
    },
    problem: {
      name: '问题场景',
      description: '正常排布；制造溢出让子项撑出容器；允许换行观察分行。',
      control: {
        type: 'select',
        labels: PROBLEM_LABELS,
      },
      options: PROBLEM_OPTIONS,
    },
  },
  render: renderLayout,
  parameters: storySource(layoutSpecimenSource),
};

export const StackSpecimen: StoryObj<StackArgs> = {
  args: {
    trapped: true,
  },
  argTypes: {
    trapped: {
      name: '祖先层叠上下文',
      description: '开启后给 wrapper 加 transform，使 z-index: 1000 失效；关闭后恢复。',
      control: {
        type: 'boolean',
      },
    },
  },
  render: renderStack,
  parameters: storySource(stackSpecimenSource),
};
