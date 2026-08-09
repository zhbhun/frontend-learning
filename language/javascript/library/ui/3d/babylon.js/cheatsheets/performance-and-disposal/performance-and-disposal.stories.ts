import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createPerformanceExample,
  type PerformanceInstance,
  type PerformanceOptions,
  type PerformanceSnapshot,
} from './example';

interface PerfArgs {
  instanceCount: number;
  freezeWorldMatrix: boolean;
  freezeActiveMeshes: boolean;
  hardwareScaling: number;
  optimizerEnabled: boolean;
}

const renderPerf = canvasStory({
  create: createPerformanceExample,
  apply(instance: PerformanceInstance, args: PerfArgs) {
    instance.update(args);
  },
  readout(snapshot: PerformanceSnapshot) {
    return [
      ['Draw calls', snapshot.drawCalls],
      ['三角形数', snapshot.triangles.toLocaleString()],
      ['FPS', snapshot.fps],
      ['GPU 帧时间 (ms)', snapshot.gpuFrameMs],
      ['当前硬件缩放', snapshot.hardwareScaling],
      ['优化器', snapshot.optimizerState],
    ];
  },
});

export default {
  id: 'performance-and-disposal',
  title: '工程实践/性能',
  tags: ['!dev'],
};

export const Perf = {
  name: '性能优化对照',
  args: {
    instanceCount: 800,
    freezeWorldMatrix: false,
    freezeActiveMeshes: false,
    hardwareScaling: 1,
    optimizerEnabled: false,
  },
  argTypes: {
    instanceCount: {
      name: '对象数量',
      control: { type: 'range', min: 50, max: 1500, step: 50 },
      description:
        '方阵里独立 Mesh 的数量（共享一份 material）。每个 box 占一次 draw call，调大后 draw calls 与每帧 CPU 工作量近似线性增长，用来观察读数与各优化手段的响应。',
    },
    freezeWorldMatrix: {
      name: '冻结世界矩阵',
      control: 'boolean',
      description:
        'mesh.freezeWorldMatrix() / unfreezeWorldMatrix()。静态网格冻结后跳过每帧世界矩阵重算；解冻后才能再改 position/rotation/scaling。',
    },
    freezeActiveMeshes: {
      name: '冻结活跃网格',
      control: 'boolean',
      description:
        'scene.freezeActiveMeshes() / unfreezeActiveMeshes()。冻结活跃网格列表后跳过每帧的可见性/视锥评估；新增或移动 mesh 前需要先解冻。',
    },
    hardwareScaling: {
      name: '硬件缩放级别',
      control: { type: 'range', min: 1, max: 3, step: 0.5 },
      description:
        'engine.setHardwareScalingLevel(level)：>1 时降低渲染分辨率换 GPU 性能（2 = 半分辨率）。优化器开启时由优化器接管，滑块值作为基线与关闭后的复位值。',
    },
    optimizerEnabled: {
      name: 'SceneOptimizer',
      control: 'boolean',
      description:
        'new SceneOptimizer(scene, options) + start()/stop()。开启后按 FPS 自动调高硬件缩放（每次 +0.5，上限 3）；关闭时优化器降级是单向的，这里显式复位回滑块值让范例可重复。',
    },
  },
  render: renderPerf,
  parameters: storySource(exampleSource),
};
