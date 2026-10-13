import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import twinEditorsSource from './prosemirror-twin-editors.ts?raw';
import {
  createTwinEditors,
  type TwinEditorsInstance,
  type TwinEditorsSnapshot,
} from './prosemirror-twin-editors';

/** 范例的控件集合。 */
interface ProsemirrorTiptapArgs {
  relay?: boolean;
  cursorRelay?: boolean;
}

const renderTwinEditors = canvasStory({
  create: createTwinEditors,
  apply(instance: TwinEditorsInstance, args: ProsemirrorTiptapArgs) {
    instance.update({
      relay: args.relay ?? true,
      cursorRelay: args.cursorRelay ?? true,
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
        snapshot.bCursorInA === null ? '未渲染' : `pos ${snapshot.bCursorInA}`,
      ],
      ['撤销栈步数(A / B)', snapshot.undoStacks],
      ['A 端 Y.XmlFragment', snapshot.xmlA],
    ];
  },
  captions: ['客户端 A(阿宁)', '客户端 B(小柏)'],
});

const meta = {
  id: 'prosemirror-tiptap',
  title: '编辑器绑定/ProseMirror 与 Tiptap',
  tags: ['!dev'],
} satisfies Meta<ProsemirrorTiptapArgs>;

export default meta;

type Story = StoryObj<ProsemirrorTiptapArgs>;

export const TwinEditors: Story = {
  name: '双编辑器同页互同步',
  args: {
    relay: true,
    cursorRelay: true,
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
  },
  render: renderTwinEditors,
  parameters: storySource(twinEditorsSource),
};
