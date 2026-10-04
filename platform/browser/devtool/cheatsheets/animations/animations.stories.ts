import type { Meta, StoryObj } from '@storybook/html-vite';

import { storySource } from '../../assets/story-source.js';
import specimenSource from './animation-specimen.ts?raw';
import {
  createAnimationSpecimen,
  type AnimationKind,
  type AnimationSpecimenInstance,
  type AnimationSpecimenOptions,
} from './animation-specimen';

type SpecimenArgs = AnimationSpecimenOptions;

/*
  与其他课程的 DOM 标本相同的生命周期：舞台只创建一次，参数变化只调用 update；
  舞台被 Storybook 移出文档时释放实例（停止 rAF 读数循环、取消未完动画、摘除
  结束监听）并重置闭包，返回 Docs 页可完整重建。
  标本读数全部来自页面侧的动画模型与真实计时：Controls 的三个输入只设定
  「下一次播放」，慢放、重放、拖时序归读者在 DevTools 的 Animations 面板操作，
  两边都会在 readout 留下可核对的证据——面板把 10% 慢放设到文档时间轴上时，
  「实测耗时（墙钟）」会拉长到约 10 倍，而 Animation.currentTime 仍接近设定值。
*/
const renderSpecimen = (() => {
  let stage: HTMLElement | undefined;
  let instance: AnimationSpecimenInstance | undefined;

  return (args: SpecimenArgs) => {
    if (!stage || !instance) {
      stage = document.createElement('div');
      instance = createAnimationSpecimen(stage);

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
  id: 'animations',
  title: '模拟与测试/动画调试',
  tags: ['!dev'],
  args: {
    animationKind: 'transition',
    durationMs: 1200,
    easing: 'ease-in-out',
  },
  argTypes: {
    animationKind: {
      name: '动画类型',
      description:
        '四种实现放同一段滑行：前三种经过浏览器动画模型（页面 Animation 对象数 1，Animations 面板能捕获）；「JS 驱动（rAF）」每帧自算 transform（对象数 0，面板捕获不到），用来对照捕获边界。',
      control: {
        type: 'select',
        labels: {
          transition: 'CSS transition',
          keyframes: 'CSS animation',
          waapi: 'Web Animations API',
          raf: 'JS 驱动（rAF）',
        },
      },
      options: [
        'transition',
        'keyframes',
        'waapi',
        'raf',
      ] satisfies readonly AnimationKind[],
    },
    durationMs: {
      name: '时长（ms）',
      description:
        '设定下一次播放的动画时长。10% 速度档慢放时，「实测耗时」会拉长到约 10 倍，而 Animation.currentTime 仍接近这里的设定值——两把钟各量各的。',
      control: { type: 'range', min: 200, max: 3000, step: 100 },
    },
    easing: {
      name: '缓动曲线',
      description:
        '设定下一次播放的缓动函数，四种实现共用同一条曲线（rAF 模式由 JS 求值同款 cubic-bezier）。改缓动的正式入口在 Elements > Styles 的 Easing Editor。',
      control: {
        type: 'select',
        labels: {
          linear: 'linear（匀速）',
          ease: 'ease（浏览器默认）',
          'ease-in-out': 'ease-in-out（两端缓）',
          'cubic-bezier(0.34, 1.56, 0.64, 1)': 'cubic-bezier(0.34, 1.56, 0.64, 1)（过冲回弹）',
        },
      },
      options: ['linear', 'ease', 'ease-in-out', 'cubic-bezier(0.34, 1.56, 0.64, 1)'],
    },
  },
  render: renderSpecimen,
  parameters: storySource(specimenSource),
} satisfies Meta<SpecimenArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Specimen: Story = {};
