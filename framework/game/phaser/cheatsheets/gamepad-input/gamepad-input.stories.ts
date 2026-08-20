import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import gamepadLabSource from './gamepad-lab.ts?raw';
import {
  createGamepadLab,
  type GamepadLabInstance,
  type GamepadLabParams,
  type GamepadLabSnapshot,
} from './gamepad-lab';

/** 轴值与向量统一保留两位小数。 */
function vec(value: number): string {
  return value.toFixed(2);
}

const renderGamepadLab = canvasStory({
  create: createGamepadLab,
  apply(instance: GamepadLabInstance, args: GamepadLabParams) {
    instance.applyParams(args);
  },
  readout(snapshot: GamepadLabSnapshot) {
    return [
      ['已连接手柄 total', String(snapshot.total)],
      ['pad1(index: id)', snapshot.padId],
      [
        '轴 0/1 原始(左摇杆 H/V)',
        `${vec(snapshot.axisValues[0])} / ${vec(snapshot.axisValues[1])}`,
      ],
      [
        '轴 2/3 原始(右摇杆 H/V)',
        `${vec(snapshot.axisValues[2])} / ${vec(snapshot.axisValues[3])}`,
      ],
      [
        'leftStick(threshold 后)',
        `(${vec(snapshot.leftStick.x)}, ${vec(snapshot.leftStick.y)})`,
      ],
      [
        `死区后驱动(死区 ${snapshot.deadzone.toFixed(2)})`,
        `(${vec(snapshot.drive.x)}, ${vec(snapshot.drive.y)})`,
      ],
      ['输入来源', snapshot.source],
      ['对象坐标 x,y', `(${snapshot.x}, ${snapshot.y})`],
      ['down 事件 / 最近按钮', `${snapshot.buttonDownCount} 次 / ${snapshot.lastButton}`],
      ['按下中的按钮 index', snapshot.pressedIndices],
      [
        'connected / disconnected',
        `${snapshot.connectCount} / ${snapshot.disconnectCount}`,
      ],
      ['振动结果', snapshot.vibResult],
    ];
  },
  captions: [
    '无手柄也能玩:Controls 模拟轴走同一链路 · 有手柄:先按任意键激活',
    '十字读数:白 = 原始,绿 = 死区后',
  ],
});

interface GamepadInputArgs extends GamepadLabParams {}

const meta: Meta<GamepadInputArgs> = {
  id: 'gamepad-input',
  title: '输入/游戏手柄',
  tags: ['!dev'],
  render: renderGamepadLab,
};

export default meta;

type Story = StoryObj<GamepadInputArgs>;

export const GamepadLab: Story = {
  args: {
    simX: 0,
    simY: 0,
    deadzone: 0.15,
    vibrate: false,
  },
  argTypes: {
    simX: {
      name: '模拟轴 X',
      description:
        '无实体手柄时的输入来源:与 pad.leftStick.x 相加后进入同一套「死区 → 驱动」链路,验证读轴逻辑不需要真手柄。',
      control: { type: 'range', min: -1, max: 1, step: 0.05 },
    },
    simY: {
      name: '模拟轴 Y',
      description: '同模拟轴 X,对应 pad.leftStick.y。',
      control: { type: 'range', min: -1, max: 1, step: 0.05 },
    },
    deadzone: {
      name: '死区半径',
      description:
        '径向死区:合成向量长度不超过它时归零,超出部分重映射回 0..1;独立于 Axis.threshold(默认 0.1 的硬截断)。',
      control: { type: 'range', min: 0, max: 0.5, step: 0.05 },
    },
    vibrate: {
      name: '触发振动',
      description:
        'false→true 变化沿对 pad1 调一次原生 pad.vibration.playEffect(dual-rumble);返回 Promise,结果进 readout。',
      control: { type: 'boolean' },
    },
  },
  render: renderGamepadLab,
  parameters: storySource(gamepadLabSource),
};
