import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createLodExample,
  type LodInstance,
  type LodSnapshot,
} from './example';

interface LodArgs {
  cameraRadius: number;
}

const renderLod = canvasStory({
  create: createLodExample,
  apply(instance: LodInstance, args: LodArgs) {
    instance.update(args);
  },
  readout(snapshot: LodSnapshot) {
    return [
      ['当前距离', snapshot.cameraDistance],
      ['激活层级', snapshot.activeLabel],
      ['当前几何', snapshot.activeGeo],
      ['当前三角形', snapshot.activeTriangles],
      ['全部层级', snapshot.allLevels],
    ];
  },
});

export default {
  id: 'lod-and-levels',
  title: '场景与对象/LOD',
  tags: ['!dev'],
};

export const Lod = {
  name: 'LOD 距离切换',
  args: {
    cameraRadius: 4,
  },
  argTypes: {
    cameraRadius: {
      name: '相机距离（camera.radius）',
      control: { type: 'range', min: 3, max: 30, step: 0.5 },
      description:
        '写入 ArcRotateCamera.radius。源网格放在原点，所以 radius 等于相机到 mesh 包围球中心的世界距离——也就是 LOD 内部用来挑层级的同一个值。跨过 7 / 13 / 19 / 25 时会逐级切换或剔除。',
    },
  },
  render: renderLod,
  parameters: storySource(exampleSource),
};
