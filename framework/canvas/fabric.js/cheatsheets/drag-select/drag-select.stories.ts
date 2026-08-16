import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createKeyBench,
  createLockBench,
  createMarqueeBench,
  createMultiSelectBench,
  createProgrammaticBench,
  createSwitchBench,
  createTargetBench,
  type KeyBenchInstance,
  type KeyBenchOptions,
  type KeyBenchSnapshot,
  type LockBenchInstance,
  type LockBenchOptions,
  type LockBenchSnapshot,
  type MarqueeBenchInstance,
  type MarqueeBenchOptions,
  type MarqueeBenchSnapshot,
  type MultiSelectBenchInstance,
  type MultiSelectBenchOptions,
  type MultiSelectBenchSnapshot,
  type ProgrammaticBenchInstance,
  type ProgrammaticBenchOptions,
  type ProgrammaticBenchSnapshot,
  type SwitchBenchInstance,
  type SwitchBenchOptions,
  type SwitchBenchSnapshot,
  type TargetBenchInstance,
  type TargetBenchOptions,
  type TargetBenchSnapshot,
} from './example';

/** 本课全部控件的合集；每个 story 只在自己的 argTypes 里声明所用子集 */
export interface DragSelectArgs
  extends SwitchBenchOptions,
    LockBenchOptions,
    MarqueeBenchOptions,
    MultiSelectBenchOptions,
    TargetBenchOptions,
    KeyBenchOptions,
    ProgrammaticBenchOptions {}

const renderSwitchBench = canvasStory({
  create: createSwitchBench,
  apply(instance: SwitchBenchInstance, args: DragSelectArgs) {
    instance.update(args);
  },
  readout(snapshot: SwitchBenchSnapshot) {
    return [
      ['最近命中 mouse:down', snapshot.lastDownHit],
      ['当前活动对象 getActiveObject()', snapshot.activeObject],
      ['选中集 getActiveObjects()', snapshot.activeObjects],
      ['A 开关快照', snapshot.targetSwitches],
    ];
  },
});

const renderLockBench = canvasStory({
  create: createLockBench,
  apply(instance: LockBenchInstance, args: DragSelectArgs) {
    instance.update(args);
  },
  readout(snapshot: LockBenchSnapshot) {
    return [
      ['D 锁定快照', snapshot.locks],
      ['最近变换动作', snapshot.lastAction],
      ['D left / top', snapshot.leftTop],
      ['D angle / scale', snapshot.angleScale],
    ];
  },
});

const renderMarqueeBench = canvasStory({
  create: createMarqueeBench,
  apply(instance: MarqueeBenchInstance, args: DragSelectArgs) {
    instance.update(args);
  },
  readout(snapshot: MarqueeBenchSnapshot) {
    return [
      ['selection 配置快照', snapshot.selectionConfig],
      ['最近 selection 事件', snapshot.lastSelectionEvent],
      ['选中集 getActiveObjects()', snapshot.activeObjects],
    ];
  },
});

const renderMultiSelectBench = canvasStory({
  create: createMultiSelectBench,
  apply(instance: MultiSelectBenchInstance, args: DragSelectArgs) {
    instance.update(args);
  },
  readout(snapshot: MultiSelectBenchSnapshot) {
    return [
      ['canvas.selectionKey', snapshot.selectionKey],
      ['当前活动对象 getActiveObject()', snapshot.activeObject],
      ['选中集 getActiveObjects()', snapshot.activeObjects],
      ['选中数量', snapshot.activeCount],
    ];
  },
});

const renderTargetBench = canvasStory({
  create: createTargetBench,
  apply(instance: TargetBenchInstance, args: DragSelectArgs) {
    instance.update(args);
  },
  readout(snapshot: TargetBenchSnapshot) {
    return [
      ['命中配置快照', snapshot.targetConfig],
      ['最近 mouse:down 命中', snapshot.lastDownHit],
      ['最近 mouse:over 命中', snapshot.lastHoverHit],
    ];
  },
});

