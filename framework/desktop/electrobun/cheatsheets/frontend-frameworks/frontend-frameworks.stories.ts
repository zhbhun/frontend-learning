import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import glueSource from './rpc-glue-lifecycle.ts?raw';
import {
  createRpcGlueLifecycle,
  type GlueInstance,
  type GlueOptions,
  type GlueSnapshot,
} from './rpc-glue-lifecycle';

interface GlueArgs extends GlueOptions {
  lateMessages: number;
}

const renderGlue = canvasStory({
  create: createRpcGlueLifecycle,
  apply(instance: GlueInstance, args: GlueArgs) {
    instance.update(args);
  },
  readout(snapshot: GlueSnapshot) {
    return [
      ['组件状态', snapshot.componentState],
      ['注册 listener', snapshot.listeners],
      ['组件收到消息', snapshot.received],
      ['卸载后触发', snapshot.ghostUpdates],
      ['泄漏 / 幽灵', snapshot.warning],
    ];
  },
});

const meta = {
  id: 'frontend-frameworks',
  title: '前端工程化/前端框架集成',
  tags: ['!dev'],
  args: {
    cleanup: true,
    unmounted: false,
    lateMessages: 1,
  },
  argTypes: {
    cleanup: {
      name: 'effect 返回清理函数',
      description:
        'useNotices 的 useEffect 是否 return 一个调用 removeMessageListener 的清理函数（对应 react-rpc-glue.tsx 的写法）。',
      control: { type: 'boolean' },
    },
    unmounted: {
      name: '组件已卸载',
      description: 'MessageList 组件是否已经卸载（unmount）。主进程不感知这件事，只管继续发送。',
      control: { type: 'boolean' },
    },
    lateMessages: {
      name: '追加推送条数',
      description:
        '时点④（卸载动作之后）主进程继续 pushNotice 的条数；组件未卸载时它们就是又一次正常推送。',
      options: [0, 1, 3],
      control: {
        type: 'inline-radio',
        labels: {
          0: '0 条',
          1: '1 条',
          3: '3 条',
        },
      },
    },
  },
  render: renderGlue,
  parameters: storySource(glueSource),
} satisfies Meta<GlueArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const RpcGlueLifecycle: Story = {};
