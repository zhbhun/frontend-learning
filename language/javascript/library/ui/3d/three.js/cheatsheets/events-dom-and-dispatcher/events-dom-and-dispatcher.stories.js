import domPointerSource from './dom-pointer.js?raw';
import dispatcherEventsSource from './dispatcher-events.js?raw';

import { sceneStory } from '../../assets/story-canvas.js';
import { sceneSource } from '../../assets/story-source.js';
import { domPointerExample } from './dom-pointer.js';
import { dispatcherEventsExample } from './dispatcher-events.js';

export default {
  id: 'events-dom-and-dispatcher',
  title: '核心系统/交互与事件/事件',
  tags: ['!dev']
};

export const DomPointer = {
  name: '画布指针坐标',
  args: {
    listening: true
  },
  argTypes: {
    listening: {
      name: '监听启用',
      control: 'boolean',
      description: '关闭后拆除 pointer 监听；再移动指针时读数不再更新。'
    }
  },
  render: sceneStory(domPointerExample),
  parameters: sceneSource(domPointerSource)
};

export const DispatcherEvents = {
  name: 'Object3D 与自定义事件',
  args: {
    childMounted: true
  },
  argTypes: {
    childMounted: {
      name: '挂载立方体',
      control: 'boolean',
      description: '切换 parent.add / remove，观察 added / removed / child* 事件。'
    }
  },
  render: sceneStory(dispatcherEventsExample),
  parameters: sceneSource(dispatcherEventsSource)
};
