import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import simSource from './state-sync-sim.ts?raw';
import {
  createSyncSim,
  type ReloadChoice,
  type SyncInstance,
  type SyncMode,
  type SyncSimOptions,
  type SyncSimSnapshot,
} from './state-sync-sim';

type SyncArgs = SyncSimOptions;

const SYNC_MODES: SyncMode[] = ['渲染端私有', '广播（无快照）', '快照 + 广播'];
const RELOAD_CHOICES: ReloadChoice[] = ['从不', '第 2 次修改后'];

const renderInteractive = canvasStory({
  create: createSyncSim,
  apply(instance: SyncInstance, args: SyncArgs) {
    instance.update(args);
  },
  readout(snapshot: SyncSimSnapshot) {
    return [
      ['窗口 A 看到的值', snapshot.aValueLabel],
      ['窗口 B 看到的值', snapshot.bValueLabel],
      ['两窗口一致', snapshot.consistentLabel],
      ['B 当前值的来源', snapshot.sourceLabel],
    ];
  },
});

const meta = {
  id: 'state-management',
  title: '框架集成/状态管理',
  tags: ['!dev'],
  args: {
    syncMode: '广播（无快照）',
    changeCount: 4,
    reloadAt: '第 2 次修改后',
  } satisfies SyncArgs,
  argTypes: {
    syncMode: {
      name: '同步方式',
      description: '两个窗口之间采用的同步方式，决定窗口 B 能否跟上窗口 A。',
      control: {
        type: 'select',
        options: SYNC_MODES,
      },
    },
    changeCount: {
      name: '窗口 A 已发起修改',
      description: '窗口 A 发起的修改次数，每次状态值 +1。',
      control: {
        type: 'range',
        min: 0,
        max: 4,
        step: 1,
      },
    },
    reloadAt: {
      name: '窗口 B 重新加载',
      description: '窗口 B 是否在第 2 次修改后刷新，模拟迟到窗口与刷新场景。',
      control: {
        type: 'select',
        options: RELOAD_CHOICES,
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(simSource),
} satisfies Meta<SyncArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
