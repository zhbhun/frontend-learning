import type { Meta, StoryObj } from '@storybook/html-vite';

import { storySource } from '../../assets/story-source.js';
import specimenSource from './viewport-specimen.ts?raw';
import {
  createViewportSpecimen,
  type ViewportSpecimenInstance,
} from './viewport-specimen';

type SpecimenArgs = {
  specimenWidth: number;
};

/*
  与其他课程的 DOM 标本相同的生命周期：舞台只创建一次，参数变化只调用 update；
  舞台被 Storybook 移出文档时释放实例（断开 ResizeObserver、移除 window 上的
  deviceorientation 监听与轮询）并重置闭包，返回 Docs 页可完整重建。
  标本读数全部来自页面真实收到的输入：Controls「标本宽度」只改标本自身容器宽，
  整页视口归读者在 DevTools 里开启的 Device Mode 管——视口拖动、Device Type
  切换、Sensors 的位置与朝向覆盖都会在 readout 留下可核对的证据。
*/
const renderSpecimen = (() => {
  let stage: HTMLElement | undefined;
  let instance: ViewportSpecimenInstance | undefined;

  return (args: SpecimenArgs) => {
    if (!stage || !instance) {
      stage = document.createElement('div');
      instance = createViewportSpecimen(stage);

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
  id: 'device-mode',
  title: '模拟与测试/设备与网络模拟',
  tags: ['!dev'],
  args: {
    specimenWidth: 0,
  },
  argTypes: {
    specimenWidth: {
      name: '标本宽度',
      description:
        '把标本容器固定为该 CSS 像素宽；0 = 自适应（跟随 Docs 页面流式排布）。它改的是标本自己的容器宽，不是整页视口——要动视口，请打开 DevTools 的 Toggle device toolbar 拖动宽度。两条路都会在 readout 留下真实读数：滑块改变「断点（容器）」，Device Mode 改变「媒体查询（视口）」。',
      control: {
        type: 'range',
        min: 0,
        max: 1440,
        step: 10,
      },
    },
  },
  render: renderSpecimen,
  parameters: storySource(specimenSource),
} satisfies Meta<SpecimenArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Specimen: Story = {};
