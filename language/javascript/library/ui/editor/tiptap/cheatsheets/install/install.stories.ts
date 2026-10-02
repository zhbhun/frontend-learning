import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createInstallExample,
  type ExtensionSet,
  type InstallInstance,
  type InstallSnapshot,
} from './example';

interface InstallArgs {
  extensionSet: ExtensionSet;
}

const renderInstall = canvasStory({
  create: createInstallExample,
  apply(instance: InstallInstance, args: InstallArgs) {
    instance.update(args.extensionSet);
  },
  readout(snapshot: InstallSnapshot) {
    return [
      ['扩展集合', snapshot.setName],
      ['扩展数量', snapshot.extensionCount],
      ['节点类型数', snapshot.nodeCount],
      ['标记类型数', snapshot.markCount],
    ];
  },
});

const meta = {
  id: 'install',
  title: '上手/安装',
  tags: ['!dev'],
  args: {
    extensionSet: 'starter-kit' as ExtensionSet,
  },
  argTypes: {
    extensionSet: {
      name: '扩展集合',
      description: '切换安装进编辑器的扩展集合，观察 schema 与能力差异。',
      control: {
        type: 'select',
        // SB10 的 options 只收数组；展示文案放 control.labels（值 → 标签）
        labels: {
          'starter-kit': 'StarterKit（预打包）',
          minimal: '最小三件套',
        },
      },
      options: ['starter-kit', 'minimal'],
    },
  },
  render: renderInstall,
  parameters: storySource(exampleSource),
} satisfies Meta<InstallArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
