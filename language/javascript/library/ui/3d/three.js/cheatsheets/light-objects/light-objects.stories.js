import directionalLightSource from './directional-light.js?raw';
import pointLightSource from './point-light.js?raw';
import spotLightSource from './spot-light.js?raw';
import rectAreaLightSource from './rect-area-light.js?raw';
import sharedSceneSource from '../../assets/shared-scene.js?raw';

import { sceneStory } from '../../assets/story-canvas.js';
import { sceneSource } from '../../assets/story-source.js';
import { directionalLightExample } from './directional-light.js';
import { pointLightExample } from './point-light.js';
import { spotLightExample } from './spot-light.js';
import { rectAreaLightExample } from './rect-area-light.js';

export default {
  id: 'light-objects',
  title: '核心系统/空间与对象/Light',
  tags: ['!dev']
};

function sourceBundle(memberSource) {
  return [sharedSceneSource, memberSource].join('\n\n');
}

export const DirectionalLight = {
  name: 'DirectionalLight 与 target',
  args: {
    targetX: 0,
    targetZ: 0,
    targetInScene: true
  },
  argTypes: {
    targetX: {
      name: 'light.target.position.x',
      control: { type: 'range', min: -3, max: 3, step: 0.2 }
    },
    targetZ: {
      name: 'light.target.position.z',
      control: { type: 'range', min: -3, max: 3, step: 0.2 }
    },
    targetInScene: {
      name: 'target 加入场景树',
      control: 'boolean',
      description:
        '关闭后 renderer 不再更新 target 的世界矩阵，光照方向和读数里的世界位置都停留在上一次的值。'
    }
  },
  render: sceneStory(directionalLightExample),
  parameters: sceneSource(sourceBundle(directionalLightSource))
};

export const PointLight = {
  name: 'PointLight 距离衰减',
  args: {
    intensity: 18,
    distance: 0,
    decay: 2
  },
  argTypes: {
    intensity: {
      name: 'intensity（cd）',
      control: { type: 'range', min: 0, max: 60, step: 1 }
    },
    distance: {
      name: 'distance',
      control: { type: 'range', min: 0, max: 15, step: 0.5 },
      description: '0 表示不设上限，按 decay 的反比规律衰减到无穷远。'
    },
    decay: {
      name: 'decay',
      control: { type: 'range', min: 0, max: 3, step: 0.1 },
      description: '物理默认 2（反平方）；调成 0 时全场不衰减。'
    }
  },
  render: sceneStory(pointLightExample),
  parameters: sceneSource(sourceBundle(pointLightSource))
};

export const SpotLight = {
  name: 'SpotLight 锥体',
  args: {
    angleDeg: 30,
    penumbra: 0.3,
    distance: 12
  },
  argTypes: {
    angleDeg: {
      name: 'spot.angle（度）',
      control: { type: 'range', min: 8, max: 80, step: 1 }
    },
    penumbra: {
      name: 'spot.penumbra',
      control: { type: 'range', min: 0, max: 1, step: 0.05 }
    },
    distance: {
      name: 'spot.distance',
      control: { type: 'range', min: 0, max: 20, step: 1 },
      description: '0 表示不设上限。'
    }
  },
  render: sceneStory(spotLightExample),
  parameters: sceneSource(sourceBundle(spotLightSource))
};

export const RectAreaLight = {
  name: 'RectAreaLight 面光源',
  args: {
    width: 3,
    height: 3,
    intensity: 6
  },
  argTypes: {
    width: {
      name: 'rect.width',
      control: { type: 'range', min: 0.5, max: 8, step: 0.5 }
    },
    height: {
      name: 'rect.height',
      control: { type: 'range', min: 0.5, max: 8, step: 0.5 }
    },
    intensity: {
      name: 'rect.intensity',
      control: { type: 'range', min: 0, max: 20, step: 0.5 }
    }
  },
  render: sceneStory(rectAreaLightExample),
  parameters: sceneSource(sourceBundle(rectAreaLightSource))
};
