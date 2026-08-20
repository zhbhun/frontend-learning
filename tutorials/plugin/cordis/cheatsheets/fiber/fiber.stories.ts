import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import ledgerSource from './effect-ledger.ts?raw';
import awaitableSource from './awaitable-effect.ts?raw';
import {
  createEffectLedger,
  type LedgerInstance,
  type LedgerSnapshot,
} from './effect-ledger';
import {
  createAwaitableEffect,
  type AwaitableInstance,
  type AwaitableSnapshot,
} from './awaitable-effect';

interface LedgerArgs {
  loaded: boolean;
  timer: boolean;
  listener: boolean;
  group: boolean;
}

interface AwaitableArgs {
  registered: boolean;
  awaitIt: boolean;
  failBody: boolean;
  callDispose: boolean;
}

const renderLedger = canvasStory({
  create: createEffectLedger,
  apply(instance: LedgerInstance, args: LedgerArgs) {
    instance.update(args);
  },
  readout(snapshot: LedgerSnapshot) {
    return [
      ['当前状态', snapshot.state],
      ['fiber.uid', snapshot.uid],
      ['树顶层条目', `${snapshot.topLevel} 项`],
      ['树节点总数', `${snapshot.treeNodes} 个`],
      ['心跳次数', snapshot.beats],
      ['pulse 响应', snapshot.pulses],
    ];
  },
  captions: [
    '左侧是 fiber.getEffects() 的实时记账树，右侧是入账与撤销日志',
    '点击画布发出 pulse 事件；关闭「加载插件」看整棵树按 LIFO 清空',
  ],
});

const renderAwaitable = canvasStory({
  create: createAwaitableEffect,
  apply(instance: AwaitableInstance, args: AwaitableArgs) {
    instance.update(args);
  },
  readout(snapshot: AwaitableSnapshot) {
    return [
      ['effect 体', snapshot.bodyPhase],
      ['记账树', snapshot.treePhase],
      ['await 拿到', snapshot.awaitedType],
      ['撤销执行', `${snapshot.disposedCount} 次`],
      ['wrapper.then / .catch', snapshot.handleTypes],
      ['logger 缓冲', `${snapshot.logBuffer} 条`],
    ];
  },
  captions: [
    '三条泳道按时间呈现：effect 体的运行 / 记账变化 / 撤销执行（最近 12 秒）',
    '不 await 时体内失败完全静默——「logger 缓冲」读数保持 0',
  ],
});

const meta = {
  id: 'fiber',
  title: 'Fiber 与设计理念/Fiber',
  tags: ['!dev'],
} satisfies Meta;

export default meta;

export const Ledger: StoryObj<LedgerArgs> = {
  args: {
    loaded: true,
    timer: true,
    listener: true,
    group: true,
  },
  argTypes: {
    loaded: {
      name: '加载插件',
      description:
        '开启时 root.plugin(booked) 注册插件并派生 fiber，关闭时 await fiber.dispose() 清空记账树。',
      control: { type: 'boolean' },
    },
    timer: {
      name: '定时器 effect',
      description:
        '开启时在存活实例上注册 ctx.effect（label「定时器」），关闭时调用注册返回值手动撤销。',
      control: { type: 'boolean' },
    },
    listener: {
      name: 'pulse 监听器',
      description:
        '开启时注册 ctx.on(\'pulse\', …)，label 由框架自动生成为 ctx.on("pulse")；关闭时手动撤销。',
      control: { type: 'boolean' },
    },
    group: {
      name: '资源组（嵌套组合）',
      description:
        '开启时注册外层 effect 并 yield 两个子 effect（资源A / 资源B）——子条目成为 children；关闭时手动撤销，子 effect 级联撤销。',
      control: { type: 'boolean' },
    },
  },
  render: renderLedger,
  parameters: storySource(ledgerSource),
};

export const Awaitable: StoryObj<AwaitableArgs> = {
  args: {
    registered: true,
    awaitIt: true,
    failBody: false,
    callDispose: false,
  },
  argTypes: {
    registered: {
      name: '注册 async effect',
      description:
        '开启时在宿主插件的 fiber 上注册 900ms 后交出 disposer 的 async effect（label「慢建立」）；关闭时调用注册返回值手动撤销（等体完成后执行）。',
      control: { type: 'boolean' },
    },
    awaitIt: {
      name: 'await 注册',
      description:
        '在下一次注册生效：注册处 await 返回值——resolve 到 disposer 本身（function），副作用不撤销。',
      control: { type: 'boolean' },
    },
    failBody: {
      name: '体内抛错',
      description:
        '在下一次注册生效：体在 900ms 后抛错。未 await 时静默回滚（logger 缓冲保持 0）；await 时以原错误到达 await 处。',
      control: { type: 'boolean' },
    },
    callDispose: {
      name: '调用 disposer',
      description:
        '每次从关到开执行一次手动撤销：优先调用 await 拿到的 disposer，否则调用注册返回值本身。',
      control: { type: 'boolean' },
    },
  },
  render: renderAwaitable,
  parameters: storySource(awaitableSource),
};
