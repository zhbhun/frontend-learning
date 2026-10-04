import type { Meta, StoryObj } from '@storybook/html-vite';

import { storySource } from '../../assets/story-source.js';
import workerSource from './sw-demo-worker.js?raw';
import swV1Source from './sw-v1.js?raw';
import swV2Source from './sw-v2.js?raw';
import specimenSource from './sw-specimen.ts?raw';
import {
  createSwSpecimen,
  type SwSpecimenInstance,
  type SwTargetId,
} from './sw-specimen';

interface SpecimenArgs {
  target: SwTargetId;
  claim: boolean;
  request: boolean;
}

/*
  Show code：本课的输入 → 输出链跨越页面（sw-specimen.ts）与两个线程
  （Service Worker v1/v2、演示 Worker），按执行关系组合成一份源码投影。
*/
const combinedSource = [
  '/* ======== sw-specimen.ts（页面：注册、轮询与读数） ======== */',
  specimenSource,
  '/* ======== sw-v1.js（Service Worker 线程 v1） ======== */',
  swV1Source,
  '/* ======== sw-v2.js（Service Worker 线程，与 v1 仅字节级版本差异） ======== */',
  swV2Source,
  '/* ======== sw-demo-worker.js（scope 内的演示 Worker） ======== */',
  workerSource,
].join('\n\n');

/*
  与其他课程的 DOM 标本相同的生命周期：舞台只创建一次，参数变化只触发一次操作；
  舞台被 Storybook 移出文档时释放实例并重置闭包，返回 Docs 页可完整重建。
*/
const renderSpecimen = (() => {
  let stage: HTMLElement | undefined;
  let instance: SwSpecimenInstance | undefined;

  return (args: SpecimenArgs) => {
    if (!stage || !instance) {
      stage = document.createElement('div');
      instance = createSwSpecimen(stage);

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
  id: 'service-worker-pwa',
  title: '应用与安全/Service Worker 与 PWA',
  tags: ['!dev'],
  args: {
    target: 'v1',
    claim: false,
    request: false,
  },
  argTypes: {
    target: {
      name: '目标版本',
      description:
        '驱动真实注册：切到 v1 / v2 调用 register()（v2 是对当前注册的更新，脚本字节不同才会安装新版本），切到「未注册」调用 unregister()。',
      control: {
        type: 'select',
        labels: {
          none: '未注册（注销）',
          v1: 'v1：注册 sw-v1.js',
          v2: 'v2：更新为 sw-v2.js',
        },
      },
      options: ['none', 'v1', 'v2'],
    },
    claim: {
      name: '立即接管',
      description:
        '向 waiting 中的新版本发送 skipWaiting 指令（激活后 clients.claim() 接管已有客户端）；取消勾选不会撤销已完成的接管。',
      control: {
        type: 'boolean',
      },
    },
    request: {
      name: '发起演示请求',
      description:
        '通过演示 Worker fetch 一次 /sw-demo/api/quote.json：SW 控制时读到缓存响应（200），勾选面板 Bypass for network 或注销后是网络直连的 404。关闭再打开可重复发起。',
      control: {
        type: 'boolean',
      },
    },
  },
  render: renderSpecimen,
  parameters: storySource(combinedSource),
} satisfies Meta<SpecimenArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Specimen: Story = {};
