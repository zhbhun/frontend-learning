import bloomPlaygroundSource from './bloom-playground.js?raw';
import outlineSelectionSource from './outline-selection.js?raw';

import { sceneStory } from '../../assets/story-canvas.js';
import { sceneSource } from '../../assets/story-source.js';
import { bloomPlaygroundExample } from './bloom-playground.js';
import { outlineSelectionExample } from './outline-selection.js';

export default {
  id: 'postprocessing-basics',
  title: '质量与交付/视觉质量/后处理',
  tags: ['!dev']
};

export const BloomPlayground = {
  name: 'Bloom 与 OutputPass',
  args: {
    bloomEnabled: true,
    strength: 1.0,
    radius: 0.4,
    threshold: 0.85,
    outputPassEnabled: true
  },
  argTypes: {
    bloomEnabled: {
      name: '启用 UnrealBloomPass',
      control: 'boolean',
      description: '关闭后 pass 仍留在链路中，但 enabled=false， EffectComposer 会跳过它。'
    },
    strength: {
      name: 'bloom strength',
      control: { type: 'range', min: 0, max: 3, step: 0.05 },
      description: '光晕叠加强度。0 等于不叠光晕，但比关闭 pass 多一次全屏拷贝。'
    },
    radius: {
      name: 'bloom radius',
      control: { type: 'range', min: 0, max: 1, step: 0.05 },
      description: '光晕扩散半径（UnrealBloomPass 限制在 [0,1]）。'
    },
    threshold: {
      name: 'bloom threshold',
      control: { type: 'range', min: 0, max: 1, step: 0.05 },
      description: '亮度阈值；只有亮度高于此值的像素参与 bloom。降低后中等亮度区域也开始发光。'
    },
    outputPassEnabled: {
      name: '启用 OutputPass',
      control: 'boolean',
      description:
        '关闭后链尾变成 UnrealBloomPass，它把线性颜色直接画到屏幕——画面会过曝偏色，这就是 OutputPass 的作用证据。'
    }
  },
  render: sceneStory(bloomPlaygroundExample),
  parameters: sceneSource(bloomPlaygroundSource)
};

export const OutlineSelection = {
  name: 'OutlinePass 描边',
  args: {
    selectedName: '雕塑',
    edgeStrength: 4.0,
    edgeThickness: 1.5
  },
  argTypes: {
    selectedName: {
      name: '选中对象',
      control: 'select',
      options: ['雕塑', '方块', '扭结', '球体', '（无）'],
      description:
        '改写 outlinePass.selectedObjects 数组。真实项目里通常由 Raycaster 命中后写入，见拾取课。'
    },
    edgeStrength: {
      name: 'edgeStrength',
      control: { type: 'range', min: 0, max: 10, step: 0.5 },
      description: '描边叠加强度。'
    },
    edgeThickness: {
      name: 'edgeThickness',
      control: { type: 'range', min: 0.5, max: 5, step: 0.25 },
      description: '描边厚度，实际影响 OutlinePass 内部高斯模糊核半径。'
    }
  },
  render: sceneStory(outlineSelectionExample),
  parameters: sceneSource(outlineSelectionSource)
};
