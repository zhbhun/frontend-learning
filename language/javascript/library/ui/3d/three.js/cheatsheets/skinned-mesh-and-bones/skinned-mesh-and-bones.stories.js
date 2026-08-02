import exampleSource from './skinned-mesh-example.js?raw';

import { sceneStory } from '../../assets/story-canvas.js';
import { sceneSource } from '../../assets/story-source.js';
import { skinnedExample } from './skinned-mesh-example.js';

export default {
  id: 'skinned-mesh-and-bones',
  title: '核心系统/空间与对象/SkinnedMesh',
  tags: ['!dev']
};

export const BoneRotation = {
  name: '旋转骨骼看蒙皮变形',
  args: {
    elbowDeg: 45,
    weightMode: 'smooth'
  },
  argTypes: {
    elbowDeg: {
      name: 'elbow.rotation.x',
      control: { type: 'range', min: 0, max: 90, step: 1 }
    },
    weightMode: {
      name: 'skinWeight 模式',
      control: 'inline-radio',
      options: ['smooth', 'rigid'],
      labels: { smooth: '平滑过渡', rigid: '刚硬接缝' }
    }
  },
  render: sceneStory(skinnedExample),
  parameters: sceneSource(exampleSource)
};
