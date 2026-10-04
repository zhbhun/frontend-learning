import type { Meta, StoryObj } from '@storybook/html-vite';

import { storySource } from '../../assets/story-source.js';
import specimenSource from './css-specimen.ts?raw';
import {
  createCssSpecimen,
  DEFAULT_ACCENT,
  type CssSpecimenInstance,
  type SpecimenState,
} from './css-specimen';

interface SpecimenArgs {
  state: SpecimenState;
  accent: string;
}

/*
  与 canvasStory 相同的生命周期：舞台只创建一次，参数变化只调用 update；
  舞台被 Storybook 移出文档时释放实例并重置闭包，返回 Docs 页可完整重建。
*/
const renderSpecimen = (() => {
  let stage: HTMLElement | undefined;
  let instance: CssSpecimenInstance | undefined;

  return (args: SpecimenArgs) => {
    if (!stage || !instance) {
      stage = document.createElement('div');
      instance = createCssSpecimen(stage);

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
  id: 'edit-css',
  title: '上手与界面/DOM 与 CSS/查看与修改 CSS',
  tags: ['!dev'],
  args: {
    state: 'default',
    accent: DEFAULT_ACCENT,
  },
  argTypes: {
    state: {
      name: '状态类',
      description:
        '给 .specimen-card 加 / 去 is-active 类；也可以在 DevTools 里用 .cls 按钮做同样的事。',
      control: {
        type: 'select',
        labels: {
          default: '默认',
          'is-active': 'is-active（激活）',
        },
      },
      options: ['default', 'is-active'],
    },
    accent: {
      name: '--card-accent 主题色',
      description:
        '写成 .css-specimen 上的行内自定义属性。默认色不写行内样式；换成其他颜色后，可到 Styles 顶部 element.style 里看到这条声明。',
      control: {
        type: 'select',
        labels: {
          [DEFAULT_ACCENT]: '松石绿（默认）',
          '#b45309': '琥珀橙',
          '#6d28d9': '紫罗兰',
        },
      },
      options: [DEFAULT_ACCENT, '#b45309', '#6d28d9'],
    },
  },
  render: renderSpecimen,
  parameters: storySource(specimenSource),
} satisfies Meta<SpecimenArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Specimen: Story = {};
