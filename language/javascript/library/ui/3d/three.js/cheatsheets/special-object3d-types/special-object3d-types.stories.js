import exampleSource from './cube-camera-example.js?raw';

import { sceneStory } from '../../assets/story-canvas.js';
import { sceneSource } from '../../assets/story-source.js';
import { cubeCameraExample } from './cube-camera-example.js';

export default {
  id: 'special-object3d-types',
  title: '核心系统/空间与对象/特殊对象',
  tags: ['!dev']
};

export const CubeCameraReflection = {
  name: 'CubeCamera 实时反射',
  args: {
    updateCubeCamera: true,
    metalness: 1.0,
    orbitSpeed: 0.4
  },
  argTypes: {
    updateCubeCamera: {
      name: '每帧调用 CubeCamera.update',
      control: 'boolean'
    },
    metalness: {
      name: '反射体金属度',
      control: { type: 'range', min: 0, max: 1, step: 0.05 }
    },
    orbitSpeed: {
      name: '环绕物体公转速度',
      control: { type: 'range', min: 0, max: 1, step: 0.05 }
    }
  },
  render: sceneStory(cubeCameraExample),
  parameters: sceneSource(exampleSource)
};
