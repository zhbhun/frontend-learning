import cloudSource from './points-cloud.js?raw';
import textureSource from './points-texture.js?raw';

import { sceneStory } from '../../assets/story-canvas.js';
import { sceneSource } from '../../assets/story-source.js';
import { pointsCloudExample } from './points-cloud.js';
import { pointsTextureExample } from './points-texture.js';

export default {
  id: 'points-object',
  title: '核心系统/空间与对象/Points',
  tags: ['!dev']
};

export const SizeAndAttenuation = {
  name: '点的尺寸与衰减',
  args: {
    sizeAttenuation: true,
    worldSize: 0.18,
    pixelSize: 8,
    cameraDistance: 6
  },
  argTypes: {
    sizeAttenuation: {
      name: 'material.sizeAttenuation',
      control: 'boolean'
    },
    worldSize: {
      name: 'size（sizeAttenuation=true，世界单位）',
      control: { type: 'range', min: 0.02, max: 0.6, step: 0.02 }
    },
    pixelSize: {
      name: 'size（sizeAttenuation=false，像素）',
      control: { type: 'range', min: 1, max: 24, step: 1 }
    },
    cameraDistance: {
      name: '相机距离',
      control: { type: 'range', min: 2, max: 14, step: 0.5 }
    }
  },
  render: sceneStory(pointsCloudExample),
  parameters: sceneSource(cloudSource)
};

export const PointTexture = {
  name: '用贴图做非方块点',
  args: {
    mapType: 'circle',
    transparent: true,
    alphaTest: 0
  },
  argTypes: {
    mapType: {
      name: 'material.map',
      control: { type: 'inline-radio' },
      options: ['none', 'circle'],
      labels: {
        none: 'null（默认方块）',
        circle: '圆形 alpha 纹理'
      }
    },
    transparent: {
      name: 'material.transparent',
      control: 'boolean'
    },
    alphaTest: {
      name: 'material.alphaTest',
      control: { type: 'range', min: 0, max: 0.95, step: 0.05 }
    }
  },
  render: sceneStory(pointsTextureExample),
  parameters: sceneSource(textureSource)
};
