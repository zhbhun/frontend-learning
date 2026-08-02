import domOverlaySource from './dom-overlay.js?raw';

import { sceneStory } from '../../assets/story-canvas.js';
import { sceneSource } from '../../assets/story-source.js';
import { domOverlayExample } from './dom-overlay.js';

export default {
  id: 'page-integration-and-deploy',
  title: '质量与交付/交付质量/页面',
  tags: ['!dev']
};

export const DomOverlay = {
  name: 'DOM 叠层与事件传递',
  args: {
    overlayPointerEvents: 'auto'
  },
  argTypes: {
    overlayPointerEvents: {
      name: '叠层 pointer-events',
      control: 'inline-radio',
      options: ['auto', 'none'],
      description:
        'auto 时叠层拦截事件、canvas 收不到 pointerdown，按钮可点；none 时事件穿透到 canvas，OrbitControls 响应拖动，按钮点不到。'
    }
  },
  render: sceneStory(domOverlayExample),
  parameters: sceneSource(domOverlaySource)
};
