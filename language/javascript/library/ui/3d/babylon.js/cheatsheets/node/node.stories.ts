import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createNodeExample,
  type NodeInstance,
  type NodeSnapshot,
} from './example';

interface NodeArgs {
  parentRotationY: number;
  parentEnabled: boolean;
}

const renderHierarchy = canvasStory({
  create: createNodeExample,
  apply(instance: NodeInstance, args: NodeArgs) {
    instance.update(args);
  },
  readout(snapshot: NodeSnapshot) {
    return [
      ['父节点 rotation.y', `${snapshot.parentRotationY}°`],
      ['父节点 enabled', snapshot.parentEnabled],
      ['子节点局部', snapshot.childLocal],
      ['子节点世界', snapshot.childWorld],
    ];
  },
});

export default {
  id: 'node',
  title: '场景与对象/Node',
  tags: ['!dev'],
};

export const Hierarchy = {
  name: '父子层级与启用传播',
  args: {
    parentRotationY: 0,
    parentEnabled: true,
  },
  argTypes: {
    parentRotationY: {
      name: '父节点 rotation.y（度）',
      control: { type: 'range', min: -180, max: 180, step: 15 },
      description:
        '父节点 TransformNode 绕 Y 旋转。子节点局部 position 恒为 (3, 0, 0)，世界坐标随父级改变——对比局部与世界读数，验证"父动子动、子局部不变"。',
    },
    parentEnabled: {
      name: '父节点 enabled',
      control: 'boolean',
      description:
        '写入 parent.setEnabled。OFF 时父节点下的整棵子树（arm、子立方体、nose）从画面消失——禁用沿父子链传播，子节点自身并未单独 setEnabled。',
    },
  },
  render: renderHierarchy,
  parameters: storySource(exampleSource),
};
