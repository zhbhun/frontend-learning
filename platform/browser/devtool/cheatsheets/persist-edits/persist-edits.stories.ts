import type { Meta, StoryObj } from '@storybook/html-vite';

import { storySource } from '../../assets/story-source.js';
import specimenSource from './editable-specimen.ts?raw';
import {
  createEditableSpecimen,
  type EditableSpecimenInstance,
} from './editable-specimen';

type SpecimenArgs = {
  reset: boolean;
};

/*
  与其他课程的 DOM 标本相同的生命周期：舞台只创建一次，参数变化只调用 update；
  舞台被 Storybook 移出文档时释放实例（含挂到顶层窗口的 specimen API）并重置
  闭包，返回 Docs 页可完整重建。标本加载时会真实请求同目录的
  specimen-config.json，读者在 Network 面板对该请求做 Override content 后，
  刷新页面即由覆盖副本接管——这是本课的核心证据链。
*/
const renderSpecimen = (() => {
  let stage: HTMLElement | undefined;
  let instance: EditableSpecimenInstance | undefined;

  return (args: SpecimenArgs) => {
    if (!stage || !instance) {
      stage = document.createElement('div');
      instance = createEditableSpecimen(stage);

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
  id: 'persist-edits',
  title: 'JavaScript 调试/修改落盘与复用',
  tags: ['!dev'],
  args: {
    reset: false,
  },
  argTypes: {
    reset: {
      name: '重置',
      description:
        '拨到任意一侧都会触发一次重置：标本回到本次加载到的配置。它清得掉 Console / Snippet 的临时改，清不掉 Local Overrides——要恢复出厂样子，需到 Sources → Overrides 删除或 Clear 覆盖文件。',
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
