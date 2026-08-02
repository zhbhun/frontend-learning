import exampleSource from './mesh-example.js?raw';

import { sceneStory } from '../../assets/story-canvas.js';
import { sceneSource } from '../../assets/story-source.js';
import { meshExample } from './mesh-example.js';

export default {
  id: 'mesh-geometry-material',
  title: '核心系统/空间与对象/Mesh',
  tags: ['!dev']
};

export const GeometryMaterial = {
  name: 'Geometry 与 Material 组合',
  args: {
    geometryType: 'box',
    materialType: 'standard',
    wireframe: false,
    drawFraction: 1
  },
  argTypes: {
    geometryType: {
      name: 'mesh.geometry',
      control: 'inline-radio',
      options: ['box', 'sphere', 'torusKnot']
    },
    materialType: {
      name: 'mesh.material',
      control: 'inline-radio',
      options: ['basic', 'standard', 'normal']
    },
    wireframe: { name: 'material.wireframe', control: 'boolean' },
    drawFraction: {
      name: 'geometry.drawRange 比例',
      control: { type: 'range', min: 0.05, max: 1, step: 0.05 }
    }
  },
  render: sceneStory(meshExample),
  parameters: sceneSource(exampleSource)
};
