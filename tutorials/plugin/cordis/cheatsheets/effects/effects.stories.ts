import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import formsSource from './effect-forms.ts?raw';
import {
  createEffectForms,
  type FormsInstance,
  type FormsSnapshot,
} from './effect-forms';

interface FormsArgs {
  loaded: boolean;
  disposeHeartbeat: boolean;
  disposeStream: boolean;
  failDisposer: boolean;
}

const renderForms = canvasStory({
  create: createEffectForms,
  apply(instance: FormsInstance, args: FormsArgs) {
    instance.update(args);
  },
  readout(snapshot: FormsSnapshot) {
    return [
      ['当前状态', snapshot.state],
      ['fiber.uid', snapshot.uid],
      ['心跳次数', snapshot.beats],
      ['已收集待撤销', `${snapshot.pending} 个`],
      ['已执行撤销', `${snapshot.disposed} 次`],
      ['effect 标签', snapshot.effects],
    ];
  },
  captions: [
    '注册 → 手动提前撤销 → disposer 抛错 → 销毁：入账与撤销全部进入按时间排序的日志',
    '撤销开关只触发一次动作，重新加载插件后先关再开可再次触发',
  ],
});

const meta = {
  id: 'effects',
  title: '副作用与事件/可逆副作用',
  tags: ['!dev'],
  args: {
    loaded: true,
    disposeHeartbeat: false,
    disposeStream: false,
    failDisposer: false,
  },
  argTypes: {
    loaded: {
      name: '加载插件',
      description:
        '开启时 root.plugin(registered) 注册插件，关闭时 await fiber.dispose() 销毁——全部 effect 随作用域 LIFO 撤销。',
      control: {
        type: 'boolean',
      },
    },
    disposeHeartbeat: {
      name: '撤销心跳（函数形态）',
      description:
        '手动调用 ctx.effect 的返回值（disposer）：函数形态立即撤销，作用域销毁时不再重复。',
      control: {
        type: 'boolean',
      },
    },
    disposeStream: {
      name: '撤销渐进收集（异步迭代器）',
      description:
        '手动调用异步迭代器形态的 disposer：等待当前产出落定后，回收至此已入账的撤销函数。',
      control: {
        type: 'boolean',
      },
    },
    failDisposer: {
      name: 'disposer 抛错',
      description:
        '让数组 [1] 的撤销函数在下一次撤销时抛错：只中断同 effect 后续（数组 [0] 被跳过），其余形态照常，插件仍到 DISPOSED。',
      control: {
        type: 'boolean',
      },
    },
  },
  render: renderForms,
  parameters: storySource(formsSource),
} satisfies Meta<FormsArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Forms: Story = {};
