import type { Meta, StoryObj } from '@storybook/html-vite';

import { storySource } from '../../assets/story-source.js';
import specimenSource from './form-specimen.ts?raw';
import { createFormSpecimen, type FormSpecimenInstance } from './form-specimen';

type SpecimenArgs = {
  reset: boolean;
};

/*
  与其他课程的 DOM 标本相同的生命周期：舞台只创建一次，舞台被 Storybook 移出
  文档时释放实例并重置闭包，返回 Docs 页可完整重建。
  Controls 的「重置」开关是本课唯一的输入：Recorder 的一条流程录完或回放后，
  靶场往往停在「已提交」态——向任一方向切换开关都会把表单恢复初始态，便于
  再次录制或回放；回放若以自动补的 navigate 步骤开头，页面重载同样带来初始态。
*/
const renderSpecimen = (() => {
  let stage: HTMLElement | undefined;
  let instance: FormSpecimenInstance | undefined;
  let lastReset: boolean | undefined;

  return (args: SpecimenArgs) => {
    if (!stage || !instance) {
      stage = document.createElement('div');
      instance = createFormSpecimen(stage);

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

    /* 开关任一方向的切换都触发重置；首次挂载时实例本就是初始态，重复调用无副作用。 */
    if (args.reset !== lastReset) {
      lastReset = args.reset;
      instance.reset();
    }
    return stage;
  };
})();

const meta = {
  id: 'recorder',
  title: '模拟与测试/录制与回放用户流',
  tags: ['!dev'],
  args: {
    reset: false,
  },
  argTypes: {
    reset: {
      name: '重置',
      description:
        '向任一方向切换本开关，都会把表单流程恢复初始态（清空输入、隐藏成功面板、流程进度归零）。录制或回放前用它复位靶场；回放若以自动补的 navigate 步骤开头，页面重载同样会带来初始态。',
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
