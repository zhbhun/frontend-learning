import type { Meta, StoryObj } from '@storybook/html-vite';

import { storySource } from '../../assets/story-source.js';
import specimenSource from './trigger-specimen.ts?raw';
import {
  createTriggerSpecimen,
  type TriggerSpecimenInstance,
  type TriggerSpecimenOptions,
} from './trigger-specimen';

type SpecimenArgs = TriggerSpecimenOptions;

/*
  与其他课程的 DOM 标本相同的生命周期：舞台只创建一次，参数变化只更新
  供动作函数取用的输入；舞台被 Storybook 移出文档时释放实例并重置闭包，
  返回 Docs 页可完整重建。具体动作由舞台内的按钮触发，读者在 Sources /
  Elements / Console 中设置的各类断点会在下一次点击时生效。
*/
const renderSpecimen = (() => {
  let stage: HTMLElement | undefined;
  let instance: TriggerSpecimenInstance | undefined;

  return (args: SpecimenArgs) => {
    if (!stage || !instance) {
      stage = document.createElement('div');
      instance = createTriggerSpecimen(stage);

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
  id: 'advanced-breakpoints',
  title: 'JavaScript 调试/高级断点',
  tags: ['!dev'],
  args: {
    requestPath: '/api/items',
    itemIndex: 2,
  },
  argTypes: {
    requestPath: {
      name: '请求路径',
      description:
        '点「发送请求」按钮时 fetch 的路径。练习 XHR/fetch 断点时，把它与断点字符串组合，验证「URL 包含子串」的匹配规则。',
      control: {
        type: 'select',
      },
      options: ['/api/items', '/api/users', '/api/orders'],
    },
    itemIndex: {
      name: '修改第几项',
      description:
        '点「修改列表项」按钮时被修改的列表项序号。练习条件断点时，用它验证「条件为真才暂停」。',
      control: {
        type: 'range',
        min: 1,
        max: 4,
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
