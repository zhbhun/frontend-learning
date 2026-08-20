import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createGameConfigExample,
  type GameConfigInstance,
  type GameConfigOptions,
  type ScaleSnapshot,
} from './example';

const renderInteractive = canvasStory({
  create: createGameConfigExample,
  apply(instance: GameConfigInstance, args: GameConfigOptions) {
    instance.update(args);
  },
  readout(snapshot: ScaleSnapshot) {
    return [
      ['缩放模式', snapshot.mode],
      ['gameSize', snapshot.gameSize],
      ['displaySize', snapshot.displaySize],
      ['zoom', snapshot.zoom],
      ['displayScale', snapshot.displayScale],
      ['渲染器', snapshot.renderType],
    ];
  },
  captions: ['父容器(棋盘格)= Scale Manager 的适配目标'],
});

const meta = {
  id: 'game-config',
  title: '上手/创建游戏',
  tags: ['!dev'],
  args: {
    mode: 'FIT',
    width: 640,
    height: 360,
    zoom: 'NO_ZOOM',
    autoCenter: 'NO_CENTER',
  },
  argTypes: {
    mode: {
      name: '缩放模式',
      description: 'Phaser.Scale.ScaleModes;切换后销毁重建 Game。',
      options: [
        'NONE',
        'FIT',
        'ENVELOP',
        'RESIZE',
        'EXPAND',
        'WIDTH_CONTROLS_HEIGHT',
        'HEIGHT_CONTROLS_WIDTH',
      ],
      control: {
        type: 'radio',
        labels: {
          NONE: 'NONE 固定不缩放',
          FIT: 'FIT 等比缩入(留边)',
          ENVELOP: 'ENVELOP 等比盖满(裁剪)',
          RESIZE: 'RESIZE 跟随父容器',
          EXPAND: 'EXPAND 沿一轴扩展(Phaser 4)',
          WIDTH_CONTROLS_HEIGHT: 'WIDTH_CONTROLS_HEIGHT 宽定高',
          HEIGHT_CONTROLS_WIDTH: 'HEIGHT_CONTROLS_WIDTH 高定宽',
        },
      },
    },
    width: {
      name: '宽度',
      description: 'config 里的游戏分辨率宽(width)。',
      control: { type: 'range', min: 320, max: 960, step: 40 },
    },
    height: {
      name: '高度',
      description: 'config 里的游戏分辨率高(height)。',
      control: { type: 'range', min: 180, max: 540, step: 20 },
    },
    zoom: {
      name: 'zoom',
      description: 'scale.zoom,画布整体放大倍数。',
      options: ['NO_ZOOM', 'ZOOM_2X', 'ZOOM_4X', 'MAX_ZOOM'],
      control: {
        type: 'radio',
        labels: {
          NO_ZOOM: '1x',
          ZOOM_2X: '2x',
          ZOOM_4X: '4x',
          MAX_ZOOM: 'MAX_ZOOM',
        },
      },
    },
    autoCenter: {
      name: 'autoCenter',
      description: 'scale.autoCenter,画布在父容器内的居中方式。',
      options: ['NO_CENTER', 'CENTER_BOTH', 'CENTER_HORIZONTALLY', 'CENTER_VERTICALLY'],
      control: {
        type: 'radio',
        labels: {
          NO_CENTER: '不居中',
          CENTER_BOTH: '双向居中',
          CENTER_HORIZONTALLY: '水平居中',
          CENTER_VERTICALLY: '垂直居中',
        },
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<GameConfigOptions>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
