import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import pointerLabSource from './pointer-lab.ts?raw';
import dragLabSource from './drag-lab.ts?raw';
import {
  createPointerLab,
  type PointerLabInstance,
  type PointerLabParams,
  type PointerLabSnapshot,
} from './pointer-lab';
import {
  createDragLab,
  type DragLabInstance,
  type DragLabParams,
  type DragLabSnapshot,
} from './drag-lab';

/** 坐标读数统一取整;未发生过 drag 时读数是 NaN,显示为 —。 */
function pos(value: number): string {
  return Number.isNaN(value) ? '—' : String(Math.round(value));
}

function flag(value: boolean): string {
  return value ? '1' : '0';
}

/** getDragState:0 未拖 1 已按下待判定 2 判定中 4 拖拽中 5 已松手待收尾。 */
function dragStateLabel(state: number): string {
  return `${state}${
    state === 0 ? '(未拖)' : state === 4 ? '(拖拽中)' : state === 2 ? '(判定中)' : ''
  }`;
}

const renderPointerLab = canvasStory({
  create: createPointerLab,
  apply(instance: PointerLabInstance, args: PointerLabParams) {
    instance.applyParams(args);
  },
  readout(snapshot: PointerLabSnapshot) {
    return [
      ['pointer.x / y(画布坐标)', `(${snapshot.x}, ${snapshot.y})`],
      ['pointer.worldX / worldY(世界坐标)', `(${snapshot.worldX}, ${snapshot.worldY})`],
      ['camera.scrollX', String(snapshot.scrollX)],
      ['isDown / leftButtonDown', `${flag(snapshot.isDown)} / ${flag(snapshot.leftDown)}`],
      ['悬停对象', snapshot.hover],
      ['pointerdown / pointermove 计数', `${snapshot.downCount} / ${snapshot.moveCount}`],
      ['pointerover / pointerout 计数', `${snapshot.overCount} / ${snapshot.outCount}`],
      [
        '对象级 pointerdown / gameobjectdown',
        `${snapshot.objDownCount} / ${snapshot.gameobjectdownCount}(同步 +1;空点只加前者一列的 pointerdown)`,
      ],
      ['最近点击', snapshot.lastClick],
    ];
  },
  captions: ['悬停 / 点击对象 · A、B 重叠 · D 需滚动', '四角试命中区'],
});

const renderDragLab = canvasStory({
  create: createDragLab,
  apply(instance: DragLabInstance, args: DragLabParams) {
    instance.applyParams(args);
  },
  readout(snapshot: DragLabSnapshot) {
    return [
      ['getDragState(activePointer)', dragStateLabel(snapshot.dragState)],
      ['dragX / dragY(最近一次)', `(${pos(snapshot.dragX)}, ${pos(snapshot.dragY)})`],
      [
        'dragStartX / dragStartY',
        `(${pos(snapshot.dragStartX)}, ${pos(snapshot.dragStartY)})(拖拽起点的对象坐标)`,
      ],
      ['令牌 x / y', `(${Math.round(snapshot.tokenX)}, ${Math.round(snapshot.tokenY)})`],
      ['拖拽目标 / 最近 dropped', `${snapshot.target} / ${snapshot.lastDropped}`],
      [
        'draggable(生效) / 判定距离',
        `${snapshot.draggable ? 'true' : 'false'} / ${snapshot.dragThreshold} px`,
      ],
      ['dragstart / drag / dragend', `${snapshot.dragstartCount} / ${snapshot.dragCount} / ${snapshot.dragendCount}`],
      ['dragenter / dragleave', `${snapshot.dragenterCount} / ${snapshot.dragleaveCount}`],
      ['对象级 drop 计数(令牌)', `${snapshot.objDropCount}(与场景级 drop 同步)`],
      ['左 / 右托盘收纳数', `${snapshot.leftStashed} / ${snapshot.rightStashed}`],
    ];
  },
  captions: ['抓取令牌任意位置拖动', '托盘松手收纳 · 空地松手留在原地'],
});

/** 两个 story 的参数并集,为各 story 的 args / argTypes 提供类型锚点。 */
interface PointerInputArgs extends PointerLabParams, DragLabParams {}

const meta: Meta<PointerInputArgs> = {
  id: 'pointer-input',
  title: '输入/指针与交互',
  tags: ['!dev'],
  // 默认 render,同时为每个 story 的 args 提供类型锚点;各 story 覆盖为自己的 render
  render: renderPointerLab,
};

export default meta;

type Story = StoryObj<PointerInputArgs>;

export const PointerLab: Story = {
  args: {
    hitAreaShape: 'rect',
    topOnly: true,
    scrollX: 0,
  },
  argTypes: {
    hitAreaShape: {
      name: '命中区形状',
      description:
        'rect=纹理帧矩形(setInteractive 无参默认),透明四角也算命中;circle=贴合圆形贴图的轮廓。切换即时生效(直接改 input.hitArea)。',
      control: { type: 'radio' },
      options: ['rect', 'circle'],
      labels: { rect: '矩形(默认)', circle: '圆形' },
    },
    topOnly: {
      name: 'input.topOnly',
      description:
        'this.input.setTopOnly:重叠时只对最顶层交互对象派发事件;关闭后 A、B 重叠区两个都命中。',
      control: { type: 'boolean' },
    },
    scrollX: {
      name: '摄像机 scrollX',
      description: '主摄像机水平滚动量(0..360);滚动后 pointer.x 不变而 worldX 随之偏移。',
      control: { type: 'range', min: 0, max: 360, step: 30 },
    },
  },
  render: renderPointerLab,
  parameters: storySource(pointerLabSource),
};

export const DragLab: Story = {
  args: {
    draggable: true,
    dragThreshold: 0,
  },
  argTypes: {
    draggable: {
      name: 'draggable',
      description:
        'this.input.setDraggable(令牌, value):false 时 drag 事件全停,pointerdown 类交互照常。',
      control: { type: 'boolean' },
    },
    dragThreshold: {
      name: '拖拽判定距离(px)',
      description:
        'this.input.dragDistanceThreshold:按住后移动超过该像素才算拖拽;调大后小幅晃动不触发。',
      control: { type: 'range', min: 0, max: 24, step: 8 },
    },
  },
  render: renderDragLab,
  parameters: storySource(dragLabSource),
};
