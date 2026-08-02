import clockVsFrameSource from './clock-vs-frame.js?raw';

import { sceneStory } from '../../assets/story-canvas.js';
import { sceneSource } from '../../assets/story-source.js';
import { clockVsFrameExample } from './clock-vs-frame.js';

export default {
  id: 'clock-and-animation-loop',
  title: '动画与交互/时间与动画/时间',
  tags: ['!dev']
};

export const ClockVsFrame = {
  name: '帧推进与时间推进对比',
  args: {
    running: true,
    simulatedFps: 60
  },
  argTypes: {
    running: {
      name: '是否运行',
      control: 'boolean',
      description: '关闭后停止渲染循环并保留最后一帧。'
    },
    simulatedFps: {
      name: '模拟帧率',
      control: { type: 'range', min: 10, max: 120, step: 10 },
      description: '节流渲染回调，模拟不同设备刷新率。降低后观察两种推进方式的角速度差异。'
    }
  },
  render: sceneStory(clockVsFrameExample),
  parameters: sceneSource(clockVsFrameSource)
};
