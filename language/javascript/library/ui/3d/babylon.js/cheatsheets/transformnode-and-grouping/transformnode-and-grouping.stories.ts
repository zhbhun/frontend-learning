import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createTransformNodeGroupingExample,
  type TransformNodeGroupingInstance,
  type TransformNodeGroupingSnapshot,
} from './example';

interface TransformNodeGroupingArgs {
  groupPositionX: number;
  groupRotationY: number;
  wheelSpin: 'NONE' | 'SPIN';
}

const renderGrouping = canvasStory({
  create: createTransformNodeGroupingExample,
  apply(instance: TransformNodeGroupingInstance, args: TransformNodeGroupingArgs) {
    instance.update(args);
  },
  readout(snapshot: TransformNodeGroupingSnapshot) {
    return [
      ['编组 rotation.y', `${snapshot.groupRotationY}°`],
      ['编组世界位置', snapshot.groupWorld],
      ['采样车轮局部', snapshot.sampleWheelLocal],
      ['采样车轮世界', snapshot.sampleWheelWorld],
      ['采样车轮自转', snapshot.sampleWheelSpin],
    ];
  },
});

export default {
  id: 'transformnode-and-grouping',
  title: '场景与对象/TransformNode',
  tags: ['!dev'],
};

export const Grouping = {
  name: '编组：整体变换与各自变换',
  args: {
    groupPositionX: 0,
    groupRotationY: 0,
    wheelSpin: 'NONE',
  },
  argTypes: {
    groupPositionX: {
      name: '编组位移 X（单位）',
      control: { type: 'range', min: -3, max: 3, step: 0.5 },
      description:
        '写入 carGroup.position.x。整车（车身、车舱、四轮）沿世界 X 平移；采样车轮局部 position 不变，世界位置.x 同步改变。',
    },
    groupRotationY: {
      name: '编组 rotation.y（度）',
      control: { type: 'range', min: -180, max: 180, step: 15 },
      description:
        '写入 carGroup.rotation.y。整车绕编组原点转动；采样车轮局部 position 恒为 (0.65, -0.05, -0.55)，世界位置随之公转。',
    },
    wheelSpin: {
      name: '前右车轮自转',
      control: 'inline-radio',
      options: ['NONE', 'SPIN'],
      description:
        'SPIN 时前右（橙色）车轮绕自身车轴（pivot 的 Z 轴）自转——这条"各自变换"路径只改该车轮，编组、车舱和其他三轮不受影响，车轮世界位置（编组静止时）也不变。',
    },
  },
  render: renderGrouping,
  parameters: storySource(exampleSource),
};
