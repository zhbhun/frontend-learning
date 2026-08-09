import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './scene-graph.ts?raw';
import {
  createSceneGraph,
  type SceneGraphInstance,
  type SceneGraphSnapshot,
} from './scene-graph';

interface SceneGraphArgs {
  parentX: number;
  childX: number;
}

const renderInteractive = canvasStory({
  create: createSceneGraph,
  apply(instance: SceneGraphInstance, args: SceneGraphArgs) {
    instance.update({ parentX: args.parentX, childX: args.childX });
  },
  readout(snapshot: SceneGraphSnapshot) {
    return [
      ['父容器 X（本地）', snapshot.parentLocalX],
      ['子对象 X（本地）', snapshot.childLocalX],
      ['子对象 X（全局）', snapshot.childGlobalX],
      ['父 + 子本地', snapshot.cumulative],
    ];
  },
});

const meta = {
  id: 'scene-graph',
  title: '入门/场景图与容器',
  tags: ['!dev'],
  args: {
    parentX: 80,
    childX: 70,
  },
  argTypes: {
    parentX: {
      name: '父容器 X',
      description:
        'parent 容器在 stage 中的本地 X。拖动它，蓝框与红圆整体平移——父变换传递给子。',
      control: { type: 'range', min: 0, max: 300, step: 5 },
    },
    childX: {
      name: '子对象 X',
      description:
        '红圆在 parent 内的本地 X。拖动它，只有红圆在蓝框内平移——本地坐标相对父节点。',
      control: { type: 'range', min: 0, max: 180, step: 5 },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<SceneGraphArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
