import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import {
  OPS_SCENARIOS,
  createOpsLab,
  type OpsLabArgs,
  type OpsLabInstance,
  type OpsLabSnapshot,
} from './concurrent-ops-lab';
import {
  DUAL_ACTIONS,
  createDualInstanceLab,
  type DualInstanceArgs,
  type DualInstanceInstance,
  type DualInstanceSnapshot,
} from './dual-instance-lab';
import { reactStage } from './react-stage';
import opsSource from './concurrent-ops-lab.ts?raw';
import dualSource from './dual-instance-lab.ts?raw';

/**
 * 每个故事独立的舞台闭包：并发实验台用 2D canvas，双实例实验台用 React
 * 挂载点，各自持有舞台互不串位。Controls 的选择经 args 驱动实例执行。
 */
const renderOpsLab = canvasStory({
  create: createOpsLab,
  apply(instance: OpsLabInstance, args: OpsLabArgs) {
    instance.update(args);
  },
  readout(snapshot: OpsLabSnapshot) {
    return snapshot.rows;
  },
});

const renderDualLab = reactStage({
  create: createDualInstanceLab,
  apply(instance: DualInstanceInstance, args: DualInstanceArgs) {
    instance.update(args);
  },
  readout(snapshot: DualInstanceSnapshot) {
    return [
      ['根文档', snapshot.rootUrl],
      ['互联', `实例 A 已连接 ${snapshot.peers} 个 peer`],
      [
        '同步状态',
        snapshot.synced === null
          ? '—（文档尚未就绪）'
          : snapshot.synced
            ? '两侧 heads 一致 → 已收敛'
            : '同步中……',
      ],
      ['最近事件', snapshot.lastEvent],
    ];
  },
  captions: ['实例 A', '实例 B'],
});

interface CourseArgs extends OpsLabArgs, DualInstanceArgs {}

const meta = {
  id: 'collab-todo',
  title: '应用集成/实战：协同待办应用',
  tags: ['!dev'],
} satisfies Meta<CourseArgs>;

export default meta;

type Story = StoryObj<CourseArgs>;

export const ConcurrentOpsLab: Story = {
  name: '并发操作收敛',
  args: {
    scenario: OPS_SCENARIOS[0],
  } satisfies OpsLabArgs,
  argTypes: {
    scenario: {
      name: '并发场景',
      description:
        '每次切换都从新基线重跑：两个副本各自离线 change 一次，再双向 merge 对比 heads。',
      control: { type: 'radio' },
      options: OPS_SCENARIOS,
      labels: {
        'concurrent-add': '并发各加一条',
        'rename-conflict': '并发改同一条标题',
        'toggle-vs-rename': '勾选与改名并发',
      },
    },
  },
  render: renderOpsLab,
  parameters: storySource(opsSource),
};

export const DualInstanceLab: Story = {
  name: '双实例协同应用',
  args: {
    action: DUAL_ACTIONS[0],
  } satisfies DualInstanceArgs,
  argTypes: {
    action: {
      name: '实例操作',
      description:
        'restart-b：shutdown 后用同一套工厂重建实例 B 并 find 原 URL（模拟页面刷新）；reset：清掉 IndexedDB 演示库与根 URL 后从头开始。',
      control: { type: 'select' },
      options: DUAL_ACTIONS,
      labels: {
        none: '无',
        'restart-b': '重启实例 B（模拟刷新）',
        reset: '重置演示（清存储重建）',
      },
    },
  },
  render: renderDualLab,
  parameters: storySource(dualSource),
};
