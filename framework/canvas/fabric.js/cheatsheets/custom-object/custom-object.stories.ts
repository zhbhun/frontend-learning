import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createCustomObjectLab,
  type CustomObjectInstance,
  type CustomObjectOptions,
  type CustomObjectSnapshot,
} from './example';

const renderInteractive = canvasStory({
  create: createCustomObjectLab,
  apply(instance: CustomObjectInstance, args: CustomObjectOptions) {
    instance.update(args);
  },
  readout(snapshot: CustomObjectSnapshot) {
    return [
      ['type（静态 / 实例）', snapshot.typeLabel],
      ['classRegistry', snapshot.registryLabel],
      ['导出条目（toObject）', snapshot.exportLabel],
      ['渲染状态', snapshot.renderLabel],
      ['缓存行为', snapshot.cacheLabel],
      ['往返后', snapshot.roundtripLabel],
      ['画布对象', snapshot.objectsLabel],
    ];
  },
});

const meta = {
  id: 'custom-object',
  title: '进阶与工程/自定义对象',
  tags: ['!dev'],
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<CustomObjectOptions>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {
  args: {
    armLength: 96,
    pulsate: false,
    markDirty: true,
    useCaching: true,
    roundtrip: false,
  },
  argTypes: {
    armLength: {
      name: '臂长 armLength',
      description:
        '构造参数：走 set("armLength") 路径——它已进 Cross 的 static cacheProperties，命中即自动标脏缓存，滑块改动立刻反映到 _render 与导出条目（读数「导出条目」「渲染状态」）。',
      control: {
        type: 'range',
        min: 48,
        max: 144,
        step: 4,
      },
    },
    pulsate: {
      name: '脉动动画',
      description:
        '每帧推进内部渲染态 phase 并更新 pulseScale（官方 animating-crosses demo 的模式）：phase 不进 cacheProperties、不进 toObject——开关只改画面与「渲染状态」读数，导出条目不变。',
      control: { type: 'boolean' },
    },
    markDirty: {
      name: '每帧标记 dirty',
      description:
        '默认开：每帧 dirty=true 让对象缓存重建。配合「对象缓存」开 + 本开关关 + 脉动开 → 画面冻结而「渲染状态」的 phase 继续走——自定义状态不在 cacheProperties 时必须手动标脏的直接证据。',
      control: { type: 'boolean' },
    },
    useCaching: {
      name: '对象缓存 objectCaching',
      description:
        '默认开（render 走缓存路径，dirty 决定缓存是否重建）。关掉后 render 每帧直接调 _render，dirty 不再需要——即使「每帧标记 dirty」也关着，脉动照常动。与上一开关组合出 2×2 的缓存行为矩阵。',
      control: { type: 'boolean' },
    },
    roundtrip: {
      name: '执行往返',
      description:
        '开：toObject 产物（含固化的 armLength/barWidth）JSON.stringify 后喂给 loadFromJSON，classRegistry 凭 type 复活出新 Cross 实例（读数「往返后」的 instanceof 与字段对照、内置 Rect 照常复活）。关：重建初始场景。',
      control: { type: 'boolean' },
    },
  },
};