const renderKeyBench = canvasStory({
  create: createKeyBench,
  apply(instance: KeyBenchInstance, args: DragSelectArgs) {
    instance.update(args);
  },
  readout(snapshot: KeyBenchSnapshot) {
    return [
      ['画布键位快照', snapshot.keyConfig],
      ['最近变换动作', snapshot.lastAction],
      ['M angle', snapshot.angle],
      ['M scaleX / scaleY', snapshot.scale],
    ];
  },
});

const renderProgrammaticBench = canvasStory({
  create: createProgrammaticBench,
  apply(instance: ProgrammaticBenchInstance, args: DragSelectArgs) {
    instance.update(args);
  },
  readout(snapshot: ProgrammaticBenchSnapshot) {
    return [
      ['最近 selection 事件', snapshot.lastSelectionEvent],
      ['当前活动对象 getActiveObject()', snapshot.activeObject],
      ['选中集 getActiveObjects()', snapshot.activeObjects],
    ];
  },
});

const meta = {
  id: 'drag-select',
  title: '交互与编辑/拖拽与选择',
  tags: ['!dev'],
  render: renderSwitchBench,
  parameters: storySource(exampleSource),
} satisfies Meta<DragSelectArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const SwitchBench: Story = {
  args: {
    switchSelectable: true,
    switchEvented: true,
    switchActiveOn: 'down',
  },
  argTypes: {
    switchSelectable: {
      name: 'A.selectable',
      description:
        '能否被选中（默认 true）。关掉后点选、框选、拖动都失效，但命中与事件不受影响。',
      control: { type: 'boolean' },
    },
    switchEvented: {
      name: 'A.evented',
      description:
        '能否被命中（默认 true）。关掉后点击与悬停穿透到下层，但框选仍能收集 A。',
      control: { type: 'boolean' },
    },
    switchActiveOn: {
      name: 'A.activeOn',
      description: "选中时机（默认 'down'）。'up'：按下不选，松开才选，按下拖动无效。",
      control: { type: 'inline-radio' },
      options: ['down', 'up'],
      labels: { down: "'down' 按下选中", up: "'up' 松开选中" },
    },
  },
};

export const LockBench: Story = {
  render: renderLockBench,
  args: {
    lockMoveX: false,
    lockMoveY: false,
    lockRotation: false,
    lockScalingX: false,
    lockScalingY: false,
  },
  argTypes: {
    lockMoveX: {
      name: 'D.lockMovementX',
      description: '锁水平拖动（默认 false）。锁的是动作，不阻止选中。',
      control: { type: 'boolean' },
    },
    lockMoveY: {
      name: 'D.lockMovementY',
      description: '锁垂直拖动（默认 false）。单轴锁定时另一轴仍可拖。',
      control: { type: 'boolean' },
    },
    lockRotation: {
      name: 'D.lockRotation',
      description: '锁旋转手柄（默认 false）。锁定后手柄光标变 not-allowed。',
      control: { type: 'boolean' },
    },
    lockScalingX: {
      name: 'D.lockScalingX',
      description: '锁 X 轴缩放（默认 false）。角柄等比需两轴，任一轴锁定角柄即被拒。',
      control: { type: 'boolean' },
    },
    lockScalingY: {
      name: 'D.lockScalingY',
      description: '锁 Y 轴缩放（默认 false）。两轴同锁等于完全禁用缩放。',
      control: { type: 'boolean' },
    },
  },
};

