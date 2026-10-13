import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import typingSource from './typing-indicator-lab.ts?raw';
import membersSource from './presence-members-lab.ts?raw';
import leaveSource from './presence-leave-lab.ts?raw';
import {
  TYPING_SCENARIOS,
  createTypingLab,
  type TypingLabArgs,
  type TypingLabInstance,
  type TypingLabSnapshot,
} from './typing-indicator-lab';
import {
  MEMBER_STATUS_OPTIONS,
  createMembersLab,
  type MembersLabArgs,
  type MembersLabInstance,
  type MembersLabSnapshot,
} from './presence-members-lab';
import {
  LEAVE_WAY_OPTIONS,
  createLeaveLab,
  type LeaveLabArgs,
  type LeaveLabInstance,
  type LeaveLabSnapshot,
} from './presence-leave-lab';

/**
 * 每个故事独立的 canvasStory 闭包：同一页上多个 Canvas 各自持有舞台，
 * 互不串位。场景切换与通道输入都通过 args 重新驱动实例。
 */
const renderTypingLab = canvasStory({
  create: createTypingLab,
  apply(instance: TypingLabInstance, args: TypingLabArgs) {
    instance.update(args);
  },
  readout(snapshot: TypingLabSnapshot) {
    return snapshot.rows;
  },
});

const renderMembersLab = canvasStory({
  create: createMembersLab,
  apply(instance: MembersLabInstance, args: MembersLabArgs) {
    instance.update(args);
  },
  readout(snapshot: MembersLabSnapshot) {
    return snapshot.rows;
  },
});

const renderLeaveLab = canvasStory({
  create: createLeaveLab,
  apply(instance: LeaveLabInstance, args: LeaveLabArgs) {
    instance.update(args);
  },
  readout(snapshot: LeaveLabSnapshot) {
    return snapshot.rows;
  },
});

interface CourseArgs
  extends TypingLabArgs,
    MembersLabArgs,
    LeaveLabArgs {}

const meta = {
  id: 'ephemeral-data',
  title: 'Repo 同步层/在线状态与临时数据',
  tags: ['!dev'],
} satisfies Meta<CourseArgs>;

export default meta;

type Story = StoryObj<CourseArgs>;

export const TypingLab: Story = {
  name: '输入指示器',
  args: {
    scenario: 'typing',
    typedText: '你好，协同世界',
  } satisfies TypingLabArgs,
  argTypes: {
    scenario: {
      name: '演示场景',
      description:
        'typing：A 每次修改都广播一条输入指示，B 实时收到；restart：B 先收到一条消息，再 shutdown 重建，验证旧消息不重放、新消息照常到达。',
      control: { type: 'radio' },
      options: TYPING_SCENARIOS,
      labels: {
        typing: '实时输入',
        restart: '重启对照',
      },
    },
    typedText: {
      name: 'A 正在输入的文本',
      description: '输入者 A 每次修改文本，就向所有打开本文档的在线 peer 广播一条输入指示。',
      control: { type: 'text' },
    },
  },
  render: renderTypingLab,
  parameters: storySource(typingSource),
};

export const MembersLab: Story = {
  name: '成员板',
  args: {
    status: '在线',
    cursor: 8,
  } satisfies MembersLabArgs,
  argTypes: {
    status: {
      name: 'A 的状态',
      description: 'A（小张）的状态通道取值；每次切换只广播 status 这一个通道。',
      control: { type: 'radio' },
      options: MEMBER_STATUS_OPTIONS,
    },
    cursor: {
      name: 'A 的光标位置',
      description: 'A（小张）的 cursor 通道取值；拖动滑块，B 的成员板实时跟随。',
      control: { type: 'range', min: 0, max: 30, step: 1 },
    },
  },
  render: renderMembersLab,
  parameters: storySource(membersSource),
};

export const LeaveLab: Story = {
  name: '离开成员',
  args: {
    leaveWay: 'goodbye',
  } satisfies LeaveLabArgs,
  argTypes: {
    leaveWay: {
      name: '离场方式',
      description:
        'goodbye：presence.stop() 先广播告别再下线，对端立即移除；crash：直接断开网络适配器（模拟断电），对端要等超时修剪。',
      control: { type: 'radio' },
      options: LEAVE_WAY_OPTIONS,
      labels: {
        goodbye: 'stop 告别（goodbye）',
        crash: '断网不告别（模拟断电）',
      },
    },
  },
  render: renderLeaveLab,
  parameters: storySource(leaveSource),
};
