import litMaterialSource from './lit-material.js?raw';
import shadowSwitchesSource from './shadow-switches.js?raw';
import directionalShadowCameraSource from './directional-shadow-camera.js?raw';
import shadowMapQualitySource from './shadow-map-quality.js?raw';

import { sceneStory } from '../../assets/story-canvas.js';
import { sceneSource } from '../../assets/story-source.js';
import { litMaterialExample } from './lit-material.js';
import { shadowSwitchesExample } from './shadow-switches.js';
import { directionalShadowCameraExample } from './directional-shadow-camera.js';
import { shadowMapQualityExample } from './shadow-map-quality.js';

export default {
  id: 'lighting-and-shadows',
  title: '核心系统/形状与表面/明暗与阴影',
  tags: ['!dev']
};

export const LitMaterial = {
  name: '受光材质与明暗',
  args: {
    materialKind: 'standard',
    intensity: 3.0
  },
  argTypes: {
    materialKind: {
      name: '材质',
      control: 'inline-radio',
      options: ['standard', 'basic'],
      description:
        'MeshStandardMaterial 响应 Light；MeshBasicMaterial 颜色恒定，调 intensity 也不出明暗。'
    },
    intensity: {
      name: 'DirectionalLight.intensity',
      control: { type: 'range', min: 0, max: 8, step: 0.1 }
    }
  },
  render: sceneStory(litMaterialExample),
  parameters: sceneSource(litMaterialSource)
};

export const ShadowSwitches = {
  name: '阴影四开关',
  args: {
    shadowMapEnabled: true,
    lightCastShadow: true,
    castShadow: true,
    receiveShadow: true
  },
  argTypes: {
    shadowMapEnabled: {
      name: 'renderer.shadowMap.enabled',
      control: 'boolean',
      description: '全局总闸。关掉后所有 light.castShadow 都无效。'
    },
    lightCastShadow: {
      name: 'light.castShadow',
      control: 'boolean',
      description: '该光源是否生成 shadow map。Ambient / Hemisphere / RectArea 始终不投影。'
    },
    castShadow: {
      name: 'mesh.castShadow',
      control: 'boolean',
      description: '物体是否写入 shadow map（投射阴影）。'
    },
    receiveShadow: {
      name: 'mesh.receiveShadow',
      control: 'boolean',
      description: '物体表面是否读取 shadow map（接收阴影）。'
    }
  },
  render: sceneStory(shadowSwitchesExample),
  parameters: sceneSource(shadowSwitchesSource)
};

export const DirectionalShadowCamera = {
  name: '平行光阴影相机',
  args: {
    halfExtent: 4,
    near: 1,
    far: 30
  },
  argTypes: {
    halfExtent: {
      name: 'shadow.camera 半宽',
      control: { type: 'range', min: 1.5, max: 14, step: 0.5 },
      description:
        '写入 OrthographicCamera 的 left/right/top/bottom。过小裁影，过大同 mapSize 下更糊。'
    },
    near: {
      name: 'shadow.camera.near',
      control: { type: 'range', min: 0.5, max: 10, step: 0.5 }
    },
    far: {
      name: 'shadow.camera.far',
      control: { type: 'range', min: 10, max: 60, step: 1 }
    }
  },
  render: sceneStory(directionalShadowCameraExample),
  parameters: sceneSource(directionalShadowCameraSource)
};

export const ShadowMapQuality = {
  name: '阴影贴图质量',
  args: {
    mapSize: 512,
    type: 'pcf',
    bias: -0.0002,
    normalBias: 0
  },
  argTypes: {
    mapSize: {
      name: 'shadow.mapSize',
      control: 'inline-radio',
      options: [256, 512, 1024, 2048],
      description: '须为 2 的幂。越大越清晰，也越占显存与填充成本。'
    },
    type: {
      name: 'shadowMap.type',
      control: 'inline-radio',
      options: ['basic', 'pcf', 'vsm'],
      description:
        'Basic 最快最硬；PCF 默认；VSM 更软，且接收物也会投影。PCFSoftShadowMap 已弃用。'
    },
    bias: {
      name: 'shadow.bias',
      control: { type: 'range', min: -0.005, max: 0.002, step: 0.0001 },
      description: '深度偏移。过负易 peter-panning；接近 0 易 acne。'
    },
    normalBias: {
      name: 'shadow.normalBias',
      control: { type: 'range', min: 0, max: 0.2, step: 0.005 },
      description: '沿法线偏移采样点，减轻大场景浅角 acne；过大阴影会变形。'
    }
  },
  render: sceneStory(shadowMapQualityExample),
  parameters: sceneSource(shadowMapQualitySource)
};
