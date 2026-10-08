import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import pipelineSource from './pipeline.ts?raw';
import {
  createExample,
  type ExampleArgs,
  type ExampleInstance,
  type ExampleSnapshot,
} from './example';
import {
  createPipeline,
  type PipelineArgs,
  type PipelineInstance,
  type PipelineSnapshot,
} from './pipeline';

const renderInteractive = canvasStory({
  create: createExample,
  apply(instance: ExampleInstance, args: ExampleArgs) {
    instance.update(args);
  },
  readout(snapshot: ExampleSnapshot) {
    return [
      ['调用', snapshot.call],
      ['授权', snapshot.auth],
      ['系统响应', snapshot.response],
      ['返回值', snapshot.result],
    ];
  },
});

const renderPipeline = canvasStory({
  create: createPipeline,
  apply(instance: PipelineInstance, args: PipelineArgs) {
    instance.update(args);
  },
  readout(snapshot: PipelineSnapshot) {
    return snapshot.rows;
  },
});

const meta = {
  id: 'system-integration',
  title: '插件与权限/系统交互',
  tags: ['!dev'],
} satisfies Meta<ExampleArgs & PipelineArgs>;

export const Interactive: StoryObj<ExampleArgs> = {
  args: {
    scenario: 'dialog-save',
    granted: true,
    userAction: 'confirm',
  },
  argTypes: {
    scenario: {
      name: '演示场景',
      description:
        '选择一次插件调用:前缀是插件名,后缀是操作。返回值形态与官方文档一致——文件对话框取消为 null,message 返回按钮标签,通知 / opener / 剪贴板写入无返回数据。',
      control: { type: 'select' },
      options: [
        'dialog-save',
        'dialog-open',
        'dialog-message',
        'notification-send',
        'opener-openurl',
        'opener-reveal',
        'clipboard-write',
        'clipboard-read',
      ],
    },
    granted: {
      name: '授权状态',
      description:
        '对话框 / opener / 剪贴板场景对应 ACL 权限(3.2 课);通知场景对应系统通知权限。未授权时调用直接 reject,系统界面不会出现。',
      control: { type: 'boolean' },
    },
    userAction: {
      name: '用户动作',
      description:
        '只对带系统界面的对话框场景生效:确认与取消返回不同的值;通知、opener、剪贴板没有用户决策环节。',
      control: { type: 'radio' },
      options: ['confirm', 'cancel'],
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
};

export const Pipeline: StoryObj<PipelineArgs> = {
  args: {
    run: false,
    userCancelsSave: false,
  },
  argTypes: {
    run: {
      name: '运行流水线',
      description:
        '按 save →(fs 写入,见 3.3 课)→ writeText → revealItemInDir → sendNotification 顺序推进;关闭后重置。',
      control: { type: 'boolean' },
    },
    userCancelsSave: {
      name: '用户取消保存',
      description:
        '勾选后 save() 返回 null,流水线在第一步中断,后续步骤跳过——组合使用要先判 null。',
      control: { type: 'boolean' },
    },
  },
  render: renderPipeline,
  parameters: storySource(pipelineSource),
};

export default meta;
