import shadowTogglesSource from './shadow-toggles.js?raw';
import shadowQualitySource from './shadow-quality.js?raw';
import sharedSceneSource from '../../assets/shared-scene.js?raw';

import { sceneStory } from '../../assets/story-canvas.js';
import { sceneSource } from '../../assets/story-source.js';
import { shadowTogglesExample } from './shadow-toggles.js';
import { shadowQualityExample } from './shadow-quality.js';

export default {
  id: 'lighting-and-shadows',
  title: '核心系统/形状与表面/明暗与阴影',
  tags: ['!dev']
};

function sourceBundle(memberSource) {
  return [sharedSceneSource, memberSource].join('\n\n');
}

export const ShadowToggles = {
  name: '阴影开关链路',
  args: {
    rendererEnabled: true,
    lightCast: true,
    meshCast: true,
    groundReceive: true
  },
  argTypes: {
    rendererEnabled: {
      name: 'renderer.shadowMap.enabled',
      control: 'boolean',
      description: '总开关。关掉后所有光源的 castShadow 都失效，画面里没有任何阴影。'
    },
    lightCast: {
      name: 'light.castShadow',
      control: 'boolean',
      description: '这盏光是否参与阴影计算。'
    },
    meshCast: {
      name: 'mesh.castShadow（投射物）',
      control: 'boolean',
      description: '雕塑是否作为投射物。'
    },
    groundReceive: {
      name: 'mesh.receiveShadow（接收物）',
      control: 'boolean',
      description: '地面是否把阴影画在自己身上。'
    }
  },
  render: sceneStory(shadowTogglesExample),
  parameters: sceneSource(sourceBundle(shadowTogglesSource))
};

export const ShadowQuality = {
  name: 'mapSize 与阴影相机',
  args: {
    mapSize: 1024,
    range: 4
  },
  argTypes: {
    mapSize: {
      name: 'shadow.mapSize',
      options: [512, 1024, 2048],
      control: { type: 'radio' },
      description: 'shadow map 纹理分辨率（方阵）。常用 1024 或 2048。'
    },
    range: {
      name: 'shadow.camera 半范围',
      control: { type: 'range', min: 2, max: 12, step: 1 },
      description:
        'DirectionalLightShadow 用 OrthographicCamera，left/right/top/bottom = ±range。范围越大，同一张纹理覆盖的世界区域越大，阴影越糊。'
    }
  },
  render: sceneStory(shadowQualityExample),
  parameters: sceneSource(sourceBundle(shadowQualitySource))
};
