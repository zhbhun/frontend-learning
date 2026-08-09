import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import shaderSource from './shader.ts?raw';
import planeSource from './mesh-builtins.ts?raw';
import {
  createShaderDemo,
  type ShaderDemoInstance,
  type ShaderDemoSnapshot,
} from './shader';
import {
  createPlaneDemo,
  type PlaneDemoInstance,
  type PlaneDemoSnapshot,
} from './mesh-builtins';

interface ShaderDemoArgs {
  hue: number;
  frequency: number;
  speed: number;
}

interface PlaneDemoArgs {
  amplitude: number;
  waveDensity: number;
}

const meta = {
  id: 'mesh-shader',
  title: '进阶渲染/网格与着色器',
  tags: ['!dev'],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const ShaderDemo: Story = {
  args: {
    hue: 200,
    frequency: 6,
    speed: 0.8,
  },
  argTypes: {
    hue: {
      name: '色相 hue',
      description: 'uColor 基色色相（0–360），每帧写入 UniformGroup。',
      control: { type: 'range', min: 0, max: 360, step: 1 },
    },
    frequency: {
      name: '频率 frequency',
      description: '波纹密度，传给 fragment 的 uFrequency。',
      control: { type: 'range', min: 1, max: 14, step: 0.5 },
    },
    speed: {
      name: '速度 speed',
      description: '图案流动速度，传给 fragment 的 uSpeed。',
      control: { type: 'range', min: 0, max: 2, step: 0.05 },
    },
  },
  render: canvasStory({
    create: createShaderDemo,
    apply(instance: ShaderDemoInstance, args: ShaderDemoArgs) {
      instance.update(args);
    },
    readout(snapshot: ShaderDemoSnapshot) {
      return [
        ['色相 hue', snapshot.hue],
        ['频率 frequency', snapshot.frequency],
        ['速度 speed', snapshot.speed],
        ['uTime', snapshot.uTime],
      ];
    },
  }),
  parameters: storySource(shaderSource),
};

export const PlaneDemo: Story = {
  args: {
    amplitude: 14,
    waveDensity: 3,
  },
  argTypes: {
    amplitude: {
      name: '振幅 amplitude',
      description: '波浪起伏的像素幅度。',
      control: { type: 'range', min: 0, max: 40, step: 1 },
    },
    waveDensity: {
      name: '波密度 waveDensity',
      description: '单位时间内的波数，控制流动速度与密度。',
      control: { type: 'range', min: 0, max: 8, step: 0.5 },
    },
  },
  render: canvasStory({
    create: createPlaneDemo,
    apply(instance: PlaneDemoInstance, args: PlaneDemoArgs) {
      instance.update(args);
    },
    readout(snapshot: PlaneDemoSnapshot) {
      return [
        ['振幅 amplitude', snapshot.amplitude],
        ['波密度 waveDensity', snapshot.waveDensity],
      ];
    },
  }),
  parameters: storySource(planeSource),
};
