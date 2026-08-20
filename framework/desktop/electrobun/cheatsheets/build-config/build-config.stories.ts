import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import verdictSource from './watch-verdict.ts?raw';
import {
  createWatchVerdict,
  type WatchPreset,
  type WatchVerdictInstance,
  type WatchVerdictSnapshot,
} from './watch-verdict';

interface WatchArgs {
  preset: WatchPreset;
  changedFile: string;
  usePresetIgnore: boolean;
  extraWatch: string;
}

const renderVerdict = canvasStory({
  create: createWatchVerdict,
  apply(instance: WatchVerdictInstance, args: WatchArgs) {
    instance.update(args);
  },
  readout(snapshot: WatchVerdictSnapshot) {
    return [
      ['工程预设', snapshot.preset],
      ['保存的文件', snapshot.changedFile],
      ['watchIgnore', snapshot.watchIgnore],
      ['build.watch', snapshot.extraWatch],
      ['结论', snapshot.verdict],
      ['依据', snapshot.reason],
    ];
  },
});

const meta = {
  id: 'build-config',
  title: '构建与分发/构建/构建配置',
  tags: ['!dev'],
  args: {
    preset: 'vanilla-vite',
    changedFile: 'dist/assets/index-Df4xQ2.js',
    usePresetIgnore: true,
    extraWatch: '',
  },
  argTypes: {
    preset: {
      name: '工程预设',
      description:
        '决定监听目录与 copy 源的配置基线：hello-world（tester）或 vanilla-vite（vite-tester）。',
      options: ['hello-world', 'vanilla-vite'],
      control: {
        type: 'inline-radio',
        labels: {
          'hello-world': 'hello-world 工程',
          'vanilla-vite': 'vanilla-vite 工程',
        },
      },
    },
    changedFile: {
      name: '保存的文件',
      description:
        '刚保存的项目相对路径，例如 src/mainview/index.html 或 dist/assets/index-Ab12Cd.js。',
      control: { type: 'text' },
    },
    usePresetIgnore: {
      name: '模板 watchIgnore',
      description:
        '是否启用模板自带的 watchIgnore：vanilla-vite 为 dist/**；hello-world 模板没有条目。',
      control: { type: 'boolean' },
    },
    extraWatch: {
      name: 'build.watch 追加',
      description: '额外监听目录，逗号分隔，例如 src/shared。对应配置 build.watch。',
      control: { type: 'text' },
    },
  },
  render: renderVerdict,
  parameters: storySource(verdictSource),
} satisfies Meta<WatchArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WatchVerdict: Story = {};
