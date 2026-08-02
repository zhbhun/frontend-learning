import onDemandSource from './on-demand-render.js?raw';
import resourceLifecycleSource from './resource-lifecycle.js?raw';

import { sceneStory } from '../../assets/story-canvas.js';
import { sceneSource } from '../../assets/story-source.js';
import { onDemandExample } from './on-demand-render.js';
import { resourceLifecycleExample } from './resource-lifecycle.js';

export default {
  id: 'performance-and-disposal',
  title: '质量与交付/交付质量/性能',
  tags: ['!dev']
};

export const OnDemandRender = {
  name: '连续渲染 vs 按需渲染',
  args: {
    renderMode: 'continuous',
    rotationY: 0
  },
  argTypes: {
    renderMode: {
      name: '渲染模式',
      control: 'inline-radio',
      options: ['continuous', 'onDemand'],
      description:
        'continuous 用 setAnimationLoop 每帧 render；onDemand 停掉循环，仅在 args 变化时调一次 renderer.render。'
    },
    rotationY: {
      name: '对象 Y 旋转（弧度）',
      control: { type: 'range', min: 0, max: Math.PI * 2, step: 0.01 },
      description:
        '拖动这个滑块就是一次"状态变化"。按需模式下只在拖动时 render；松开后每秒 render 次数立刻归零。'
    }
  },
  render: sceneStory(onDemandExample),
  parameters: sceneSource(onDemandSource)
};

export const ResourceLifecycle = {
  name: 'dispose 与资源复用',
  args: {
    objectCount: 12,
    disposeOnRemove: true,
    shareGeometry: false
  },
  argTypes: {
    objectCount: {
      name: '场景对象数',
      control: { type: 'range', min: 0, max: 40, step: 1 },
      description:
        '增大时新建 mesh；减小时按"移除时 dispose"决定 geometry 是否从显存释放。观察 memory.geometries 的差。'
    },
    disposeOnRemove: {
      name: '移除时 dispose()',
      control: 'boolean',
      description:
        '关闭后减小对象数：节点离开了场景树，但 GPU 资源没释放——memory.geometries 只增不减，即资源泄漏。'
    },
    shareGeometry: {
      name: '共享 geometry',
      control: 'boolean',
      description:
        '开启后所有 mesh 引用同一份 geometry；memory.geometries 始终是 1，不再随对象数线性增长。'
    }
  },
  render: sceneStory(resourceLifecycleExample),
  parameters: sceneSource(resourceLifecycleSource)
};
