import exampleSource from './sprite-labels.js?raw';

import { sceneStory } from '../../assets/story-canvas.js';
import { sceneSource } from '../../assets/story-source.js';
import { spriteLabelsExample } from './sprite-labels.js';

export default {
  id: 'sprite-billboard',
  title: '核心系统/空间与对象/Sprite',
  tags: ['!dev']
};

export const Billboard = {
  name: '始终面向相机',
  args: {
    autoRotate: true,
    sizeAttenuation: true,
    spriteRotation: 0
  },
  argTypes: {
    autoRotate: {
      name: '相机自动绕中心旋转',
      control: 'boolean'
    },
    sizeAttenuation: {
      name: 'sizeAttenuation',
      control: 'boolean'
    },
    spriteRotation: {
      name: 'SpriteMaterial.rotation（度）',
      control: { type: 'range', min: -180, max: 180, step: 5 }
    }
  },
  render: sceneStory(spriteLabelsExample),
  parameters: sceneSource(exampleSource)
};
