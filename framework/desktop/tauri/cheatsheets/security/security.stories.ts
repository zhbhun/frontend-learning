import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createExample,
  type ExampleArgs,
  type ExampleInstance,
  type ExampleSnapshot,
} from './example';

const renderInteractive = canvasStory({
  create: createExample,
  apply(instance: ExampleInstance, args: ExampleArgs) {
    instance.update(args);
  },
  readout(snapshot: ExampleSnapshot) {
    return [
      ['模拟攻击', snapshot.attack],
      ['攻击结果', snapshot.result],
      ['结论', snapshot.summary],
    ];
  },
});

const meta = {
  id: 'security',
  title: '桌面进阶/安全加固',
  tags: ['!dev'],
  args: {
    csp: '收紧(仅 self)',
    withGlobalTauri: false,
    remoteGrant: false,
    attack: '内联脚本注入',
  },
  argTypes: {
    csp: {
      name: 'CSP(app.security.csp)',
      description:
        '未配置 = 页面没有任何加载策略;宽松把一个 CDN 域放进了 script-src;收紧只允许 self,打包脚本靠自动注入的 nonce/hash 放行。',
      control: {
        type: 'select',
      },
      options: ['未配置', '宽松(带 CDN)', '收紧(仅 self)'],
    },
    withGlobalTauri: {
      name: 'withGlobalTauri',
      description:
        '开启后全套 Tauri API 注入 window.__TAURI__,页面里的任何脚本(含注入脚本)可直接调用。',
      control: {
        type: 'boolean',
      },
    },
    remoteGrant: {
      name: 'capability 授权 remote 域',
      description:
        '模拟 capability 里写了 remote.urls: ["https://partner.example"]——远程页面从零授权(默认拒绝)变为按权限并集放行。',
      control: {
        type: 'boolean',
      },
    },
    attack: {
      name: '模拟攻击',
      description:
        '选择一类危险动作,右栏重放它要连过的防线(① CSP → ② IPC 授权(ACL) → ③ scope)。',
      control: {
        type: 'select',
      },
      options: ['内联脚本注入', 'CDN 脚本注入', '远程页面调 IPC', 'fs 越出应用目录'],
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<ExampleArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
