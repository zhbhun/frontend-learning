import fountainSource from './particles-fountain.js?raw';
import vsInstancedSource from './particles-vs-instanced.js?raw';
import sharedSceneSource from '../../assets/shared-scene.js?raw';

import { sceneStory } from '../../assets/story-canvas.js';
import { sceneSource } from '../../assets/story-source.js';
import { particlesFountainExample } from './particles-fountain.js';
import { particlesVsInstancedExample } from './particles-vs-instanced.js';

export default {
  id: 'points-particles-instancing',
  title: '进阶分支/渲染技术/粒子',
  tags: ['!dev']
};

function sourceBundle(memberSource) {
  return [sharedSceneSource, memberSource].join('\n\n');
}

export const ParticlesFountain = {
  name: '粒子动画与数量级',
  args: {
    count: 8000,
    gravity: -9.8,
    blending: 'additive',
    animate: true
  },
  argTypes: {
    count: {
      name: '粒子数（重建几何）',
      control: { type: 'inline-radio', options: [2000, 8000, 20000] },
      description:
        '顶点数变化会重建 BufferGeometry；draw calls 始终是 1，差异在 CPU 模拟与上传开销。'
    },
    gravity: {
      name: 'gravity（m/s²）',
      control: { type: 'range', min: -15, max: 2, step: 0.5 },
      description: '负值向下，0 时粒子悬浮可看清加性混合的叠加；正值上抛。'
    },
    blending: {
      name: 'material.blending',
      control: { type: 'inline-radio' },
      options: ['additive', 'normal'],
      labels: { additive: 'AdditiveBlending', normal: 'NormalBlending' },
      description:
        '加性混合需要深色背景；切到 Normal 后发光累加消失，颗粒变成普通半透明圆点。'
    },
    animate: {
      name: 'animate',
      control: 'boolean',
      description: '关闭后 CPU 模拟停步，needsUpdate 不再累加，画面冻结在最后一帧。'
    }
  },
  render: sceneStory(particlesFountainExample),
  parameters: sceneSource(sourceBundle(fountainSource))
};

export const PointsVsInstanced = {
  name: 'Points vs InstancedMesh 做粒子',
  args: {
    renderMode: 'points',
    count: 1500,
    animate: true
  },
  argTypes: {
    renderMode: {
      name: '渲染模式',
      control: { type: 'inline-radio' },
      options: ['points', 'instanced'],
      labels: {
        points: 'Points（每顶点一个点）',
        instanced: 'InstancedMesh（每实例一个八面体）'
      },
      description:
        '两模式 draw calls 都是 1；差异在 triangles——Points 是 0，InstancedMesh 随实例数线性增长。'
    },
    count: {
      name: '颗粒数',
      control: { type: 'inline-radio', options: [500, 1500, 3000] }
    },
    animate: {
      name: '整体自转',
      control: 'boolean'
    }
  },
  render: sceneStory(particlesVsInstancedExample),
  parameters: sceneSource(sourceBundle(vsInstancedSource))
};
