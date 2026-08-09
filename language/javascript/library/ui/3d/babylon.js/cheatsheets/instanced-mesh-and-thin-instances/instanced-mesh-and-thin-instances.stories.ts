import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createInstancesExample,
  type InstanceMode,
  type InstancesInstance,
  type InstancesSnapshot,
} from './example';

interface InstancesArgs {
  mode: InstanceMode;
  count: number;
}

const renderInstances = canvasStory({
  create: createInstancesExample,
  apply(instance: InstancesInstance, args: InstancesArgs) {
    instance.update(args);
  },
  readout(snapshot: InstancesSnapshot) {
    return [
      ['渲染模式', snapshot.modeLabel],
      ['实例数', snapshot.count],
      ['本帧 draw calls', snapshot.drawCalls],
      ['场景网格数', snapshot.sceneMeshes],
      ['FPS', snapshot.fps],
    ];
  },
});

export default {
  id: 'instanced-mesh-and-thin-instances',
  title: '场景与对象/实例化',
  tags: ['!dev'],
};

export const Instances = {
  name: '实例化',
  args: {
    mode: 'instanced',
    count: 400,
  },
  argTypes: {
    mode: {
      name: '实例化方式',
      control: { type: 'radio' },
      options: ['instanced', 'thin', 'individual'],
      labels: {
        instanced: 'InstancedMesh',
        thin: 'thin instances',
        individual: '普通 Mesh',
      },
      description:
        'instanced：mesh.createInstance 创建独立对象，可拾取、可单独 dispose；thin：矩阵写 buffer，无 JS 对象，最轻最快；individual：每个 Mesh 一次 draw call，仅作对照。',
    },
    count: {
      name: '实例数',
      control: { type: 'range', min: 100, max: 5000, step: 100 },
      description:
        '同一份柱子几何渲染的数量。调大后观察 draw calls 与 FPS：instanced/thin 的 draw calls 基本不随数量增长，individual 与数量 1:1 攀升。',
    },
  },
  render: renderInstances,
  parameters: storySource(exampleSource),
};
