import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import effectsLabSource from './effects-lab.ts?raw';
import {
  createEffectsLab,
  type CameraEffectsInstance,
  type CameraEffectsParams,
  type CameraEffectsSnapshot,
  type EffectStatus,
} from './effects-lab';

/** 效果读数:空闲 / 运行中(进度)/ 已完成(fade 完成后保持颜色覆盖)。 */
function effectStatus(effect: EffectStatus, label: string): string {
  if (effect.running) {
    return `运行中 ${Math.round(effect.progress * 100)}%`;
  }
  if (effect.complete) {
    return `已完成(${label} 保持颜色覆盖,reset / 反方向 fade 才清除)`;
  }
  return '空闲';
}

const renderEffectsLab = canvasStory({
  create: createEffectsLab,
  apply(instance: CameraEffectsInstance, args: CameraEffectsParams) {
    instance.applyParams(args);
  },
  readout(snapshot: CameraEffectsSnapshot) {
    const hudLabels: Record<CameraEffectsParams['hudMode'], string> = {
      off: 'off(HUD 隐藏,摄像机数量不变)',
      scrollFactor: 'setScrollFactor(0)(HUD 仍由主摄像机渲染)',
      ignore: 'camera.ignore + UI 摄像机(HUD 独占)',
    };
    return [
      ['shake 效果', effectStatus(snapshot.shake, 'shake')],
      [
        'flash 效果',
        snapshot.flash.running
          ? `运行中 ${Math.round(snapshot.flash.progress * 100)}%`
          : '空闲',
      ],
      [
        `fade 效果(方向 ${snapshot.fade.direction ?? '—'})`,
        effectStatus(snapshot.fade, `fade ${snapshot.fade.direction}`),
      ],
      ['最近效果事件', snapshot.lastEvent],
      ['摄像机数量', `${snapshot.cameraCount} 台(getTotal)`],
      [
        '摄像机清单(id = ignore 位掩码)',
        snapshot.cameras
          .map(
            (c) =>
              `${c.name}#id${c.id} scroll(${c.scrollX}, ${c.scrollY})`,
          )
          .join(' · '),
      ],
      ['main zoom', String(snapshot.mainZoom)],
      ['HUD 方案', hudLabels[snapshot.hudMode]],
      ['目标世界坐标', `(${snapshot.target.x}, ${snapshot.target.y})`],
    ];
  },
  captions: [
    '点击画布底部按钮触发效果 · fadeOut 完成后画面保持黑色:把方向切到 fadeIn 再点一次恢复',
    '打开「小地图」并切换「HUD 方案」观察 camera.ignore 与 setScrollFactor(0) 的差别',
  ],
});

const meta = {
  id: 'camera-effects',
  title: '资源与显示/摄像机效果',
  tags: ['!dev'],
  args: {
    shakeIntensity: 0.05,
    flashColor: '#ffffff',
    fadeDuration: 1000,
    fadeDirection: 'out',
    minimap: true,
    hudMode: 'scrollFactor',
  },
  argTypes: {
    shakeIntensity: {
      name: 'shake 强度',
      description:
        'cam.shake(600, intensity) 的 intensity:0–1 的视口比例,0.05 即最大偏移约 5% 视口宽;偏移还会乘上 zoom。',
      control: { type: 'range', min: 0.01, max: 0.1, step: 0.01 },
    },
    flashColor: {
      name: 'flash 颜色',
      description:
        'cam.flash(400, r, g, b) 的颜色来源:先满色覆盖视口,再随 progress 衰减到透明。',
      control: { type: 'color' },
    },
    fadeDuration: {
      name: 'fade 时长(ms)',
      description:
        'cam.fadeOut / fadeIn 的 duration:淡入淡出的总时长,progress 在此期间从 0 走到 1。',
      control: { type: 'range', min: 250, max: 2000, step: 250 },
    },
    fadeDirection: {
      name: 'fade 方向',
      description:
        'out = fadeOut(透明→颜色,完成后保持覆盖);in = fadeIn(颜色→透明,可用来恢复)。',
      options: ['out', 'in'] as CameraEffectsParams['fadeDirection'][],
      control: { type: 'inline-radio' },
    },
    minimap: {
      name: '第二摄像机小地图(画中画)',
      description:
        'cameras.add(右上角小视口) + zoom ≈ 0.144 看满世界;主摄像机的效果与滚动都不影响它。',
      control: { type: 'boolean' },
    },
    hudMode: {
      name: 'HUD 方案',
      description:
        'scrollFactor = setScrollFactor(0)(HUD 固定屏幕位置但仍属主摄像机);ignore = camera.ignore + 独立 UI 摄像机(HUD 完全隔离);off = 隐藏 HUD。',
      options: ['off', 'scrollFactor', 'ignore'] as CameraEffectsParams['hudMode'][],
      control: { type: 'inline-radio' },
    },
  },
  render: renderEffectsLab,
  parameters: storySource(effectsLabSource),
} satisfies Meta<CameraEffectsParams>;

export default meta;

type Story = StoryObj<typeof meta>;

export const EffectsLab: Story = {};

