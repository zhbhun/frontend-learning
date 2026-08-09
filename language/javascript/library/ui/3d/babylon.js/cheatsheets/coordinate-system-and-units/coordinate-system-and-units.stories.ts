import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createCoordinateSpaceExample,
  createCanvasScalingExample,
  type CoordinateSpaceInstance,
  type CoordinateSpaceSnapshot,
  type CanvasScalingInstance,
  type CanvasScalingSnapshot,
} from './example';

interface CoordinateSpaceArgs {
  useRightHanded: boolean;
  parentRotationY: number;
}

interface CanvasScalingArgs {
  scalingLevel: number;
}

const renderCoordinateSpace = canvasStory({
  create: createCoordinateSpaceExample,
  apply(instance: CoordinateSpaceInstance, args: CoordinateSpaceArgs) {
    instance.update(args);
  },
  readout(snapshot: CoordinateSpaceSnapshot) {
    return [
      ['坐标系', snapshot.handedness],
      ['子节点局部', snapshot.childLocal],
      ['子节点世界', snapshot.childWorld],
    ];
  },
});

const renderCanvasScaling = canvasStory({
  create: createCanvasScalingExample,
  apply(instance: CanvasScalingInstance, args: CanvasScalingArgs) {
    instance.update(args);
  },
  readout(snapshot: CanvasScalingSnapshot) {
    return [
      ['CSS 尺寸', snapshot.cssSize],
      ['渲染分辨率', snapshot.renderSize],
      ['硬件缩放级别', snapshot.scalingLevel],
    ];
  },
});

export default {
  id: 'coordinate-system-and-units',
  title: '起步/坐标与尺寸',
  tags: ['!dev'],
};

export const CoordinateSpace = {
  name: '坐标空间',
  args: {
    useRightHanded: false,
    parentRotationY: 0,
  },
  argTypes: {
    useRightHanded: {
      name: '切换右手系',
      control: 'boolean',
      description:
        '写入 scene.useRightHandedSystem。默认关闭（左手系，+Z 朝前）；打开后投影与背面剔除翻转，对齐 three.js / glTF 的右手系约定。',
    },
    parentRotationY: {
      name: '父节点 rotation.y（度）',
      control: { type: 'range', min: -180, max: 180, step: 15 },
      description:
        '父节点绕 Y 旋转。子节点 position 恒为 (2.5, 0, 0)，世界坐标会随父级改变——对比局部与世界读数。',
    },
  },
  render: renderCoordinateSpace,
  parameters: storySource(exampleSource),
};

export const CanvasScaling = {
  name: '画布与缩放',
  args: {
    scalingLevel: 1,
  },
  argTypes: {
    scalingLevel: {
      name: 'engine 硬件缩放级别',
      control: { type: 'range', min: 0.5, max: 2, step: 0.25 },
      description:
        '写入 engine.setHardwareScalingLevel。>1 降低渲染分辨率（更省），<1 超采样（更清晰）。CSS 尺寸不变，渲染分辨率随级别反向缩放。',
    },
  },
  render: renderCanvasScaling,
  parameters: storySource(exampleSource),
};
