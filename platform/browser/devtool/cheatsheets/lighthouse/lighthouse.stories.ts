import type { Meta, StoryObj } from '@storybook/html-vite';

import { storySource } from '../../assets/story-source.js';
import specimenSource from './audit-specimen.ts?raw';
import {
  createAuditSpecimen,
  type AuditSpecimenInstance,
  type Density,
} from './audit-specimen';

type SpecimenArgs = {
  density: '集中' | '少量';
};

/*
  与其他课程的 DOM 标本相同的生命周期：舞台只创建一次，舞台被 Storybook 移出
  文档时释放实例并重置闭包，返回 Docs 页可完整重建。
  Controls 的「问题密度」是本课唯一的输入：「集中」（默认）埋入全部可检测问题
  （低对比度文本 ×2、图片缺 alt ×2、按钮缺可访问名称 ×1、标题层级跳跃 ×1、
  80 格回顾网格），「少量」只保留低对比度与缺 alt 各一处。注意 Lighthouse 的
  Navigation 模式审计会重载页面，密度回到默认的「集中」；要审计切换后的状态
  请用 Snapshot 模式。
*/
const renderSpecimen = (() => {
  let stage: HTMLElement | undefined;
  let instance: AuditSpecimenInstance | undefined;
  let lastDensity: Density | undefined;

  return (args: SpecimenArgs) => {
    if (!stage || !instance) {
      stage = document.createElement('div');
      instance = createAuditSpecimen(stage);

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
              lastDensity = undefined;
            }
          }
        });
        observer.observe(parent, { childList: true });
      });
    }

    const density: Density = args.density === '少量' ? 'sparse' : 'concentrated';
    if (density !== lastDensity) {
      lastDensity = density;
      instance.update(density);
    }
    return stage;
  };
})();

const meta = {
  id: 'lighthouse',
  title: '模拟与测试/Lighthouse 审计',
  tags: ['!dev'],
  args: {
    density: '集中',
  },
  argTypes: {
    density: {
      name: '问题密度',
      description:
        '「集中」埋入全部可检测问题：低对比度文本 ×2、图片缺 alt ×2、按钮缺可访问名称 ×1、标题层级跳跃 ×1、80 格回顾网格；「少量」只保留低对比度与缺 alt 各一处。注意：Navigation 模式审计会重载页面、密度回到默认的「集中」；要审计切换后的状态请用 Snapshot 模式。',
      control: {
        type: 'radio',
      },
      options: ['集中', '少量'],
    },
  },
  render: renderSpecimen,
  parameters: storySource(specimenSource),
} satisfies Meta<SpecimenArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Specimen: Story = {};
