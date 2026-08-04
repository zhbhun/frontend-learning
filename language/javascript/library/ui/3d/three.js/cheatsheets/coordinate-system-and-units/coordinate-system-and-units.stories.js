import rightHandedAxesSource from './right-handed-axes.js?raw';
import worldUnitsSource from './world-units.js?raw';
import radiansRotationSource from './radians-rotation.js?raw';
import localVsWorldSource from './local-vs-world.js?raw';
import resizePipelineSource from './resize-pipeline.js?raw';

import { sceneStory } from '../../assets/story-canvas.js';
import { sceneSource } from '../../assets/story-source.js';
import { rightHandedAxesExample } from './right-handed-axes.js';
import { worldUnitsExample } from './world-units.js';
import { radiansRotationExample } from './radians-rotation.js';
import { localVsWorldExample } from './local-vs-world.js';
import { resizePipelineExample } from './resize-pipeline.js';

export default {
  id: 'coordinate-system-and-units',
  title: '核心系统/坐标与尺寸',
  tags: ['!dev']
};

export const RightHandedAxes = {
  name: '右手坐标系',
  args: {
    viewAngle: 'front',
    rotationY: 0
  },
  argTypes: {
    viewAngle: {
      name: '相机视角',
      control: 'select',
      options: ['front', 'top', 'iso'],
      labels: {
        front: '前视（看 -Z）',
        top: '俯视（看 -Y）',
        iso: '斜视'
      },
      description: '前视最容易核对 +X 右、+Y 上、+Z 朝自己；俯视用来看绕 Y 的逆时针。'
    },
    rotationY: {
      name: 'rotation.y（度）',
      control: { type: 'range', min: -180, max: 180, step: 15 },
      description: '绕 +Y 正向旋转。俯视时增大角度应看到逆时针（右手定则）。'
    }
  },
  render: sceneStory(rightHandedAxesExample),
  parameters: sceneSource(rightHandedAxesSource)
};

export const WorldUnits = {
  name: '世界单位',
  args: {
    unitScale: 1
  },
  argTypes: {
    unitScale: {
      name: '整体缩放',
      control: { type: 'range', min: 0.5, max: 2, step: 0.1 },
      description: '写入 group.scale（Vector3）。相机不动时只是画面大小变化，不改变“1 单位 = 几像素”。'
    }
  },
  render: sceneStory(worldUnitsExample),
  parameters: sceneSource(worldUnitsSource)
};

export const RadiansRotation = {
  name: '角度与弧度',
  args: {
    angleDegrees: 45,
    writeAsDegrees: false
  },
  argTypes: {
    angleDegrees: {
      name: '意图角度（度）',
      control: { type: 'range', min: 0, max: 180, step: 15 },
      description: '你想转到的角度。是否先换算成弧度，由下一个开关决定。'
    },
    writeAsDegrees: {
      name: '把度数直接写入 rotation.y',
      control: 'boolean',
      description: '打开后会把 45 当成 45 弧度写入（错误用法）；关闭则走 degToRad。'
    }
  },
  render: sceneStory(radiansRotationExample),
  parameters: sceneSource(radiansRotationSource)
};

export const LocalVsWorld = {
  name: '局部与世界空间',
  args: {
    parentPositionX: 0,
    parentRotationY: 0
  },
  argTypes: {
    parentPositionX: {
      name: 'parent.position.x',
      control: { type: 'range', min: -3, max: 3, step: 0.5 },
      description: '移动父级。child.position 恒为 (2, 0, 0)，世界位置会变。'
    },
    parentRotationY: {
      name: 'parent.rotation.y（度）',
      control: { type: 'range', min: -180, max: 180, step: 15 },
      description: '旋转父级后，同一局部坐标在世界中的方向会变。'
    }
  },
  render: sceneStory(localVsWorldExample),
  parameters: sceneSource(localVsWorldSource)
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
      },
      description: '完整同步时 CSS、drawing buffer 与投影一致；错误分支可定位拉伸或比例失真发生在哪一层。'
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
