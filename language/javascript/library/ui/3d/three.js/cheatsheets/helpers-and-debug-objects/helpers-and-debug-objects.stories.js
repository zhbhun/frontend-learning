import boundingBoxSource from './bounding-box.js?raw';
import cameraFrustumSource from './camera-frustum.js?raw';
import spotlightConeSource from './spotlight-cone.js?raw';
import sharedSceneSource from '../../assets/shared-scene.js?raw';

import { sceneStory } from '../../assets/story-canvas.js';
import { sceneSource } from '../../assets/story-source.js';
import { boundingBoxExample } from './bounding-box.js';
import { cameraFrustumExample } from './camera-frustum.js';
import { spotlightConeExample } from './spotlight-cone.js';

export default {
  id: 'helpers-and-debug-objects',
  title: '核心系统/空间与对象/Helper',
  tags: ['!dev']
};

function sourceBundle(memberSource) {
  return [sharedSceneSource, memberSource].join('\n\n');
}

export const BoundingBox = {
  name: 'BoxHelper 与 Box3Helper',
  args: {
    rotationY: 40,
    scale: 1.1,
    callUpdate: true
  },
  argTypes: {
    rotationY: {
      name: 'target.rotation.y（度）',
      control: { type: 'range', min: 0, max: 360, step: 5 }
    },
    scale: {
      name: 'target.scale',
      control: { type: 'range', min: 0.5, max: 1.8, step: 0.1 }
    },
    callUpdate: {
      name: '每帧调用 boxHelper.update()',
      control: 'boolean',
      description: '关闭后 BoxHelper 不再跟随 target 的变换，红色线框停留在上一次的位置。'
    }
  },
  render: sceneStory(boundingBoxExample),
  parameters: sceneSource(sourceBundle(boundingBoxSource))
};

export const CameraFrustum = {
  name: 'CameraHelper 视锥',
  args: {
    fov: 50,
    far: 7,
    callUpdate: true
  },
  argTypes: {
    fov: {
      name: 'watched.fov（度）',
      control: { type: 'range', min: 25, max: 90, step: 1 }
    },
    far: {
      name: 'watched.far',
      control: { type: 'range', min: 3, max: 14, step: 0.5 }
    },
    callUpdate: {
      name: '每帧调用 helper.update()',
      control: 'boolean',
      description: '关闭后视锥线不跟随 watched 投影变化，停留在旧投影状态。'
    }
  },
  render: sceneStory(cameraFrustumExample),
  parameters: sceneSource(sourceBundle(cameraFrustumSource))
};

export const SpotlightCone = {
  name: 'SpotLightHelper 锥体',
  args: {
    angleDeg: 30,
    penumbra: 0.3,
    callUpdate: true
  },
  argTypes: {
    angleDeg: {
      name: 'spot.angle（度）',
      control: { type: 'range', min: 8, max: 75, step: 1 }
    },
    penumbra: {
      name: 'spot.penumbra',
      control: { type: 'range', min: 0, max: 1, step: 0.05 }
    },
    callUpdate: {
      name: '每帧调用 helper.update()',
      control: 'boolean',
      description: '关闭后锥体线不跟随 spot.angle / penumbra 变化，停留在旧锥角。'
    }
  },
  render: sceneStory(spotlightConeExample),
  parameters: sceneSource(sourceBundle(spotlightConeSource))
};
