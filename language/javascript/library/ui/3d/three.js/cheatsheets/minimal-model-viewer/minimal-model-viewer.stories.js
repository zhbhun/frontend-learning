import canvasSource from './viewer-canvas.js?raw';
import framingSource from './viewer-framing.js?raw';
import stageSource from './viewer-stage.js?raw';

import { sceneStory } from '../../assets/story-canvas.js';
import { sceneSource } from '../../assets/story-source.js';
import { viewerCanvasExample } from './viewer-canvas.js';
import { viewerFramingExample } from './viewer-framing.js';

export default {
  id: 'minimal-model-viewer',
  title: '纹理与模型/查看器',
  tags: ['!dev']
};

// Canvas 的源码入口绑定到真实执行的核心实现；viewer-stage.js 是共用外壳，
// 与各范例文件拼接成同一份真源，避免维护第二份手抄代码。
function sourceBundle(memberSource) {
  return [stageSource, memberSource].join('\n\n');
}

export const ViewerCanvas = {
  name: '最小查看器',
  args: {
    source: 'sample',
    lighting: 'studio',
    damping: true,
    autoRotate: false
  },
  argTypes: {
    source: {
      name: '加载源',
      control: 'select',
      options: ['sample', 'missing', 'corrupt']
    },
    lighting: {
      name: '光照',
      control: 'radio',
      options: ['studio', 'flat']
    },
    damping: {
      name: '阻尼',
      control: 'boolean'
    },
    autoRotate: {
      name: '自动旋转',
      control: 'boolean'
    }
  },
  render: sceneStory(viewerCanvasExample),
  parameters: sceneSource(sourceBundle(canvasSource))
};

export const ViewerFraming = {
  name: '取景对照',
  args: {
    framing: 'fit'
  },
  argTypes: {
    framing: {
      name: '取景策略',
      control: 'select',
      options: ['fit', 'no-fit', 'fit-no-target']
    }
  },
  render: sceneStory(viewerFramingExample),
  parameters: sceneSource(sourceBundle(framingSource))
};
