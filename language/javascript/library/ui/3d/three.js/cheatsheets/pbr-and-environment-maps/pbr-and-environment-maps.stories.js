import metalnessEnvironmentSource from './metalness-environment.js?raw';
import toneMappingSource from './tone-mapping.js?raw';
import physicalMaterialSource from './physical-material.js?raw';
import sharedSceneSource from '../../assets/shared-scene.js?raw';

import { sceneStory } from '../../assets/story-canvas.js';
import { sceneSource } from '../../assets/story-source.js';
import { metalnessEnvironmentExample } from './metalness-environment.js';
import { toneMappingExample } from './tone-mapping.js';
import { physicalMaterialExample } from './physical-material.js';

export default {
  id: 'pbr-and-environment-maps',
  title: '质量与交付/视觉质量/PBR',
  tags: ['!dev']
};

function sourceBundle(memberSource) {
  return [sharedSceneSource, memberSource].join('\n\n');
}

export const MetalnessEnvironment = {
  name: '金属度与环境反射',
  args: {
    metalness: 1.0,
    roughness: 0.25,
    envOn: true
  },
  argTypes: {
    metalness: {
      name: 'metalness',
      control: { type: 'range', min: 0, max: 1, step: 0.05 },
      description: '0 = 电介质（塑料、木材），1 = 纯金属；金属面的颜色几乎全靠环境反射。'
    },
    roughness: {
      name: 'roughness',
      control: { type: 'range', min: 0, max: 1, step: 0.05 },
      description: '0 = 镜面锐反射，1 = 完全漫反射；低粗糙度时高光更锐。'
    },
    envOn: {
      name: 'scene.environment',
      control: 'boolean',
      description:
        '是否提供环境反射。关掉后 metalness 接近 1 的金属面没有内容可反射，几乎只剩直接光的镜面高光。'
    }
  },
  render: sceneStory(metalnessEnvironmentExample),
  parameters: sceneSource(sourceBundle(metalnessEnvironmentSource))
};

export const ToneMapping = {
  name: '色调映射',
  args: {
    mode: 'aces',
    exposure: 1.0
  },
  argTypes: {
    mode: {
      name: 'renderer.toneMapping',
      control: 'inline-radio',
      options: ['none', 'aces', 'agx', 'neutral'],
      description:
        '把 HDR（线性 > 1）压回显示器的曲线。none 硬切白；aces 电影感；agx 现代中性；neutral 忠实。'
    },
    exposure: {
      name: 'toneMappingExposure',
      control: { type: 'range', min: 0.2, max: 2, step: 0.05 },
      description: '整体亮度乘数；在 tone mapping 之前作用。'
    }
  },
  render: sceneStory(toneMappingExample),
  parameters: sceneSource(sourceBundle(toneMappingSource))
};

export const PhysicalMaterial = {
  name: 'MeshPhysicalMaterial 进阶',
  args: {
    transmission: 0.9,
    clearcoat: 0.0
  },
  argTypes: {
    transmission: {
      name: 'transmission',
      control: { type: 'range', min: 0, max: 1, step: 0.05 },
      description: '透射强度，做玻璃；> 0 时背后物体经折射通道采样，建议保持 transparent=true。'
    },
    clearcoat: {
      name: 'clearcoat',
      control: { type: 'range', min: 0, max: 1, step: 0.05 },
      description: '清漆层强度，做车漆；在金属/粗糙表面之上再叠一层高光。'
    }
  },
  render: sceneStory(physicalMaterialExample),
  parameters: sceneSource(sourceBundle(physicalMaterialSource))
};
