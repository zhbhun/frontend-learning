import firstSceneSource from './first-scene.js?raw';

import { sceneStory } from '../../assets/story-canvas.js';
import { sceneSource } from '../../assets/story-source.js';
import { firstSceneExample } from './first-scene.js';

export default {
  id: 'first-scene',
  title: '快速启动/第一幅画面',
  tags: ['!dev']
};

export const RotatingCube = {
  name: '第一幅画面',
  args: {
    running: true,
    angularSpeed: 0.8
  },
  argTypes: {
    running: {
      name: '是否更新旋转',
      control: 'boolean',
      description: '关闭后停止累加 cube.rotation，但保留最后一帧。'
    },
    angularSpeed: {
      name: 'Y 轴角速度（弧度/秒）',
      control: { type: 'range', min: 0, max: 2.4, step: 0.1 },
      description: '每秒累加到 cube.rotation.y 的弧度数。'
    }
  },
  render: sceneStory(firstSceneExample),
  parameters: sceneSource(firstSceneSource)
};
