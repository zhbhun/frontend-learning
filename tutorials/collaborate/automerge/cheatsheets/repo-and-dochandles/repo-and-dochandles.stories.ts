import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import {
  LIFECYCLE_ACTION_OPTIONS,
  createLifecycleDemo,
  shortenUrl,
  type LifecycleArgsView,
  type LifecycleInstance,
  type LifecycleSnapshot,
} from './lifecycle-lab';
import {
  TRANSFER_MODE_OPTIONS,
  createTransferDemo,
  type TransferArgsView,
  type TransferInstance,
  type TransferSnapshot,
} from './transfer-lab';
import lifecycleSource from './lifecycle-lab.ts?raw';
import transferSource from './transfer-lab.ts?raw';

/**
 * 每个故事独立的 canvasStory 闭包：同一页上多个 Canvas 各自持有舞台，
 * 互不串位。动作选择与文本输入都通过 args 重新驱动实例执行。
 */
function lifecycleRenderer() {
  return canvasStory({
    create: createLifecycleDemo,
    apply(instance: LifecycleInstance, args: LifecycleArgsView) {
      instance.update(args);
    },
    readout(snapshot: LifecycleSnapshot) {
      return [
        [
          'handle 状态',
          `${snapshot.state}（isReady ${snapshot.isReady ? '是' : '否'}）`,
        ],
        ['handle URL', snapshot.url ? shortenUrl(snapshot.url) : '—'],
        [
          'doc() 读到',
          snapshot.docTitle === null
            ? '—（不可读）'
            : `title "${snapshot.docTitle}"，items ${snapshot.itemCount} 条`,
        ],
        ['最近一次操作', snapshot.lastResult],
      ];
    },
  });
}

function transferRenderer() {
  return canvasStory({
    create: createTransferDemo,
    apply(instance: TransferInstance, args: TransferArgsView) {
      instance.update(args);
    },
    readout(snapshot: TransferSnapshot) {
      return [
        [
          'B 拿到的 URL',
          snapshot.sameUrl === null
            ? '—（find 被拒绝）'
            : snapshot.sameUrl
              ? '与 A 相同'
              : '全新 URL（另存为）',
        ],
        [
          'B 读到的内容',
          snapshot.titleB === null
            ? '—'
            : `title "${snapshot.titleB}"，items ${snapshot.itemsB.length} 条`,
        ],
        [
          'A 是否看到 B 的追加',
          snapshot.aSeesB === null
            ? '—（B 未写入）'
            : snapshot.aSeesB
              ? '是'
              : '否（没有网络）',
        ],
        [
          '搬运的字节数',
          snapshot.bytes === null ? '—' : `${snapshot.bytes} 字节`,
        ],
      ];
    },
  });
}

interface CourseArgs extends LifecycleArgsView, TransferArgsView {}

const meta = {
  id: 'repo-and-dochandles',
  title: 'Repo 同步层/Repo 与 DocHandle',
  tags: ['!dev'],
  args: {
    action: LIFECYCLE_ACTION_OPTIONS[0],
    title: '第一份文档',
    mode: TRANSFER_MODE_OPTIONS[1],
    note: 'B 写的一行',
  },
  argTypes: {
    action: {
      name: 'handle 操作',
      description:
        '在同一个内存仓库上执行的动作：新建、修改、按 URL 查找的三种结局、删除。动作会累积生效。',
      control: { type: 'select' },
      options: LIFECYCLE_ACTION_OPTIONS,
    },
    title: {
      name: '写入标题',
      description: 'create 的初值标题；change 时写入的新标题。',
      control: { type: 'text' },
    },
    mode: {
      name: '搬运方式',
      description:
        '设备 B 如何获得 A 的文档：直接 find（无网络会被拒绝）、export/import 并保住 docId（同一 URL）、不带 docId（全新 URL）。',
      control: { type: 'radio' },
      options: TRANSFER_MODE_OPTIONS,
    },
    note: {
      name: 'B 追加的一行',
      description:
        'import 成功后 B 在文档里追加的内容，用来验证 A 看不见它（没有网络）。',
      control: { type: 'text' },
    },
  },
  render: lifecycleRenderer(),
} satisfies Meta<CourseArgs>;

export default meta;

type Story = StoryObj<CourseArgs>;

export const LifecycleLab: Story = {
  name: '生命周期与 find',
  args: { action: LIFECYCLE_ACTION_OPTIONS[0] },
  render: lifecycleRenderer(),
  parameters: storySource(lifecycleSource),
};

export const TransferLab: Story = {
  name: '离线搬运 export/import',
  args: { mode: TRANSFER_MODE_OPTIONS[1] },
  render: transferRenderer(),
  parameters: storySource(transferSource),
};
