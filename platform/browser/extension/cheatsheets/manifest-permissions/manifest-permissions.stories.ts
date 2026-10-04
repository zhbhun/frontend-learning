import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createPermissionExample,
  type PermissionInstance,
  type PermissionOptions,
  type PermissionSnapshot,
} from './example';

const renderInteractive = canvasStory({
  create: createPermissionExample,
  apply(instance: PermissionInstance, args: PermissionOptions) {
    instance.update(args);
  },
  readout(snapshot: PermissionSnapshot) {
    return [
      ['manifest 权限字段', snapshot.manifestKeys],
      ['安装时警告', snapshot.installSummary],
      ['运行时可申请', snapshot.runtimeSummary],
    ];
  },
});

const meta = {
  id: 'manifest-permissions',
  title: '核心机制/Manifest 与权限',
  tags: ['!dev'],
  args: {
    tabs: true,
    storage: true,
    notifications: false,
    host: 'all',
    optional: false,
  },
  argTypes: {
    tabs: {
      name: 'tabs',
      description: '具名权限：读取标签页地址等敏感属性（有安装警告）。',
      control: { type: 'boolean' },
    },
    storage: {
      name: 'storage',
      description: '具名权限：chrome.storage 调用资格（无安装警告）。',
      control: { type: 'boolean' },
    },
    notifications: {
      name: 'notifications',
      description: '具名权限：显示通知（有安装警告）。',
      control: { type: 'boolean' },
    },
    host: {
      name: '主机权限',
      description:
        'host_permissions 档位：none 不声明；site 声明 https://example.com/*；all 声明 <all_urls>（会吸收 tabs 的警告）。',
      control: { type: 'radio' },
      options: ['none', 'site', 'all'],
    },
    optional: {
      name: '声明为 optional',
      description:
        '把以上能力从 permissions / host_permissions 挪进 optional_permissions / optional_host_permissions，观察安装对话框与运行时面板的变化。',
      control: { type: 'boolean' },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<PermissionOptions>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
