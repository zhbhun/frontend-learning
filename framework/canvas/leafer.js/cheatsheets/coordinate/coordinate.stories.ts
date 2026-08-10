import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createCoordinateScene,
  type CoordinateInstance,
  type CoordinateSnapshot,
} from './example';

interface CoordinateArgs {
  parentX: number;
  parentY: number;
  childX: number;
  childY: number;
}

const renderInteractive = canvasStory({
  create: createCoordinateScene,
  apply(instance: CoordinateInstance, args: CoordinateArgs) {
    instance.update(args);
  },
  readout(snapshot: CoordinateSnapshot) {
    return [
      ['父级位移 (group.x/y)', `${snapshot.parentX}, ${snapshot.parentY}`],
      ['子节点本地 (rect.x/y)', `${snapshot.localX}, ${snapshot.localY}`],
      ['世界坐标 getWorldPointByLocal', `${snapshot.worldX}, ${snapshot.worldY}`],
      ['世界原点 getLocalPoint', `${snapshot.originLocalX}, ${snapshot.originLocalY}`],
    ];
  },
});

const meta = {
  id: 'coordinate',
  title: '节点树与坐标/坐标体系',
  tags: ['!dev'],
  args: {
    parentX: 90,
    parentY: 70,
    childX: 48,
    childY: 38,
  },
  argTypes: {
    parentX: {
      name: '父级位移 X',
      description:
        '父 Group 的本地 x（group.x）。根的本地系即世界系，所以它也是父级在世界中的水平位置；改变它会平移整组，子节点本地坐标不变。',
      control: {
        type: 'range',
        min: 0,
        max: 320,
        step: 2,
      },
    },
    parentY: {
      name: '父级位移 Y',
      description:
        '父 Group 的本地 y（group.y）。改变它会平移整组，子节点本地坐标不变、世界坐标随之变化。',
      control: {
        type: 'range',
        min: 0,
        max: 220,
        step: 2,
      },
    },
    childX: {
      name: '子节点本地 X',
      description:
        '子节点在父 Group 本地系中的 x（rect.x）。改变它只移动子节点本身，父级不动。',
      control: {
        type: 'range',
        min: 0,
        max: 200,
        step: 2,
      },
    },
    childY: {
      name: '子节点本地 Y',
      description:
        '子节点在父 Group 本地系中的 y（rect.y）。改变它只移动子节点本身，父级不动。',
      control: {
        type: 'range',
        min: 0,
        max: 110,
        step: 2,
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<CoordinateArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
