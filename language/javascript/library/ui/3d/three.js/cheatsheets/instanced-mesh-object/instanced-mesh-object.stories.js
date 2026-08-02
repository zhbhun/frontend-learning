import exampleSource from './instanced-mesh-example.js?raw';
import cullingSource from './instanced-mesh-culling.js?raw';

import { sceneStory } from '../../assets/story-canvas.js';
import { sceneSource } from '../../assets/story-source.js';
import { instancedMeshExample } from './instanced-mesh-example.js';
import { instancedCullingExample } from './instanced-mesh-culling.js';

export default {
  id: 'instanced-mesh-object',
  title: '核心系统/空间与对象/InstancedMesh',
  tags: ['!dev']
};

export const InstancedVsMesh = {
  name: '实例化与等量 Mesh 对比',
  args: {
    renderMode: 'instanced',
    count: 1000,
    colorMode: 'unified',
    animate: false
  },
  argTypes: {
    renderMode: {
      name: '渲染模式',
      control: 'inline-radio',
      options: ['instanced', 'individual']
    },
    count: {
      name: '实例数 / 对象数',
      control: { type: 'inline-radio', options: [500, 1000, 2000] }
    },
    colorMode: {
      name: '颜色模式',
      control: 'inline-radio',
      options: ['unified', 'perInstance']
    },
    animate: {
      name: '每帧重写矩阵（仅 InstancedMesh）',
      control: 'boolean'
    }
  },
  render: sceneStory(instancedMeshExample),
  parameters: sceneSource(exampleSource)
};

export const FrustumCulling = {
  name: '视锥剔除与包围球',
  args: {
    boundingSphereMode: 'computed'
  },
  argTypes: {
    boundingSphereMode: {
      name: 'boundingSphere 模式',
      control: 'inline-radio',
      options: ['stale', 'computed', 'disabled'],
      labels: {
        stale: '过期（实例在原点时计算）',
        computed: 'computeBoundingSphere（重算）',
        disabled: 'frustumCulled=false（跳过剔除）'
      }
    }
  },
  render: sceneStory(instancedCullingExample),
  parameters: sceneSource(cullingSource)
};
