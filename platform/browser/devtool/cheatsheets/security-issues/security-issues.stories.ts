import type { Meta, StoryObj } from '@storybook/html-vite';

import { storySource } from '../../assets/story-source.js';
import locatorSource from './issue-locator.ts?raw';
import {
  createIssueLocator,
  type LocatorInstance,
  type SymptomId,
} from './issue-locator';

interface LocatorArgs {
  symptom: SymptomId;
  trigger: boolean;
}

/*
  与其他课程的 DOM 标本相同的生命周期：舞台只创建一次，参数变化只触发一次操作；
  舞台被 Storybook 移出文档时释放实例并重置闭包，返回 Docs 页可完整重建。
*/
const renderLocator = (() => {
  let stage: HTMLElement | undefined;
  let instance: LocatorInstance | undefined;

  return (args: LocatorArgs) => {
    if (!stage || !instance) {
      stage = document.createElement('div');
      instance = createIssueLocator(stage);

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
  id: 'security-issues',
  title: '应用与安全/安全与问题排查',
  tags: ['!dev'],
  args: {
    symptom: 'mixed',
    trigger: false,
  },
  argTypes: {
    symptom: {
      name: '选择现象',
      description:
        '手头的故障现象。readout 给出对应的检查面板、Issue 类别与修复方向，并如实标注能否在本页复现：只有弃用警告能在本页真实触发。',
      control: {
        type: 'select',
        labels: {
          mixed: 'Console 报 Mixed Content（混合内容）',
          http: '地址栏显示「不安全」（页面走 HTTP）',
          cert: '证书警告（NET::ERR_CERT_*）',
          cookie: 'Cookie 被拦截／标记（SameSite、第三方 cookie）',
          cors: 'Console 报 CORS 跨源错误',
          csp: 'Console 报 CSP 违规（Content-Security-Policy）',
          deprecation: 'Console 报 [Deprecation] 弃用警告',
        },
      },
      options: ['mixed', 'http', 'cert', 'cookie', 'cors', 'csp', 'deprecation'],
    },
    trigger: {
      name: '触发演示 Issue',
      description:
        '在本页执行一次主线程同步 XHR（向自身地址 GET 当前文档，响应读完即弃）：Console 立即出现 [Deprecation] 弃用警告，打开 DevTools 的 Issues 面板能看到对应条目。关闭再打开可重复触发。',
      control: {
        type: 'boolean',
      },
    },
  },
  render: renderLocator,
  parameters: storySource(locatorSource),
} satisfies Meta<LocatorArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Locator: Story = {};
