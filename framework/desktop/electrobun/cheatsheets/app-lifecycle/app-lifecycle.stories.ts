import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import quitSequenceSource from './quit-sequence.ts?raw';
import {
  createQuitSequence,
  type QuitSequenceInstance,
  type QuitSequenceSnapshot,
  type QuitTrigger,
} from './quit-sequence';

interface QuitSequenceArgs {
  trigger: QuitTrigger;
  veto: boolean;
  viaAppOn: boolean;
}

const renderQuitSequence = canvasStory({
  create: createQuitSequence,
  apply(instance: QuitSequenceInstance, args: QuitSequenceArgs) {
    instance.update(args);
  },
  readout(snapshot: QuitSequenceSnapshot) {
    return [
      ['退出触发源', snapshot.trigger],
      ['before-quit', snapshot.beforeQuit],
      ['否决判定', snapshot.vetoResult],
      ['最终结果', snapshot.outcome],
    ];
  },
});

const meta = {
  id: 'app-lifecycle',
  title: '系统集成/应用运行时/应用生命周期',
  tags: ['!dev'],
  args: {
    trigger: 'system',
    veto: false,
    viaAppOn: false,
  },
  argTypes: {
    trigger: {
      name: '退出触发源',
      description:
        '系统退出（Cmd+Q / 应用菜单）、最后一个窗口关闭、app.quit() 与 process.exit() 都汇聚到同一条 quit() 序列。',
      options: ['system', 'last-window', 'app-quit', 'process-exit'],
      control: {
        type: 'inline-radio',
        labels: {
          system: 'Cmd+Q / 应用菜单退出',
          'last-window': '最后一个窗口关闭',
          'app-quit': 'app.quit()',
          'process-exit': 'process.exit()',
        },
      },
    },
    veto: {
      name: 'before-quit 否决（allow: false）',
      description:
        'handler 是否设置 e.response = { allow: false }。否决必须在 handler 返回前同步设置才有效。',
      control: { type: 'boolean' },
    },
    viaAppOn: {
      name: '用 app.on 订阅（只收 payload）',
      description:
        'app.on 的 handler 只收到事件 payload，拿不到 event 与 response；要否决必须用 Electrobun.events.on 订阅。',
      control: { type: 'boolean' },
    },
  },
  render: renderQuitSequence,
  parameters: storySource(quitSequenceSource),
} satisfies Meta<QuitSequenceArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const QuitSequence: Story = {};
