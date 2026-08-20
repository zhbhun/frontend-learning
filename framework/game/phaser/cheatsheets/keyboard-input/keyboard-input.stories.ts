import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import keyboardLabSource from './keyboard-lab.ts?raw';
import keyComboSource from './key-combo.ts?raw';
import {
  createKeyboardLab,
  type KeyboardLabInstance,
  type KeyboardLabParams,
  type KeyboardLabSnapshot,
} from './keyboard-lab';
import {
  createKeyCombo,
  type KeyComboInstance,
  type KeyComboParams,
  type KeyComboSnapshot,
} from './key-combo';

/** 数值读数统一取整毫秒;进度取一位小数百分比。 */
function num(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function flag(value: boolean): string {
  return value ? '1' : '0';
}

const renderKeyboardLab = canvasStory({
  create: createKeyboardLab,
  apply(instance: KeyboardLabInstance, args: KeyboardLabParams) {
    instance.applyParams(args);
  },
  readout(snapshot: KeyboardLabSnapshot) {
    return [
      ['keyboard.enabled', snapshot.keyboardEnabled ? 'true' : 'false(读数冻结)'],
      [
        '← ↑ → ↓ isDown',
        [snapshot.cursor.left, snapshot.cursor.up, snapshot.cursor.right, snapshot.cursor.down]
          .map(flag)
          .join(' '),
      ],
      [
        'W A S D isDown',
        [snapshot.wasd.w, snapshot.wasd.a, snapshot.wasd.s, snapshot.wasd.d].map(flag).join(' '),
      ],
      ['对象坐标 x,y', `(${snapshot.x}, ${snapshot.y})`],
      ['最近 keydown / keyup', `${snapshot.lastDown} / ${snapshot.lastUp}`],
      ['keydown / keyup 计数', `${snapshot.keydownCount} / ${snapshot.keyupCount}`],
      [
        'keydown-W / Key down(W) 计数',
        `${snapshot.keydownWCount} / ${snapshot.keyDownEventCount}(按住 W:前者停,后者看 emitOnRepeat)`,
      ],
      ['JustDown(W) 触发', `${snapshot.justDownCount} 次(每次按下恰好 +1)`],
      [
        'W getDuration() / duration',
        `${num(snapshot.wGetDuration)} / ${num(snapshot.wDuration)} ms`,
      ],
      ['最近 keydown 的 event.repeat', snapshot.lastRepeat ? 'true' : 'false'],
    ];
  },
  captions: ['先点击画布获得焦点 · 光标键 / WASD 移动 · K 键故意未注册 Key'],
});

const renderKeyCombo = canvasStory({
  create: createKeyCombo,
  apply(instance: KeyComboInstance, args: KeyComboParams) {
    instance.applyParams(args);
  },
  readout(snapshot: KeyComboSnapshot) {
    return [
      ['combo.progress', pct(snapshot.progress)],
      ['combo.index / size', `${snapshot.index} / ${snapshot.size}`],
      ['keycombomatch 次数', String(snapshot.matchCount)],
      ['maxKeyDelay', `${snapshot.maxKeyDelay} ms(0 = 不限)`],
      ['resetOnWrongKey', snapshot.resetOnWrongKey ? 'true(按错复位)' : 'false(按错忽略)'],
    ];
  },
  captions: ['输入 ↑↑↓↓←→←→BA · 先点击画布获得焦点'],
});

/** 两个 story 的参数并集,为各 story 的 args / argTypes 提供类型锚点。 */
interface KeyboardInputArgs extends KeyboardLabParams, KeyComboParams {}

const meta: Meta<KeyboardInputArgs> = {
  id: 'keyboard-input',
  title: '输入/键盘',
  tags: ['!dev'],
  // 默认 render,同时为每个 story 的 args 提供类型锚点;各 story 覆盖为自己的 render
  render: renderKeyboardLab,
};

export default meta;

type Story = StoryObj<KeyboardInputArgs>;

export const KeyboardLab: Story = {
  args: {
    speed: 240,
    emitOnRepeat: false,
    enabled: true,
  },
  argTypes: {
    speed: {
      name: '移动速度(px/s)',
      description: 'update 轮询里把速度乘以帧间隔得到位移;坐标移动,不经过物理引擎。',
      control: { type: 'range', min: 120, max: 480, step: 60 },
    },
    emitOnRepeat: {
      name: 'W 键 emitOnRepeat',
      description:
        'Key 对象属性:按住 W 时自身的 down 事件是否随系统重复持续触发;不影响插件级 keydown-W。',
      control: { type: 'boolean' },
    },
    enabled: {
      name: 'keyboard.enabled',
      description: 'this.input.keyboard.enabled 总开关;false 时事件不派发、Key 状态不更新。',
      control: { type: 'boolean' },
    },
  },
  render: renderKeyboardLab,
  parameters: storySource(keyboardLabSource),
};

export const ComboProbe: Story = {
  args: {
    maxKeyDelay: 0,
    resetOnWrongKey: true,
  },
  argTypes: {
    maxKeyDelay: {
      name: '相邻键最大间隔(ms)',
      description: 'KeyComboConfig.maxKeyDelay:相邻两键超过该间隔进度复位;0 表示不限。切换即重建 combo。',
      control: { type: 'range', min: 0, max: 2000, step: 250 },
    },
    resetOnWrongKey: {
      name: '按错复位',
      description: 'KeyComboConfig.resetOnWrongKey:按到序列外的键时进度是否归零。切换即重建 combo。',
      control: { type: 'boolean' },
    },
  },
  render: renderKeyCombo,
  parameters: storySource(keyComboSource),
};
