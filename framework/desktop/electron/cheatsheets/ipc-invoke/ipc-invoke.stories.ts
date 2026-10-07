import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import simSource from './invoke-sim.ts?raw';
import {
  createInvokeSim,
  type HandlerState,
  type InvokeSimInstance,
  type InvokeSimSnapshot,
} from './invoke-sim';

interface InvokeSimArgs {
  handlerState: HandlerState;
}

const renderInteractive = canvasStory({
  create: createInvokeSim,
  apply(instance: InvokeSimInstance, args: InvokeSimArgs) {
    instance.update(args);
  },
  readout(snapshot: InvokeSimSnapshot) {
    return [
      ['handler 状态', snapshot.handlerState],
      ['invoke 的 Promise', snapshot.promiseText],
      ['已等待 / 用时', snapshot.elapsedText],
    ];
  },
});

const meta = {
  id: 'ipc-invoke',
  title: '通信/双向调用',
  tags: ['!dev'],
  args: {
    handlerState: '返回结果',
  },
  argTypes: {
    handlerState: {
      name: 'handler 状态',
      description: '主进程 ipcMain.handle 登记的处理函数此刻的行为。',
      control: {
        type: 'radio',
        options: ['返回结果', '抛出 Error', '挂起不返回', '未注册'],
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(simSource),
} satisfies Meta<InvokeSimArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
