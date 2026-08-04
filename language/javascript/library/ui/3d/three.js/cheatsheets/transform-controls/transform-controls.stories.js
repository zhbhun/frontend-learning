import './transform-controls.css';

import { sceneSource } from '../../assets/story-source.js';

import { createTransformExample } from './transform-example.js';
import exampleSource from './transform-example.js?raw';

export default {
  id: 'transform-controls',
  title: '核心系统/交互与事件/TransformControls',
  tags: ['!dev']
};

export const Transform = {
  name: 'TransformControls',
  args: {
    mode: 'translate',
    space: 'world',
    size: 1,
    translationSnap: 0,
    orbitBridge: true
  },
  argTypes: {
    mode: {
      name: '模式',
      description: 'gizmo 的变换类型；切换后立即作用于当前选中对象。',
      control: { type: 'inline-radio' },
      options: ['translate', 'rotate', 'scale']
    },
    space: {
      name: '空间',
      description: 'world 围绕世界轴变换；local 围绕对象自身朝向变换。',
      control: { type: 'inline-radio' },
      options: ['world', 'local']
    },
    size: {
      name: 'gizmo 大小',
      description: 'gizmo 视觉尺寸；不影响变换幅度。',
      control: { type: 'range', min: 0.4, max: 2.2, step: 0.1 }
    },
    translationSnap: {
      name: '平移吸附',
      description: '大于 0 时按该世界单位吸附；0 表示不吸附。',
      control: { type: 'range', min: 0, max: 2, step: 0.25 }
    },
    orbitBridge: {
      name: '拖动时禁用 OrbitControls',
      description: '通过 dragging-changed 在拖动 gizmo 期间暂停相机控制器；关闭后可观察输入冲突。',
      control: 'boolean'
    }
  },
  render: persistentStory(createTransformExample),
  parameters: sceneSource(exampleSource)
};

function persistentStory(create) {
  let example;

  return (args) => {
    if (!example || example.disposed) {
      example = create(args);
    } else {
      example.apply(args);
    }

    return example.element;
  };
}
