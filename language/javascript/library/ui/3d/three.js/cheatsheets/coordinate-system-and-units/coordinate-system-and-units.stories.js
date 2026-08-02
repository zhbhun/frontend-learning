import exampleSource from './coordinate-system-and-units.js?raw';

import { sceneStory } from '../../assets/story-canvas.js';
import { sceneSource } from '../../assets/story-source.js';
import { coordinateSystemExample } from './coordinate-system-and-units.js';

export default {
  id: 'coordinate-system-and-units',
  title: '快速启动/坐标与单位',
  tags: ['!dev']
};

export const CoordinateSpace = {
  name: '坐标与空间观察器',
  args: {
    parentPositionX: 0,
    parentRotationY: 0,
    unitScale: 1,
    viewAngle: 'iso'
  },
  argTypes: {
    parentPositionX: {
      name: 'parent.position.x',
      control: { type: 'range', min: -3, max: 3, step: 0.5 },
      description: '移动父级 Group 的局部 X。child.position 恒为 (2, 0, 0)，但世界位置会随之改变。'
    },
    parentRotationY: {
      name: 'parent.rotation.y（度）',
      control: { type: 'range', min: -180, max: 180, step: 15 },
      description: '绕父级 Y 轴旋转，单位是度数，内部会先转成弧度写入 rotation.y。'
    },
    unitScale: {
      name: 'rig.scale',
      control: { type: 'range', min: 0.5, max: 2, step: 0.1 },
      description: '把坐标参照物和立方体整体放大或缩小。相机不变时只是视觉大小变化，1 单位的实际意义由场景约定。'
    },
    viewAngle: {
      name: '相机视角',
      control: 'select',
      options: ['iso', 'front', 'top'],
      labels: {
        iso: '斜视',
        front: '前视（看 -Z 方向）',
        top: '俯视（看 -Y 方向）'
      },
      description: '从不同方向观察三轴朝向。前视最容易看出右手坐标系。'
    }
  },
  render: sceneStory(coordinateSystemExample),
  parameters: sceneSource(exampleSource)
};
