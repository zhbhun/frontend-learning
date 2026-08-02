import animationLoopSource from './animation-loop.js?raw';
import resizePipelineSource from './resize-pipeline.js?raw';

import { sceneStory } from '../../assets/story-canvas.js';
import { sceneSource } from '../../assets/story-source.js';
import { animationLoopExample } from './animation-loop.js';
import { resizePipelineExample } from './resize-pipeline.js';

export default {
  id: 'render-loop-and-resize',
  title: '快速启动/循环与尺寸',
  tags: ['!dev']
};

export const DeltaAnimation = {
  name: '用 delta 更新动画',
  args: {
    running: true,
    angularSpeed: 1
  },
  argTypes: {
    running: {
      name: '是否运行动画',
      control: 'boolean',
      description: '关闭后停止渲染循环并保留最后一帧。'
    },
    angularSpeed: {
      name: '角速度（弧度/秒）',
      control: { type: 'range', min: 0, max: 3, step: 0.1 },
      description: '每秒应累加的 Y 轴旋转弧度。'
    }
  },
  render: sceneStory(animationLoopExample),
  parameters: sceneSource(animationLoopSource)
};

export const ResizePipeline = {
  name: '尺寸同步链路',
  args: {
    resizeMode: 'correct',
    displayAspect: 16 / 9,
    pixelRatio: 1
  },
  argTypes: {
    resizeMode: {
      name: '尺寸策略',
      control: 'select',
      options: ['correct', 'css-only', 'skip-projection-update'],
      mapping: {
        correct: 'correct',
        'css-only': 'css-only',
        'skip-projection-update': 'skip-projection-update'
      },
      labels: {
        correct: '完整同步',
        'css-only': '只改 CSS',
        'skip-projection-update': '漏更新投影矩阵'
      }
    },
    displayAspect: {
      name: 'CSS 宽高比',
      control: { type: 'range', min: 1, max: 2.4, step: 0.1 },
      description: '直接改变 Canvas 外层舞台的 CSS aspect-ratio。'
    },
    pixelRatio: {
      name: 'renderer pixel ratio',
      control: { type: 'range', min: 0.5, max: 2, step: 0.25 },
      description: 'drawing buffer 相对 renderer 逻辑尺寸的倍率。'
    }
  },
  render: sceneStory(resizePipelineExample),
  parameters: sceneSource(resizePipelineSource)
};
