import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createMorphTargetsExample,
  type MorphTargetsInstance,
  type MorphTargetsSnapshot,
} from './example';

interface MorphTargetsArgs {
  influenceInflate: number;
  influenceFlatten: number;
  influenceTwist: number;
}

const renderMorph = canvasStory({
  create: createMorphTargetsExample,
  apply(instance: MorphTargetsInstance, args: MorphTargetsArgs) {
    instance.update(args);
  },
  readout(snapshot: MorphTargetsSnapshot) {
    return [
      ['膨胀', snapshot.influenceInflate.toFixed(2)],
      ['压扁', snapshot.influenceFlatten.toFixed(2)],
      ['扭曲', snapshot.influenceTwist.toFixed(2)],
      ['活跃目标数', snapshot.activeTargets],
      ['顶点数', snapshot.vertexCount],
      ['FPS', snapshot.fps],
    ];
  },
});

export default {
  id: 'morph-targets',
  title: '动画与时间/形变动画',
  tags: ['!dev'],
};

// 导出名用 Morph（形变），与课程主题一致。
export const Morph = {
  name: '形变混合',
  args: {
    influenceInflate: 0,
    influenceFlatten: 0,
    influenceTwist: 0.3,
  },
  argTypes: {
    influenceInflate: {
      name: '膨胀',
      description:
        '「膨胀」MorphTarget 的 influence（0-1）。目标 positions 把每顶点沿径向外推 50%；拖动时 GPU 在原始与目标顶点之间按公式线性混合，CPU 顶点缓冲不变。',
      control: { type: 'range', min: 0, max: 1, step: 0.01 },
    },
    influenceFlatten: {
      name: '压扁',
      description:
        '「压扁」MorphTarget 的 influence（0-1）。目标 positions 把 Y 轴缩到 0.4、X/Z 放大 15%，呈扁平状。',
      control: { type: 'range', min: 0, max: 1, step: 0.01 },
    },
    influenceTwist: {
      name: '扭曲',
      description:
        '「扭曲」MorphTarget 的 influence（0-1）。目标 positions 绕 Y 轴按高度旋转，顶部扭得多、赤道不动。',
      control: { type: 'range', min: 0, max: 1, step: 0.01 },
    },
  },
  render: renderMorph,
  parameters: storySource(exampleSource),
};
