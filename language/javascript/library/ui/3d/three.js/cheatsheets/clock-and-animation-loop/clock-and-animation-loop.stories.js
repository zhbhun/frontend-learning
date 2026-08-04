import animationLoopSource from './animation-loop.js?raw';
import clockVsFrameSource from './clock-vs-frame.js?raw';
import onDemandRenderSource from './on-demand-render.js?raw';

import { sceneStory } from '../../assets/story-canvas.js';
import { sceneSource } from '../../assets/story-source.js';
import { animationLoopExample } from './animation-loop.js';
import { clockVsFrameExample } from './clock-vs-frame.js';
import { onDemandRenderExample } from './on-demand-render.js';

export default {
  id: 'clock-and-animation-loop',
  title: '核心系统/时间与动画/循环与时间',
  tags: ['!dev']
};

export const DeltaAnimation = {
  name: 'delta 与暂停恢复',
  args: {
    running: true,
    angularSpeed: 1,
    resetOnResume: true
  },
  argTypes: {
    running: {
      name: '是否运行',
      control: 'boolean',
      description: '关闭后停止 setAnimationLoop 并保留最后一帧；再开启模拟从暂停恢复。'
    },
    angularSpeed: {
      name: '角速度（弧度/秒）',
      control: { type: 'range', min: 0, max: 3, step: 0.1 },
      description: '每秒应累加的 Y 轴旋转弧度。'
    },
    resetOnResume: {
      name: '恢复时重置时间基准',
      control: 'boolean',
      description:
        '开启：恢复首帧 delta 为 0。关闭：恢复首帧会把暂停时长算进 raw delta（再被上限截断）。'
    }
  },
  render: sceneStory(animationLoopExample),
  parameters: sceneSource(animationLoopSource)
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

export const OnDemandRender = {
  name: '持续循环与按需渲染',
  args: {
    mode: 'continuous',
    angle: 0.6
  },
  argTypes: {
    mode: {
      name: '渲染模式',
      control: 'select',
      options: ['continuous', 'ondemand'],
      labels: {
        continuous: '持续循环',
        ondemand: '按需渲染'
      },
      description: '持续循环每帧推进并 render；按需只在角度变化时 render。'
    },
    angle: {
      name: '按需角度（弧度）',
      control: { type: 'range', min: 0, max: 6.28, step: 0.05 },
      description: '仅在按需模式下生效：改动后触发一次 render。'
    }
  },
  render: sceneStory(onDemandRenderExample),
  parameters: sceneSource(onDemandRenderSource)
};
