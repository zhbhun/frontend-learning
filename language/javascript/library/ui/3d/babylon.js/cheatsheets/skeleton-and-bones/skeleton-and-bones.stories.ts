import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createSkeletonDemo,
  type SkeletonDemoInstance,
  type SkeletonDemoSnapshot,
  type WeightMode,
} from './example';

interface SkeletonArgs {
  bendDeg: number;
  weightMode: WeightMode;
  showViewer: boolean;
}

const renderSkeleton = canvasStory({
  create: createSkeletonDemo,
  apply(instance: SkeletonDemoInstance, args: SkeletonArgs) {
    instance.update(args);
  },
  readout(snapshot: SkeletonDemoSnapshot) {
    return [
      ['骨骼数', snapshot.boneCount],
      ['关节角度', snapshot.jointDeg],
      ['权重模式', snapshot.weightMode],
      ['骨骼可视化', snapshot.viewerOn],
      ['FPS', snapshot.fps],
    ];
  },
});

export default {
  id: 'skeleton-and-bones',
  title: '模型与资产/骨骼与蒙皮',
  tags: ['!dev'],
};

export const Skeleton = {
  name: '骨骼与蒙皮',
  args: {
    bendDeg: 45,
    weightMode: 'smooth',
    showViewer: true,
  },
  argTypes: {
    bendDeg: {
      name: 'tip 骨骼旋转（度）',
      control: { type: 'range', min: -75, max: 75, step: 5 },
      description:
        '写入 tip 骨骼的局部 Z 轴旋转（setYawPitchRoll）。tip 的绝对位置在圆柱中点（关节），旋转它上半段顶点绕关节弯曲；负值反向弯。',
    },
    weightMode: {
      name: '权重模式',
      options: ['rigid', 'smooth'],
      control: { type: 'inline-radio' },
      description:
        '重写 mesh 的 matricesWeights / matricesIndices。rigid：y>=0 全归 tip、y<0 全归 root，接缝处折成尖角；smooth：|y|<0.6 的带内线性混合，弯曲成连续圆弧。',
    },
    showViewer: {
      name: '显示骨骼（SkeletonViewer）',
      control: 'boolean',
      description:
        '叠加 SkeletonViewer，画出骨骼连线并随骨骼变换实时更新；关闭后只剩蒙皮网格，对比"骨骼动→画面弯"。',
    },
  },
  render: renderSkeleton,
  parameters: storySource(exampleSource),
};
