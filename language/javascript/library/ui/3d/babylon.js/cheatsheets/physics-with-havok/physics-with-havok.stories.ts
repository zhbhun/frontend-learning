import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createPhysicsExample,
  type PhysicsInstance,
  type PhysicsSnapshot,
  type GravityDir,
} from './example';

interface PhysicsArgs {
  gravityDir: GravityDir;
  restitution: number;
}

const gravityLabel: Record<GravityDir, string> = {
  down: '向下（−9.81）',
  up: '向上（+9.81）',
  zero: '零重力（0）',
};

const renderPhysics = canvasStory({
  create: createPhysicsExample,
  apply(instance: PhysicsInstance, args: PhysicsArgs) {
    instance.update(args);
  },
  readout(snapshot: PhysicsSnapshot) {
    return [
      ['物理状态', snapshot.ready ? '已就绪' : '加载中（WASM）'],
      ['刚体总数', snapshot.totalBodies],
      ['活跃刚体', snapshot.activeBodies],
      ['重力', gravityLabel[snapshot.gravityDir]],
      ['弹性 restitution', snapshot.restitution.toFixed(2)],
      ['FPS', snapshot.fps],
    ];
  },
  captions: ['点击画布：撒一批新物体', '拖拽：旋转视角'],
});

export default {
  id: 'physics-with-havok',
  title: '应用扩展/物理',
  tags: ['!dev'],
};

export const Physics = {
  name: 'Havok 物理沙盒',
  args: {
    gravityDir: 'down',
    restitution: 0.55,
  },
  argTypes: {
    gravityDir: {
      name: '重力方向',
      control: { type: 'select' },
      options: ['down', 'up', 'zero'],
      description:
        '切换场景重力向量。down=正常下落（−9.81 m/s²），up=反向坠落，zero=无重力漂浮。运行时通过 HavokPlugin.setGravity 即时生效。',
    },
    restitution: {
      name: '弹性',
      control: { type: 'range', min: 0, max: 1, step: 0.05 },
      description:
        '碰撞弹性（PhysicsMaterial.restitution）。0=不弹，1=完全弹性。改值后遍历所有 shape 重设 material，已落地的物体下次碰撞时生效。',
    },
  },
  render: renderPhysics,
  parameters: storySource(exampleSource),
};
