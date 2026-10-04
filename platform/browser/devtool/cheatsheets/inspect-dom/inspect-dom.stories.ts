import type { Meta, StoryObj } from '@storybook/html-vite';

import { storySource } from '../../assets/story-source.js';
import specimenSource from './dom-specimen.ts?raw';
import {
  createDomSpecimen,
  type DomSpecimenInstance,
  type SpecimenOptions,
} from './dom-specimen';

/*
  与 canvasStory 相同的生命周期：舞台只创建一次，参数变化只调用 update；
  舞台被 Storybook 移出文档时释放实例并重置闭包，返回 Docs 页可完整重建。
*/
const renderSpecimen = (() => {
  let stage: HTMLElement | undefined;
  let instance: DomSpecimenInstance | undefined;

  return (args: SpecimenOptions) => {
    if (!stage || !instance) {
      stage = document.createElement('div');
      instance = createDomSpecimen(stage);

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
  id: 'inspect-dom',
  title: '上手与界面/DOM 与 CSS/检查 DOM',
  tags: ['!dev'],
  args: {
    dynamicItems: 2,
    hiddenItem: false,
  },
  argTypes: {
    dynamicItems: {
      name: '动态插入项',
      description:
        '由页面 JS 插入列表末尾的节点数。调整后到 Elements 看列表末尾的新节点（可用 Ctrl+F 搜 .dom-specimen__item--dynamic），或选中后在 Console 用 $0 / inspect() 定位。',
      control: {
        type: 'range',
        min: 0,
        max: 4,
        step: 1,
      },
    },
    hiddenItem: {
      name: 'hidden 属性',
      description:
        '给 data-id="item-4" 的列表项加 / 去 hidden 属性：元素仍在 DOM 树里，但页面上不可见。也可以在 Elements 里直接双击删除这个属性。',
      control: {
        type: 'boolean',
      },
    },
  },
  render: renderSpecimen,
  parameters: storySource(specimenSource),
} satisfies Meta<SpecimenOptions>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Specimen: Story = {};
