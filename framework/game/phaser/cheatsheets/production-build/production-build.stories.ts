import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import bootBudgetSource from './boot-budget.ts?raw';
import {
  createBootBudget,
  type BootBudgetAction,
  type BootBudgetInstance,
  type BootBudgetSnapshot,
} from './boot-budget';

interface ProductionBuildArgs {
  levelAction?: BootBudgetAction;
}

const renderBootBudget = canvasStory({
  create: createBootBudget,
  apply(instance: BootBudgetInstance, args: ProductionBuildArgs) {
    instance.perform((args.levelAction as BootBudgetAction) ?? 'none');
  },
  readout(snapshot: BootBudgetSnapshot) {
    return [
      ['运行模式', snapshot.envMode],
      ['当前阶段', snapshot.phase],
      ['首屏最小集', snapshot.firstScreen],
      ['本轮入队', snapshot.queued],
      ['本轮进度', snapshot.progress],
      ['本轮传输字节', snapshot.roundBytes],
      ['bgm 选中源', snapshot.audioPick],
      ['bgm 缓存', snapshot.audioCache],
      ['bgm 播放', snapshot.bgmState],
    ];
  },
});

const meta: Meta<ProductionBuildArgs> = {
  id: 'production-build',
  title: '进阶/生产构建',
  tags: ['!dev'],
  // 默认 render,同时为每个 story 的 args 提供类型锚点;各 story 覆盖为自己的 render
  render: renderBootBudget,
};

export default meta;

type Story = StoryObj<ProductionBuildArgs>;

export const BootBudget: Story = {
  args: { levelAction: 'none' },
  argTypes: {
    levelAction: {
      name: '关卡操作',
      description:
        'enter:在 create 上下文按需排队关卡包(1 图 + 音频候选数组)并手动 load.start();exit:回到首屏视图,再次 enter 命中缓存零下载。',
      control: { type: 'radio' },
      options: ['none', 'enter', 'exit'],
      labels: { none: '无', enter: '进入关卡 1', exit: '回到首屏' },
    },
  },
  parameters: storySource(bootBudgetSource),
  render: renderBootBudget,
};
