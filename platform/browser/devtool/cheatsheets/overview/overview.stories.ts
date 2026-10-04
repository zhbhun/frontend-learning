import type { Meta, StoryObj } from '@storybook/html-vite';

import { storySource } from '../../assets/story-source.js';
import panelMapSource from './panel-map.ts?raw';
import {
  createPanelFinder,
  PANEL_MAP,
  type PanelFinderInstance,
} from './panel-map';

interface FinderArgs {
  task: string;
}

const TASK_OPTIONS = PANEL_MAP.map((entry) => entry.task);

/*
  与 canvasStory 相同的生命周期：舞台只创建一次，参数变化只调用 update；
  舞台被 Storybook 移出文档时释放实例并重置闭包，返回 Docs 页可完整重建。
*/
const renderFinder = (() => {
  let stage: HTMLElement | undefined;
  let instance: PanelFinderInstance | undefined;

  return (args: FinderArgs) => {
    if (!stage || !instance) {
      stage = document.createElement('div');
      instance = createPanelFinder(stage);

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

    instance.update(args.task);
    return stage;
  };
})();

const meta = {
  id: 'overview',
  title: '上手与界面/认识 DevTools',
  tags: ['!dev'],
  args: {
    task: PANEL_MAP[0].task,
  },
  argTypes: {
    task: {
      name: '调试任务',
      description: '选一个调试任务，看它对应哪个面板、怎么打开。',
      control: {
        type: 'select',
      },
      options: TASK_OPTIONS,
    },
  },
  render: renderFinder,
  parameters: storySource(panelMapSource),
} satisfies Meta<FinderArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const PanelFinder: Story = {};
