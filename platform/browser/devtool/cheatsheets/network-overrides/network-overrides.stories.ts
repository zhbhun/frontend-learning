import type { Meta, StoryObj } from '@storybook/html-vite';

import { storySource } from '../../assets/story-source.js';
import specimenSource from './config-specimen.ts?raw';
import {
  createConfigSpecimen,
  type ConfigPathKey,
  type ConfigSpecimenInstance,
} from './config-specimen';

type SpecimenArgs = {
  refetch: boolean;
  configPath: ConfigPathKey;
};

/*
  与其他课程的 DOM 标本相同的生命周期：舞台只创建一次，参数变化只调用 update；
  舞台被 Storybook 移出文档时释放实例（中止进行中的 fetch）并重置闭包，返回
  Docs 页可完整重建。标本加载与每次重新请求都会真实 fetch 同目录的 JSON 配置
  （cache: 'no-store'，保证每次都走网络层），读者在 Network 面板对这条请求做
  Block request / Override content / Override headers / Throttling 练习——
  这是本课的核心证据链。
*/
const renderSpecimen = (() => {
  let stage: HTMLElement | undefined;
  let instance: ConfigSpecimenInstance | undefined;

  return (args: SpecimenArgs) => {
    if (!stage || !instance) {
      stage = document.createElement('div');
      instance = createConfigSpecimen(stage);

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
  id: 'network-overrides',
  title: '网络调试/控制请求',
  tags: ['!dev'],
  args: {
    refetch: false,
    configPath: 'production',
  },
  argTypes: {
    refetch: {
      name: '重新请求',
      description:
        '拨到任意一侧都会触发一次重新请求（等价于标本上的「重新请求」按钮）。配置请求带 cache: no-store，每次都真实经过网络层——节流、阻断、覆盖都会立刻反映到 readout。',
      control: {
        type: 'boolean',
      },
    },
    configPath: {
      name: '请求路径',
      description:
        '切换标本 fetch 的配置文件：production（app-config.json）或 beta（app-config-beta.json）。两条 URL 相互独立——阻断与覆盖按 URL 匹配，只影响各自命中的那条。',
      control: {
        type: 'radio',
      },
      options: ['production', 'beta'],
    },
  },
  render: renderSpecimen,
  parameters: storySource(specimenSource),
} satisfies Meta<SpecimenArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Specimen: Story = {};
