import materialFamilySource from './material-family.js?raw';
import meshPhongSource from './mesh-phong.js?raw';
import meshStandardSource from './mesh-standard.js?raw';
import transparencySource from './transparency.js?raw';
import sharedSceneSource from '../../assets/shared-scene.js?raw';

import { sceneStory } from '../../assets/story-canvas.js';
import { sceneSource } from '../../assets/story-source.js';
import { materialFamilyExample } from './material-family.js';
import { meshPhongExample } from './mesh-phong.js';
import { meshStandardExample } from './mesh-standard.js';
import { transparencyExample } from './transparency.js';

export default {
  id: 'materials-and-render-states',
  title: '核心系统/形状与表面/材质',
  tags: ['!dev']
};

function sourceBundle(memberSource) {
  return [sharedSceneSource, memberSource].join('\n\n');
}

export const MaterialFamily = {
  name: '材质家族对照',
  args: {
    materialType: 'standard',
    wireframe: false
  },
  argTypes: {
    materialType: {
      name: 'mesh.material',
      control: 'inline-radio',
      options: ['basic', 'lambert', 'phong', 'standard', 'normal'],
      description:
        '同一几何体 + 同一光源下切材质：basic 不受光，lambert 漫反射无高光，phong 带高光，standard 是 PBR，normal 按法线着色。'
    },
    wireframe: { name: 'material.wireframe', control: 'boolean' }
  },
  render: sceneStory(materialFamilyExample),
  parameters: sceneSource(sourceBundle(materialFamilySource))
};

export const MeshPhong = {
  name: 'MeshPhongMaterial 高光',
  args: {
    shininess: 70,
    specularIntensity: 1
  },
  argTypes: {
    shininess: {
      name: 'shininess',
      control: { type: 'range', min: 0, max: 200, step: 1 },
      description: '高光锐度；值越大高光越集中越亮，值越小越分散。'
    },
    specularIntensity: {
      name: 'specular 强度',
      control: { type: 'range', min: 0, max: 1, step: 0.05 },
      description: '乘到 specular 颜色上的系数；0 时无高光（接近 Lambert）。'
    }
  },
  render: sceneStory(meshPhongExample),
  parameters: sceneSource(sourceBundle(meshPhongSource))
};

export const MeshStandard = {
  name: 'MeshStandardMaterial PBR',
  args: {
    metalness: 0.6,
    roughness: 0.4
  },
  argTypes: {
    metalness: {
      name: 'metalness',
      control: { type: 'range', min: 0, max: 1, step: 0.05 },
      description: '0 = 电介质（塑料/木材），1 = 纯金属；金属面需要环境反射才不黑。'
    },
    roughness: {
      name: 'roughness',
      control: { type: 'range', min: 0, max: 1, step: 0.05 },
      description: '0 = 镜面锐高光，1 = 完全漫反射。'
    }
  },
  render: sceneStory(meshStandardExample),
  parameters: sceneSource(sourceBundle(meshStandardSource))
};

export const Transparency = {
  name: '透明与深度写入',
  args: {
    opacity: 0.6,
    alphaTest: 0,
    depthWrite: true
  },
  argTypes: {
    opacity: {
      name: 'opacity',
      control: { type: 'range', min: 0.05, max: 1, step: 0.05 },
      description: '基础透明度；< 1 时需要 transparent=true 才能正确合成。'
    },
    alphaTest: {
      name: 'alphaTest',
      control: { type: 'range', min: 0, max: 1, step: 0.05 },
      description: '低于阈值的片元直接丢弃，不进透明排序，常配合带 alpha 的贴图做硬边缘。'
    },
    depthWrite: {
      name: 'depthWrite',
      control: 'boolean',
      description:
        'true 时近处透明面会"挖掉"远处透明面，常见黑色/错位接缝；多个透明面相互交叠时通常设 false。'
    }
  },
  render: sceneStory(transparencyExample),
  parameters: sceneSource(sourceBundle(transparencySource))
};
