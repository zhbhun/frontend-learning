import exampleSource from './debug-dashboard.js?raw';

import { sceneStory } from '../../assets/story-canvas.js';
import { sceneSource } from '../../assets/story-source.js';
import { debugDashboardExample } from './debug-dashboard.js';

export default {
  id: 'debug-gui-and-stats',
  title: '动画与交互/交互与调试/调试',
  tags: ['!dev']
};

export const Dashboard = {
  name: '调试反馈面板',
  args: {
    showHelpers: true,
    objectColor: '#3d73d9',
    roughness: 0.5,
    ringCount: 12
  },
  argTypes: {
    showHelpers: {
      name: '显示 helper',
      description:
        '开关 AxesHelper / GridHelper / BoxHelper；观察 draw calls 随 helper 数量变化。',
      control: 'boolean'
    },
    objectColor: {
      name: '对象颜色',
      description:
        '中心对象的材质颜色；lil-gui 在真实项目里用 addColor 暴露的就是这种参数。',
      control: 'color'
    },
    roughness: {
      name: '粗糙度',
      description:
        "MeshStandardMaterial 的 roughness；数值型参数对应 lil-gui 的 gui.add(obj, key, min, max, step)。",
      control: { type: 'range', min: 0, max: 1, step: 0.01 }
    },
    ringCount: {
      name: '周围对象数量',
      description:
        '围绕中心的小立方体数量；调整后观察 draw calls 与 triangles 怎么随之近似线性增长。',
      control: { type: 'range', min: 0, max: 30, step: 1 }
    }
  },
  render: sceneStory(debugDashboardExample),
  parameters: sceneSource(exampleSource)
};
