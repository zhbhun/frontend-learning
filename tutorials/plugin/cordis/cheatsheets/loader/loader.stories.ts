import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import boardSource from './reconcile-board.ts?raw';
import {
  createReconcileBoard,
  type ReconcileBoardArgs,
  type ReconcileBoardInstance,
  type ReconcileBoardSnapshot,
} from './reconcile-board';

const VERDICT_NAMES: Record<string, string> = {
  keep: '保持',
  restart: '重启',
  rebuild: '重建',
  create: '新建',
  dispose: '销毁',
  note: '只记录',
  children: '调和子条目',
};

const renderBoard = canvasStory({
  create: createReconcileBoard,
  apply(instance: ReconcileBoardInstance, args: ReconcileBoardArgs) {
    instance.update(args);
  },
  readout(snapshot: ReconcileBoardSnapshot) {
    return [
      ['已勾选变更', snapshot.mutations.length],
      ...Object.entries(snapshot.counts).map(([key, value]) => [
        VERDICT_NAMES[key],
        value,
      ] as [string, unknown]),
    ];
  },
  captions: ['勾选 Controls 中的变更 → 逐条目查看处置与依据', '读数统计各处置的条目数量'],
});

const meta = {
  id: 'loader',
  title: '加载器与工程化/加载器',
  tags: ['!dev'],
  args: {
    changeGain: false,
    sameValue: false,
    disableGroup: false,
    reviveHop: false,
    removeQux: false,
    renameEcho: false,
    addFlip: false,
    childConfig: false,
  },
  argTypes: {
    changeGain: {
      name: 'echo 改 config',
      description: 'echo.config.gain 从 1 改为 2：diff 含 config → 整段重启（uid 不变）。',
    },
    sameValue: {
      name: 'echo 同值重写',
      description: '把 echo.config 换成等值的新对象：deepEqual 判等 → 保持不动。',
    },
    disableGroup: {
      name: '禁用分组',
      description: '给 Demo 分组加 disabled：组自身存活，子条目沿祖先链级联销毁。',
    },
    reviveHop: {
      name: '复活 hop',
      description: '移除 hop 的 disabled：无 fiber → init() 重新导入插件（新 uid）。',
    },
    removeQux: {
      name: '删除组内 qux',
      description: '从分组里删掉 qux：按 id 移除 → fiber.dispose()。',
    },
    renameEcho: {
      name: 'echo 换 name',
      description: '同 id 把 name 换成 ping：diff 不含 config → 只更新记录，运行中的插件不变。',
    },
    addFlip: {
      name: '新增 flip',
      description: '清单里加一个新条目 flip：新 id → init() 导入并注册。',
    },
    childConfig: {
      name: '组内 tap 改 config',
      description: 'tap.times 从 2 改为 5：分组的 config diff 触发子条目调和，tap 整段重启。',
    },
  },
  render: renderBoard,
  parameters: storySource(boardSource),
} satisfies Meta<ReconcileBoardArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Board: Story = {};
