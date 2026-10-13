import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import twinEditorsSource from './quill-twin-editors.ts?raw';
import {
  createQuillTwinEditors,
  type HistoryMode,
  type TwinEditorsInstance,
  type TwinEditorsSnapshot,
} from './quill-twin-editors';

/** 范例的控件集合。 */
interface QuillAndMoreArgs {
  relay?: boolean;
  cursorRelay?: boolean;
  historyMode?: HistoryMode;
}

const renderTwinEditors = canvasStory({
  create: createQuillTwinEditors,
  apply(instance: TwinEditorsInstance, args: QuillAndMoreArgs) {
    instance.update({
      relay: args.relay ?? true,
      cursorRelay: args.cursorRelay ?? true,
      historyMode: args.historyMode ?? 'default',
    });
  },
  readout(snapshot: TwinEditorsSnapshot) {
    return [
      ['两端内容一致', snapshot.consistent ? '一致' : '不一致'],
      [
        '送达 update 字节(A→B / B→A)',
        `${snapshot.bytesAB} / ${snapshot.bytesBA}`,
      ],
      [
        'B 光标在 A 端位置',
        snapshot.cursor,
      ],
      ['A 端 Y.Text delta', snapshot.deltaA],
      ['撤销栈深度(A / B)', snapshot.undoStacks],
      ['history 模式', snapshot.historyMode],
    ];
  },
  captions: ['客户端 A(阿宁)', '客户端 B(小柏)'],
});

const meta = {
  id: 'quill-and-more',
  title: '编辑器绑定/Quill 与其他绑定',
  tags: ['!dev'],
} satisfies Meta<QuillAndMoreArgs>;

export default meta;

type Story = StoryObj<QuillAndMoreArgs>;

export const TwinEditors: Story = {
  name: '双编辑器同页互同步',
  args: {
    relay: true,
    cursorRelay: true,
    historyMode: 'default',
  },
  argTypes: {
    relay: {
      name: '文档中继',
      description:
        '关闭即模拟断线:文档 update 不再送达对端;重新开启时按 state vector 互补差量并恢复实时同步。',
      control: { type: 'boolean' },
    },
    cursorRelay: {
      name: '光标中继(awareness)',
      description:
        '关闭后 awareness 光标消息不再转发:B 的光标位置在 A 端冻结——对应「没接 awareness」的故障现象。',
      control: { type: 'boolean' },
    },
    historyMode: {
      name: 'history 模式',
      description:
        'default(userOnly: false)把远端变更也记入本端撤销栈;userOnly 只记本端变更。切换会重建编辑器(撤销栈清零)。',
      control: {
        type: 'select',
        labels: {
          default: '默认(协作下慎用)',
          userOnly: 'userOnly: true(只记本端)',
        },
      },
      options: ['default', 'userOnly'],
    },
  },
  render: renderTwinEditors,
  parameters: storySource(twinEditorsSource),
};
