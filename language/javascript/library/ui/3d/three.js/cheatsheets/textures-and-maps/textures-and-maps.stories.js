import colorSpaceSource from './color-space.js?raw';
import mapSlotsSource from './material-map-slots.js?raw';
import filteringSource from './texture-filtering.js?raw';
import utilsSource from './texture-example-utils.js?raw';
import loadingSource from './texture-loading.js?raw';
import uvWrappingSource from './uv-and-wrapping.js?raw';

import { sceneStory } from '../../assets/story-canvas.js';
import { sceneSource } from '../../assets/story-source.js';
import { colorSpaceExample } from './color-space.js';
import { materialMapSlotsExample } from './material-map-slots.js';
import { textureFilteringExample } from './texture-filtering.js';
import { textureLoadingExample } from './texture-loading.js';
import { uvAndWrappingExample } from './uv-and-wrapping.js';

export default {
  id: 'textures-and-maps',
  title: '纹理与模型/纹理',
  tags: ['!dev']
};

function sourceBundle(memberSource) {
  return [utilsSource, memberSource].join('\n\n');
}

export const TextureLoading = {
  name: 'TextureLoader 加载',
  render: sceneStory(textureLoadingExample),
  parameters: sceneSource(sourceBundle(loadingSource))
};

export const UvAndWrapping = {
  name: 'UV 变换与包裹',
  args: {
    repeatX: 2,
    repeatY: 2,
    offsetX: 0,
    offsetY: 0,
    rotation: 0,
    wrapping: 'RepeatWrapping'
  },
  argTypes: {
    repeatX: {
      name: 'repeat.x',
      control: { type: 'range', min: 0.5, max: 4, step: 0.5 }
    },
    repeatY: {
      name: 'repeat.y',
      control: { type: 'range', min: 0.5, max: 4, step: 0.5 }
    },
    offsetX: {
      name: 'offset.x',
      control: { type: 'range', min: -1, max: 1, step: 0.05 }
    },
    offsetY: {
      name: 'offset.y',
      control: { type: 'range', min: -1, max: 1, step: 0.05 }
    },
    rotation: {
      name: 'rotation（度）',
      control: { type: 'range', min: -180, max: 180, step: 5 }
    },
    wrapping: {
      name: 'wrapS / wrapT',
      control: 'select',
      options: [
        'ClampToEdgeWrapping',
        'RepeatWrapping',
        'MirroredRepeatWrapping'
      ]
    }
  },
  render: sceneStory(uvAndWrappingExample),
  parameters: sceneSource(sourceBundle(uvWrappingSource))
};

export const ColorSpace = {
  name: '颜色空间对照',
  render: sceneStory(colorSpaceExample),
  parameters: sceneSource(sourceBundle(colorSpaceSource))
};

export const Filtering = {
  name: '过滤与 mipmap',
  args: {
    filter: 'mipmap',
    distance: 6,
    anisotropy: 1
  },
  argTypes: {
    filter: {
      name: '过滤预设',
      control: 'select',
      options: ['nearest', 'linear', 'mipmap']
    },
    distance: {
      name: '相机 z（缩放观察）',
      control: { type: 'range', min: 3.5, max: 12, step: 0.5 }
    },
    anisotropy: {
      name: 'anisotropy',
      control: { type: 'range', min: 1, max: 8, step: 1 }
    }
  },
  render: sceneStory(textureFilteringExample),
  parameters: sceneSource(sourceBundle(filteringSource))
};

export const MaterialMapSlots = {
  name: '材质贴图槽',
  args: {
    colorMap: true,
    roughnessMap: true,
    normalMap: true
  },
  argTypes: {
    colorMap: { name: 'map（颜色）', control: 'boolean' },
    roughnessMap: { name: 'roughnessMap（数据）', control: 'boolean' },
    normalMap: { name: 'normalMap（数据）', control: 'boolean' }
  },
  render: sceneStory(materialMapSlotsExample),
  parameters: sceneSource(sourceBundle(mapSlotsSource))
};
