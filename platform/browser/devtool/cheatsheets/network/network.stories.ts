import type { Meta, StoryObj } from '@storybook/html-vite';

import { storySource } from '../../assets/story-source.js';
import specimenSource from './fetch-specimen.ts?raw';
import {
  createRequestSpecimen,
  type RequestSpecimenInstance,
  type ScenarioId,
} from './fetch-specimen';

interface SpecimenArgs {
  scenario: ScenarioId;
}

/*
  与其他课程的 DOM 标本相同的生命周期：舞台只创建一次，参数变化只触发一轮请求；
  舞台被 Storybook 移出文档时释放实例并重置闭包，返回 Docs 页可完整重建。
  每次参数变化都真实发出 fetch 请求，读者在 DevTools 的 Network 面板里观察。
*/
const renderSpecimen = (() => {
  let stage: HTMLElement | undefined;
  let instance: RequestSpecimenInstance | undefined;

  return (args: SpecimenArgs) => {
    if (!stage || !instance) {
      stage = document.createElement('div');
      instance = createRequestSpecimen(stage);

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
  id: 'network',
  title: '网络调试/查看请求',
  tags: ['!dev'],
  args: {
    scenario: 'success',
  },
  argTypes: {
    scenario: {
      name: '请求场景',
      description:
        '选择或重拨即真实发出一批 fetch 请求；切到 DevTools 的 Network 面板对照观察——面板只记录打开期间的请求，先开面板再切场景。「慢速」并发 12 个请求，本地 HTTP/1.1 开发服务器上后发的请求会排队，在 Timing 页签看 Queueing。',
      control: {
        type: 'select',
        labels: {
          success: '成功 JSON（单个 200）',
          'not-found': '404（失败请求）',
          slow: '慢速（并发排队）',
          batch: '混合一批（4 成功 + 2 失败）',
        },
      },
      options: ['success', 'not-found', 'slow', 'batch'],
    },
  },
  render: renderSpecimen,
  parameters: storySource(specimenSource),
} satisfies Meta<SpecimenArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Specimen: Story = {};
