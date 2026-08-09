import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createDebugExample,
  type DebugInstance,
  type DebugSnapshot,
} from './example';

interface DebugArgs {
  showAxes: boolean;
  axesScale: number;
  overlayMode: 'none' | 'boundingBox' | 'wireframe';
  objectCount: number;
}

const renderDebug = canvasStory({
  create: createDebugExample,
  apply(instance: DebugInstance, args: DebugArgs) {
    instance.update(args);
  },
  readout(snapshot: DebugSnapshot) {
    return [
      ['坐标轴', snapshot.axesLabel],
      ['Draw calls', snapshot.drawCalls],
      ['三角形数', snapshot.triangles],
      ['FPS', snapshot.fps],
      ['Mesh 数', snapshot.meshCount],
    ];
  },
});

export default {
  id: 'inspector-and-debug',
  title: '工程实践/调试',
  tags: ['!dev'],
};

export const Debug = {
  name: '调试面板',
  args: {
    showAxes: true,
    axesScale: 2,
    overlayMode: 'none',
    objectCount: 6,
  },
  argTypes: {
    showAxes: {
      name: '显示坐标轴',
      control: 'boolean',
      description:
        '创建 AxesViewer 并在原点显示三色世界轴（X 红、Y 绿、Z 蓝）。关闭时 dispose，对应 LinesMesh 移出场景树，Mesh 数与 draw calls 随之下降。',
    },
    axesScale: {
      name: '坐标轴线长',
      control: { type: 'range', min: 0.5, max: 4, step: 0.5 },
      description:
        '写入 AxesViewer 构造参数 scaleLines。只改变三色轴的视觉尺寸，不影响场景中的其他对象。',
    },
    overlayMode: {
      name: '调试覆盖层',
      options: ['none', 'boundingBox', 'wireframe'],
      control: { type: 'radio' },
      labels: { none: '无', boundingBox: '包围盒', wireframe: '线框' },
      description:
        '无：默认着色；包围盒：mesh.showBoundingBox=true，显示每个对象的 AABB；线框：material.wireframe=true，显示几何拓扑。',
    },
    objectCount: {
      name: '对象数量',
      control: { type: 'range', min: 0, max: 24, step: 1 },
      description:
        '环形排列的对象数。增加时 Draw calls 与三角形数近似线性增长，用来观察 SceneInstrumentation 读数的响应。',
    },
  },
  render: renderDebug,
  parameters: storySource(exampleSource),
};
