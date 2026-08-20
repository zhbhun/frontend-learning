import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import patchChainSource from './patch-chain.ts?raw';
import {
  createPatchChain,
  type PatchChainInstance,
  type PatchChainSnapshot,
  type ServerPatchPolicy,
} from './patch-chain';

interface PatchChainArgs {
  userVersion: string;
  serverPatches: ServerPatchPolicy;
  localTar: boolean;
}

const renderPatchChain = canvasStory({
  create: createPatchChain,
  apply(instance: PatchChainInstance, args: PatchChainArgs) {
    instance.update(args);
  },
  readout(snapshot: PatchChainSnapshot) {
    return [
      ['结论', snapshot.verdict],
      ['补丁跳数（成功/需要）', snapshot.hopsApplied],
      ['usedPatchPath', snapshot.usedPatchPath],
      ['断点补丁', snapshot.breakAt],
    ];
  },
});

const meta = {
  id: 'updater',
  title: '构建与分发/分发/自动更新',
  tags: ['!dev'],
  args: {
    userVersion: 'v1.2.0',
    serverPatches: 'all',
    localTar: true,
  },
  argTypes: {
    userVersion: {
      name: '用户当前版本',
      description:
        '应用内 version.json 的 hash 对应发布链上的哪个版本；v1.3.0 是远端 update.json 指向的最新版。',
      options: ['v1.0.0', 'v1.1.0', 'v1.2.0', 'v1.3.0'],
      control: {
        type: 'inline-radio',
        labels: {
          'v1.0.0': 'v1.0.0（落后 3 版）',
          'v1.1.0': 'v1.1.0（落后 2 版）',
          'v1.2.0': 'v1.2.0（落后 1 版）',
          'v1.3.0': 'v1.3.0（已是最新）',
        },
      },
    },
    serverPatches: {
      name: '服务器补丁保留',
      description:
        '托管端保留了哪些 {fromHash}.patch：全部历史补丁（可逐级追赶）、只保留最近一次构建生成的一条（只服务落后一版的用户）、或没有任何补丁。',
      options: ['all', 'latest-only', 'none'],
      control: {
        type: 'inline-radio',
        labels: {
          all: '全部保留',
          'latest-only': '只留最近一条',
          none: '没有补丁',
        },
      },
    },
    localTar: {
      name: '本地当前版 tar',
      description:
        'self-extraction 目录里是否有当前版本的 {hash}.tar：上次更新成功后一定保留最新一份；新装或被清理过则没有。',
      control: { type: 'boolean' },
    },
  },
  render: renderPatchChain,
  parameters: storySource(patchChainSource),
} satisfies Meta<PatchChainArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const PatchChain: Story = {};
