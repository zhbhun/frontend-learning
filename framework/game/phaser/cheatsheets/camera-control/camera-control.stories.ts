import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import cameraLabSource from './camera-lab.ts?raw';
import {
  createCameraLab,
  type CameraLabInstance,
  type CameraLabParams,
  type CameraLabSnapshot,
} from './camera-lab';

function pt(x: number, y: number): string {
  return `(${x}, ${y})`;
}

function rect(r: CameraLabSnapshot['worldView']): string {
  return `(${r.x}, ${r.y}) ${r.w}×${r.h}`;
}

const renderCameraLab = canvasStory({
  create: createCameraLab,
  apply(instance: CameraLabInstance, args: CameraLabParams) {
    instance.applyParams(args);
  },
  readout(snapshot: CameraLabSnapshot) {
    return [
      [
        '跟随状态',
        snapshot.follow ? 'startFollow(跟随中)' : 'stopFollow(滚动停在原地)',
      ],
      ['scrollX / scrollY', pt(snapshot.scrollX, snapshot.scrollY)],
      ['worldView(可见世界矩形)', rect(snapshot.worldView)],
      [
        'midPoint(镜头中心世界坐标)',
        pt(snapshot.midX, snapshot.midY),
      ],
      ['目标世界坐标', pt(snapshot.targetX, snapshot.targetY)],
      [
        '目标在死区内',
        snapshot.inDeadzone === null
          ? '—(未启用 deadzone)'
          : snapshot.inDeadzone
            ? '是(该轴不滚动)'
            : '否(越界轴追赶)',
      ],
      [
        '指针 screen x,y → worldX',
        `${pt(snapshot.pointer.x, snapshot.pointer.y)} → ${pt(snapshot.pointer.worldX, snapshot.pointer.worldY)}`,
      ],
      [
        'getWorldPoint(指针)',
        `${pt(snapshot.pointer.viaWorldPointX, snapshot.pointer.viaWorldPointY)}(与 worldX 相等)`,
      ],
    ];
  },
  captions: ['拖拽菱形目标改变位置 · 把指针移到画布上查看坐标换算'],
});

const meta = {
  id: 'camera-control',
  title: '资源与显示/摄像机控制',
  tags: ['!dev'],
  args: {
    follow: true,
    lerp: 1,
    deadzone: false,
    zoom: 1,
    useBounds: true,
  },
  argTypes: {
    follow: {
      name: '跟随目标',
      description:
        'startFollow / stopFollow:跟随时每帧自动调整 scroll 保持目标居中;停止后 scroll 停在原地。',
      control: { type: 'boolean' },
    },
    lerp: {
      name: 'lerp 平滑',
      description:
        'setLerp(x, y):0–1 的每帧线性插值比例,1 为瞬移,越小越平滑;不随帧率归一。',
      control: { type: 'range', min: 0, max: 1, step: 0.05 },
    },
    deadzone: {
      name: 'deadzone 死区',
      description:
        'setDeadzone(216, 136) / 无参清除:镜头中心的固定矩形,目标在区内时该轴不滚动。',
      control: { type: 'boolean' },
    },
    zoom: {
      name: 'zoom 缩放',
      description:
        'setZoom:纯显示缩放,不改视口与分辨率;worldView 尺寸 = 视口 ÷ zoom,bounds 的可滚范围也随之变化。',
      control: { type: 'range', min: 0.5, max: 2, step: 0.25 },
    },
    useBounds: {
      name: 'bounds 边界',
      description:
        'setBounds(0, 0, 1440, 810) / removeBounds:开启后任何来源的 scroll 每帧被钳制在世界内。',
      control: { type: 'boolean' },
    },
  },
  render: renderCameraLab,
  parameters: storySource(cameraLabSource),
} satisfies Meta<CameraLabParams>;

export default meta;

type Story = StoryObj<typeof meta>;

export const CameraLab: Story = {};
