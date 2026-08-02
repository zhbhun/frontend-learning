import exampleSource from './lod-example.js?raw';

import { sceneStory } from '../../assets/story-canvas.js';
import { sceneSource } from '../../assets/story-source.js';
import { lodExample } from './lod-example.js';

export default {
  id: 'lod-object',
  title: '核心系统/空间与对象/LOD',
  tags: ['!dev']
};

export const DistanceSwitch = {
  name: '按距离切换细节层级',
  args: {
    cameraDistance: 6,
    hysteresis: 0
  },
  argTypes: {
    cameraDistance: {
      name: '相机到 LOD 的距离',
      control: { type: 'range', min: 1, max: 12, step: 0.1 }
    },
    hysteresis: {
      name: 'hysteresis（该层 distance 的比例）',
      control: { type: 'range', min: 0, max: 0.3, step: 0.05 }
    }
  },
  render: sceneStory(lodExample),
  parameters: sceneSource(exampleSource)
};