export const MarqueeBench: Story = {
  render: renderMarqueeBench,
  args: {
    marqueeSelection: true,
    fullyContained: false,
    dashed: false,
    marqueeLineWidth: 1,
  },
  argTypes: {
    marqueeSelection: {
      name: 'canvas.selection',
      description:
        '框选与多选修饰键的总开关（默认 true）。关掉后点选仍可用，拖空白不再画框。',
      control: { type: 'boolean' },
    },
    fullyContained: {
      name: 'selectionFullyContained',
      description:
        '框选收集口径（默认 false 相交即收）。true 时只收被框完全包含的对象。',
      control: { type: 'boolean' },
    },
    dashed: {
      name: 'selectionDashArray',
      description: '框选描边虚线：开 = [4, 3]，关 = []（默认，实线）。',
      control: { type: 'boolean' },
    },
    marqueeLineWidth: {
      name: 'selectionLineWidth',
      description: '框选描边宽度（默认 1）。拖动框选时立刻可见。',
      control: { type: 'range', min: 1, max: 5, step: 1 },
    },
  },
};

export const MultiSelectBench: Story = {
  render: renderMultiSelectBench,
  args: { multiSelectKey: 'shiftKey' },
  argTypes: {
    multiSelectKey: {
      name: 'canvas.selectionKey',
      description:
        '多选修饰键（默认 shiftKey）。按住它点选可加减成员；切到“两者”演示数组写法。',
      control: { type: 'inline-radio' },
      options: ['shiftKey', 'ctrlKey', 'both'],
      labels: {
        shiftKey: "'shiftKey'",
        ctrlKey: "'ctrlKey'",
        both: "['shiftKey', 'ctrlKey']",
      },
    },
  },
};

export const TargetBench: Story = {
  render: renderTargetBench,
  args: {
    skipFind: false,
    perPixel: false,
    tolerance: 0,
    preserveStacking: true,
    altSelKey: false,
  },
  argTypes: {
    skipFind: {
      name: 'skipTargetFind',
      description:
        '关闭目标发现（默认 false）。点选失效、悬停无目标、点击清空当前选择；框选不受影响。',
      control: { type: 'boolean' },
    },
    perPixel: {
      name: 'perPixelTargetFind',
      description:
        '像素级命中（默认 false）。开之后点圆环 O 的空心处会穿透到下层或空白。',
      control: { type: 'boolean' },
    },
    tolerance: {
      name: 'targetFindTolerance',
      description:
        '像素命中容差（默认 0，仅在 perPixelTargetFind 开启时生效）。改值走 setTargetFindTolerance()。',
      control: { type: 'range', min: 0, max: 10, step: 1 },
    },
    preserveStacking: {
      name: 'preserveObjectStacking',
      description:
        '选中对象保持层叠（v7 默认 true）。关掉后活动对象浮到最上层渲染，重叠点击优先命中它。',
      control: { type: 'boolean' },
    },
    altSelKey: {
      name: 'altSelectionKey',
      description:
        "默认未配置（禁用）。设为 'altKey' 后，按住 alt 点重叠区可保持当前活动对象不被抢选。",
      control: { type: 'boolean' },
    },
  },
};

export const KeyBench: Story = {
  render: renderKeyBench,
  args: { centeredScale: false, uniform: true },
  argTypes: {
    centeredScale: {
      name: 'canvas.centeredScaling',
      description:
        '缩放默认绕中心（默认 false：绕拖拽的角）。按住 alt（centeredKey）随时临时反转。',
      control: { type: 'boolean' },
    },
    uniform: {
      name: 'canvas.uniformScaling',
      description:
        '角柄缩放是否等比（默认 true）。按住 shift（uniScaleKey）临时反转成自由缩放。',
      control: { type: 'boolean' },
    },
  },
};

export const ProgrammaticBench: Story = {
  render: renderProgrammaticBench,
  args: { progAction: 'discard' },
  argTypes: {
    progAction: {
      name: '编程选择动作',
      description:
        '切换时执行一次对应 API：discardActiveObject() / setActiveObject() / 程序化 ActiveSelection，readout 同步 selection 事件载荷。',
      control: { type: 'inline-radio' },
      options: ['discard', 'selectP', 'qrAS', 'allAS'],
      labels: {
        discard: 'discardActiveObject()',
        selectP: 'setActiveObject(P)',
        qrAS: 'ActiveSelection(Q, R)',
        allAS: 'ActiveSelection(P, Q, R)',
      },
    },
  },
};
