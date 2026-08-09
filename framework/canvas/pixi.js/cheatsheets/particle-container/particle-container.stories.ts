import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import particleSource from './particle-container.ts?raw';
import {
  createParticleDemo,
  type ParticleDemoInstance,
  type ParticleDemoSnapshot,
} from './particle-container';

interface ParticleArgs {
  count: number;
  positionDynamic: boolean;
  rotationDynamic: boolean;
  colorDynamic: boolean;
}

const meta = {
  id: 'particle-container',
  title: '进阶渲染/粒子容器',
  tags: ['!dev'],
  args: {
    count: 1000,
    positionDynamic: true,
    rotationDynamic: false,
    colorDynamic: false,
  },
  argTypes: {
    count: {
      name: '粒子数量',
      description:
        'ParticleContainer.particleChildren 的长度。增大到数千时观察帧率读数——ParticleContainer 的吞吐优势。',
      control: { type: 'range', min: 100, max: 5000, step: 100 },
    },
    positionDynamic: {
      name: 'position 动态',
      description:
        '对应 dynamicProperties.position（默认 true）。关闭后粒子的 x/y 不再每帧上传 GPU——位置画面冻结，但 CPU 仍在更新坐标。',
      control: { type: 'boolean' },
    },
    rotationDynamic: {
      name: 'rotation 动态',
      description:
        '对应 dynamicProperties.rotation（默认 false）。开启后每帧上传旋转值，粒子自转可见；关闭则旋转冻结。',
      control: { type: 'boolean' },
    },
    colorDynamic: {
      name: 'color 动态',
      description:
        '对应 dynamicProperties.color（默认 false）。开启后每帧上传 tint/alpha 组合色，染色循环可见；关闭则颜色冻结。',
      control: { type: 'boolean' },
    },
  },
  render: canvasStory({
    create: createParticleDemo,
    apply(instance: ParticleDemoInstance, args: ParticleArgs) {
      instance.update(args);
    },
    readout(snapshot: ParticleDemoSnapshot) {
      return [
        ['粒子数', snapshot.count],
        ['动态属性', snapshot.dynamicProperties],
        ['帧率', `${snapshot.fps} fps`],
      ];
    },
  }),
  parameters: storySource(particleSource),
} satisfies Meta<ParticleArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ParticleField: Story = {};
