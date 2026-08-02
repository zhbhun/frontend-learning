import exampleSource from './raycaster-hover-click.js?raw';

import { sceneStory } from '../../assets/story-canvas.js';
import { sceneSource } from '../../assets/story-source.js';
import { raycasterExample } from './raycaster-hover-click.js';

export default {
  id: 'raycaster-pointer-interaction',
  title: '动画与交互/交互与调试/拾取',
  tags: ['!dev']
};

export const HoverClickSelect = {
  name: 'hover 高亮与 click 选中',
  args: {
    intersectRecursive: true
  },
  argTypes: {
    intersectRecursive: {
      name: 'intersectObjects 的 recursive',
      control: 'boolean'
    }
  },
  render: sceneStory(raycasterExample),
  parameters: sceneSource(exampleSource)
};
