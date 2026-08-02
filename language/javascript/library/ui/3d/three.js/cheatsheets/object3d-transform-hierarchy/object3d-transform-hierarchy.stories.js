import exampleSource from './object3d-example.js?raw';

import { sceneStory } from '../../assets/story-canvas.js';
import { sceneSource } from '../../assets/story-source.js';
import { object3DExample } from './object3d-example.js';

export default {
  id: 'object3d-transform-hierarchy',
  title: '核心系统/空间与对象/Object3D',
  tags: ['!dev']
};

export const TransformHierarchy = {
  name: '局部变换与世界矩阵',
  args: {
    parentRotationY: 35,
    parentScale: 1,
    childLocalX: 2.6,
    matrixAutoUpdate: true,
    updateMatrix: true
  },
  argTypes: {
    parentRotationY: {
      name: 'parent.rotation.y（度）',
      control: { type: 'range', min: -180, max: 180, step: 5 }
    },
    parentScale: {
      name: 'parent.scale',
      control: { type: 'range', min: 0.5, max: 2, step: 0.1 }
    },
    childLocalX: {
      name: 'child.position.x',
      control: { type: 'range', min: -4, max: 4, step: 0.2 }
    },
    matrixAutoUpdate: {
      name: 'matrixAutoUpdate',
      control: 'boolean'
    },
    updateMatrix: {
      name: '手动调用 updateMatrix()',
      control: 'boolean',
      if: { arg: 'matrixAutoUpdate', eq: false }
    }
  },
  render: sceneStory(object3DExample),
  parameters: sceneSource(exampleSource)
};
