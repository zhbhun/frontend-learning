import exampleSource from './group-example.js?raw';

import { sceneStory } from '../../assets/story-canvas.js';
import { sceneSource } from '../../assets/story-source.js';
import { groupExample } from './group-example.js';

export default {
  id: 'group-and-local-space',
  title: '核心系统/空间与对象/Group',
  tags: ['!dev']
};

export const TransformModes = {
  name: '整体变换与各自变换',
  args: {
    transformMode: 'group',
    speed: 0.6
  },
  argTypes: {
    transformMode: {
      name: '变换目标',
      control: 'inline-radio',
      options: ['group', 'individual', 'both']
    },
    speed: {
      name: '角速度（弧度/秒）',
      control: { type: 'range', min: 0, max: 1.5, step: 0.05 }
    }
  },
  render: sceneStory(groupExample),
  parameters: sceneSource(exampleSource)
};
