import lineSource from './line.js?raw';
import lineSegmentsSource from './line-segments.js?raw';
import lineLoopSource from './line-loop.js?raw';
import sharedSceneSource from '../../assets/shared-scene.js?raw';

import { sceneStory } from '../../assets/story-canvas.js';
import { sceneSource } from '../../assets/story-source.js';
import { lineExample } from './line.js';
import { lineSegmentsExample } from './line-segments.js';
import { lineLoopExample } from './line-loop.js';

export default {
  id: 'line-and-segments',
  title: '核心系统/空间与对象/Line',
  tags: ['!dev']
};

// 每个 story 的源码入口都把 shared-scene 和成员范例组合在一起，
// 让 Canvas 的 source 面板展示从渲染外壳到成员核心实现的完整链路。
function sourceBundle(memberSource) {
  return [sharedSceneSource, memberSource].join('\n\n');
}

export const LinePath = {
  name: 'Line：连续路径',
  args: {
    vertexCount: 10,
    amplitude: 0.9
  },
  argTypes: {
    vertexCount: {
      name: '顶点数 N',
      control: { type: 'range', min: 3, max: 24, step: 1 }
    },
    amplitude: {
      name: '振幅',
      control: { type: 'range', min: 0, max: 1.4, step: 0.1 }
    }
  },
  render: sceneStory(lineExample),
  parameters: sceneSource(sourceBundle(lineSource))
};

export const SegmentsPairs = {
  name: 'LineSegments：独立线段',
  args: {
    geometryType: 'box',
    sourceType: 'edges'
  },
  argTypes: {
    geometryType: {
      name: '原几何体',
      control: 'inline-radio',
      options: ['box', 'sphere', 'torusKnot']
    },
    sourceType: {
      name: '线段来源',
      control: 'inline-radio',
      options: ['edges', 'wireframe']
    }
  },
  render: sceneStory(lineSegmentsExample),
  parameters: sceneSource(sourceBundle(lineSegmentsSource))
};

export const LoopClosed = {
  name: 'LineLoop：自动闭合',
  args: {
    sides: 6,
    radius: 1.4
  },
  argTypes: {
    sides: {
      name: '边数 N',
      control: { type: 'range', min: 3, max: 12, step: 1 }
    },
    radius: {
      name: '半径',
      control: { type: 'range', min: 0.6, max: 1.6, step: 0.1 }
    }
  },
  render: sceneStory(lineLoopExample),
  parameters: sceneSource(sourceBundle(lineLoopSource))
};
