import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import {
  createCaretModel,
  type CaretModelInstance,
  type CaretModelSnapshot,
} from './caret-model';
import caretModelSource from './caret-model.ts?raw';

interface CourseArgs {
  myName: string;
  myColor: string;
  peerName: string;
  peerColor: string;
}

function names(list: string[]): string {
  return list.length > 0 ? list.join('、') : '（无）';
}

const CURSOR_LABELS: Record<CaretModelSnapshot['peerCursor'], string> = {
  published: '已发布（同事编辑器持焦点）',
  cleared: '已清空（失焦即撤下）',
  'no-state': '无状态（已离开房间）',
};

function readout(snapshot: CaretModelSnapshot): Array<[string, string]> {
  return [
    ['storage.users（我的编辑器）', names(snapshot.userNames)],
    ['远端光标（cursor 非空）', names(snapshot.visibleCaretNames)],
    ['同事 cursor 字段', CURSOR_LABELS[snapshot.peerCursor]],
    ['同事 user 字段', snapshot.peerInRoom ? '在房间' : '不在房间'],
  ];
}

const renderBoard = canvasStory({
  create: (canvas, emit) => createCaretModel(canvas, emit, 'board'),
  apply(instance: CaretModelInstance, args: CourseArgs) {
    instance.update(args);
  },
  readout,
});

const renderLifecycle = canvasStory({
  create: (canvas, emit) => createCaretModel(canvas, emit, 'lifecycle'),
  apply(instance: CaretModelInstance, args: CourseArgs) {
    instance.update(args);
  },
  readout,
});

const meta = {
  id: 'collaboration-caret',
  title: 'Tiptap 编辑器协同/协同光标',
  tags: ['!dev'],
  args: {
    myName: '小明',
    myColor: '#4f7cff',
    peerName: '小红',
    peerColor: '#e8590c',
  },
  argTypes: {
    myName: {
      name: '我的昵称',
      description: '经 updateUser 命令写入 awareness 的 user 字段，两端名牌同帧更新。',
      control: { type: 'text' },
    },
    myColor: {
      name: '我的颜色',
      description: '六位 hex（#RRGGBB）；非法颜色会被清洗成 transparent（光标隐形、选区不画）。',
      control: { type: 'color' },
    },
    peerName: {
      name: '同事昵称',
      description: '同事端的 user.name，名牌与读数同步变化；同事已离开房间时改动静默不生效。',
      control: { type: 'text' },
    },
    peerColor: {
      name: '同事颜色',
      description: '同事端的 user.color，光标竖线、选区底色与名牌底色都取自它。',
      control: { type: 'color' },
    },
  },
  parameters: storySource(caretModelSource),
} satisfies Meta<CourseArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const CaretBoard: Story = {
  name: '光标与选区',
  render: renderBoard,
};

export const FocusAndLeave: Story = {
  name: '消失时机',
  render: renderLifecycle,
};
