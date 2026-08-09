import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createMeshBuilderExample,
  type MeshBuilderInstance,
  type MeshBuilderSnapshot,
  type ShapeKind,
} from './example';

interface MeshBuilderArgs {
  shape: ShapeKind;
  detail: number;
}

const renderMeshBuilder = canvasStory({
  create: createMeshBuilderExample,
  apply(instance: MeshBuilderInstance, args: MeshBuilderArgs) {
    instance.update(args);
  },
  readout(snapshot: MeshBuilderSnapshot) {
    return [
      ['当前形状', snapshot.shape],
      ['顶点数', snapshot.vertices.toLocaleString()],
      ['面数', snapshot.faces.toLocaleString()],
    ];
  },
});

export default {
  id: 'mesh-and-meshbuilder',
  title: '场景与对象/网格',
  tags: ['!dev'],
};

export const Shapes = {
  name: '内置形状切换',
  args: {
    shape: 'box',
    detail: 16,
  },
  argTypes: {
    shape: {
      name: '形状',
      control: { type: 'select' },
      options: ['box', 'sphere', 'cylinder', 'torus', 'plane', 'ground'],
      description:
        '切换 MeshBuilder.Create* 生成的内置形状。各形状 options 不同，readout 同步显示顶点数（getTotalVertices）与面数（getTotalIndices / 3）。',
    },
    detail: {
      name: '细分（segments / tessellation / subdivisions）',
      control: { type: 'range', min: 3, max: 48, step: 1 },
      description:
        '细分参数：sphere→segments、cylinder/torus→tessellation、ground→subdivisions。box 与 plane 无细分，调整时顶点/面数不变——这也是可观察证据。',
    },
  },
  render: renderMeshBuilder,
  parameters: storySource(exampleSource),
};
