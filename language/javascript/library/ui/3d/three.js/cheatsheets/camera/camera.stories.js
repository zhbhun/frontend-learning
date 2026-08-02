import cameraModelSource from './camera-model.js?raw';
import cameraDirectionSource from './camera-direction.js?raw';
import perspectiveProjectionSource from './perspective-projection.js?raw';
import orthographicProjectionSource from './orthographic-projection.js?raw';

import { sceneStory } from '../../assets/story-canvas.js';
import { sceneSource } from '../../assets/story-source.js';
import { cameraDirectionExample } from './camera-direction.js';
import { perspectiveProjectionExample } from './perspective-projection.js';
import { orthographicProjectionExample } from './orthographic-projection.js';

export default {
  id: 'camera',
  title: '核心系统/空间与对象/相机',
  tags: ['!dev']
};

// 主题相关核心：成员范例 + 共享相机模型。舞台 / shared-scene 是支撑外壳，不进 Show code。
function topicSource(memberSource) {
  return [cameraModelSource, memberSource].join('\n\n');
}

export const CameraDirection = {
  name: 'Camera 位置与朝向',
  args: {
    cameraX: 6,
    cameraY: 4,
    cameraZ: 8,
    targetX: 0,
    targetY: 0.7,
    targetZ: 0
  },
  argTypes: {
    cameraX: {
      name: 'camera.position.x',
      control: { type: 'range', min: -8, max: 8, step: 0.5 }
    },
    cameraY: {
      name: 'camera.position.y',
      control: { type: 'range', min: 1, max: 9, step: 0.5 }
    },
    cameraZ: {
      name: 'camera.position.z',
      control: { type: 'range', min: -8, max: 12, step: 0.5 }
    },
    targetX: {
      name: 'lookAt target.x',
      control: { type: 'range', min: -4, max: 4, step: 0.5 }
    },
    targetY: {
      name: 'lookAt target.y',
      control: { type: 'range', min: 0, max: 4, step: 0.25 }
    },
    targetZ: {
      name: 'lookAt target.z',
      control: { type: 'range', min: -4, max: 4, step: 0.5 }
    }
  },
  render: sceneStory(cameraDirectionExample),
  parameters: sceneSource(topicSource(cameraDirectionSource))
};

export const PerspectiveProjection = {
  name: 'PerspectiveCamera 投影',
  args: {
    fov: 50,
    near: 0.1,
    far: 20,
    zoom: 1,
    distance: 8,
    updateProjectionMatrix: true
  },
  argTypes: {
    fov: {
      name: 'fov（垂直角度）',
      control: { type: 'range', min: 20, max: 110, step: 1 }
    },
    near: {
      name: 'near',
      control: { type: 'range', min: 0.1, max: 8, step: 0.1 }
    },
    far: {
      name: 'far',
      control: { type: 'range', min: 4, max: 24, step: 0.5 }
    },
    zoom: {
      name: 'zoom',
      control: { type: 'range', min: 0.5, max: 2.5, step: 0.1 }
    },
    distance: {
      name: '相机到目标距离',
      control: { type: 'range', min: 5, max: 14, step: 0.5 }
    },
    updateProjectionMatrix: {
      name: '调用 updateProjectionMatrix()',
      control: 'boolean'
    }
  },
  render: sceneStory(perspectiveProjectionExample),
  parameters: sceneSource(topicSource(perspectiveProjectionSource))
};

export const OrthographicProjection = {
  name: 'OrthographicCamera 投影',
  args: {
    viewHeight: 6,
    near: 0,
    far: 20,
    zoom: 1,
    distance: 8,
    updateProjectionMatrix: true
  },
  argTypes: {
    viewHeight: {
      name: 'top - bottom（未计 zoom）',
      control: { type: 'range', min: 3, max: 12, step: 0.5 }
    },
    near: {
      name: 'near',
      control: { type: 'range', min: 0, max: 8, step: 0.5 }
    },
    far: {
      name: 'far',
      control: { type: 'range', min: 4, max: 24, step: 0.5 }
    },
    zoom: {
      name: 'zoom',
      control: { type: 'range', min: 0.5, max: 2.5, step: 0.1 }
    },
    distance: {
      name: '相机到目标距离',
      control: { type: 'range', min: 5, max: 14, step: 0.5 }
    },
    updateProjectionMatrix: {
      name: '调用 updateProjectionMatrix()',
      control: 'boolean'
    }
  },
  render: sceneStory(orthographicProjectionExample),
  parameters: sceneSource(topicSource(orthographicProjectionSource))
};
