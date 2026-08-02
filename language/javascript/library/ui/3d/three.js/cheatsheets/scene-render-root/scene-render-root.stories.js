import exampleSource from './scene-example.js?raw';

import { sceneStory } from '../../assets/story-canvas.js';
import { sceneSource } from '../../assets/story-source.js';
import { sceneExample } from './scene-example.js';

export default {
  id: 'scene-render-root',
  title: '核心系统/空间与对象/Scene',
  tags: ['!dev']
};

export const RenderRoot = {
  name: '背景、雾与材质覆盖',
  args: {
    background: '#dbe8e1',
    fogType: 'linear',
    fogNear: 6,
    fogFar: 22,
    fogDensity: 0.055,
    overrideMaterial: false
  },
  argTypes: {
    background: { name: 'scene.background', control: 'color' },
    fogType: {
      name: 'scene.fog',
      control: 'inline-radio',
      options: ['none', 'linear', 'exp2']
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
    },
    overrideMaterial: {
      name: 'scene.overrideMaterial',
      control: 'boolean'
    }
  },
  render: sceneStory(sceneExample),
  parameters: sceneSource(exampleSource)
};
