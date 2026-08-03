import mountSource from './mount-and-transform.js?raw';
import backgroundSource from './background.js?raw';
import environmentSource from './environment.js?raw';
import fogSource from './fog.js?raw';
import overrideSource from './override-material.js?raw';

import { sceneStory } from '../../assets/story-canvas.js';
import { sceneSource } from '../../assets/story-source.js';
import { mountAndTransformExample } from './mount-and-transform.js';
import { backgroundExample } from './background.js';
import { environmentExample } from './environment.js';
import { fogExample } from './fog.js';
import { overrideMaterialExample } from './override-material.js';

export default {
  id: 'scene-render-root',
  title: '核心系统/空间与对象/Scene',
  tags: ['!dev']
};

export const MountAndTransform = {
  name: '挂载与变换',
  args: {
    transformTarget: '内容 Group',
    offsetX: 0,
    rotationY: 0,
    showMarker: false
  },
  argTypes: {
    transformTarget: {
      name: '变换写到',
      control: 'inline-radio',
      options: ['内容 Group', 'scene']
    },
    offsetX: {
      name: 'position.x',
      control: { type: 'range', min: -3, max: 3, step: 0.1 }
    },
    rotationY: {
      name: 'rotation.y（度）',
      control: { type: 'range', min: -180, max: 180, step: 5 }
    },
    showMarker: {
      name: 'scene.add(marker)',
      control: 'boolean'
    }
  },
  render: sceneStory(mountAndTransformExample),
  parameters: sceneSource(mountSource)
};

export const Background = {
  name: '背景',
  args: {
    mode: '纯色',
    background: '#dbe8e1',
    backgroundIntensity: 1,
    backgroundBlurriness: 0,
    backgroundRotationY: 0
  },
  argTypes: {
    mode: {
      name: 'scene.background',
      control: 'inline-radio',
      options: ['纯色', '环境贴图']
    },
    background: {
      name: '纯色',
      control: 'color',
      if: { arg: 'mode', eq: '纯色' }
    },
    backgroundIntensity: {
      name: 'backgroundIntensity',
      control: { type: 'range', min: 0, max: 2, step: 0.05 },
      if: { arg: 'mode', eq: '环境贴图' }
    },
    backgroundBlurriness: {
      name: 'backgroundBlurriness',
      control: { type: 'range', min: 0, max: 1, step: 0.05 },
      if: { arg: 'mode', eq: '环境贴图' }
    },
    backgroundRotationY: {
      name: 'backgroundRotation.y（度）',
      control: { type: 'range', min: -180, max: 180, step: 5 },
      if: { arg: 'mode', eq: '环境贴图' }
    }
  },
  render: sceneStory(backgroundExample),
  parameters: sceneSource(backgroundSource)
};

export const Environment = {
  name: '环境',
  args: {
    envOn: true,
    environmentIntensity: 1,
    environmentRotationY: 0
  },
  argTypes: {
    envOn: {
      name: 'scene.environment',
      control: 'boolean'
    },
    environmentIntensity: {
      name: 'environmentIntensity',
      control: { type: 'range', min: 0, max: 2, step: 0.05 }
    },
    environmentRotationY: {
      name: 'environmentRotation.y（度）',
      control: { type: 'range', min: -180, max: 180, step: 5 }
    }
  },
  render: sceneStory(environmentExample),
  parameters: sceneSource(environmentSource)
};

export const Fog = {
  name: '雾',
  args: {
    fogType: 'linear',
    fogColor: '#dbe8e1',
    background: '#9bb0a6',
    matchBackground: true,
    fogNear: 6,
    fogFar: 22,
    fogDensity: 0.055
  },
  argTypes: {
    fogType: {
      name: 'scene.fog',
      control: 'inline-radio',
      options: ['none', 'linear', 'exp2']
    },
    fogColor: {
      name: 'fog.color',
      control: 'color',
      if: { arg: 'fogType', neq: 'none' }
    },
    matchBackground: {
      name: '背景跟随雾色',
      control: 'boolean',
      if: { arg: 'fogType', neq: 'none' }
    },
    background: {
      name: 'scene.background',
      control: 'color',
      if: { arg: 'matchBackground', eq: false }
    },
    fogNear: {
      name: 'Fog.near',
      control: { type: 'range', min: 1, max: 15, step: 0.5 },
      if: { arg: 'fogType', eq: 'linear' }
    },
    fogFar: {
      name: 'Fog.far',
      control: { type: 'range', min: 10, max: 40, step: 1 },
      if: { arg: 'fogType', eq: 'linear' }
    },
    fogDensity: {
      name: 'FogExp2.density',
      control: { type: 'range', min: 0.005, max: 0.15, step: 0.005 },
      if: { arg: 'fogType', eq: 'exp2' }
    }
  },
  render: sceneStory(fogExample),
  parameters: sceneSource(fogSource)
};

export const OverrideMaterial = {
  name: '材质覆盖',
  args: {
    overrideMaterial: false
  },
  argTypes: {
    overrideMaterial: {
      name: 'scene.overrideMaterial',
      control: 'boolean'
    }
  },
  render: sceneStory(overrideMaterialExample),
  parameters: sceneSource(overrideSource)
};
