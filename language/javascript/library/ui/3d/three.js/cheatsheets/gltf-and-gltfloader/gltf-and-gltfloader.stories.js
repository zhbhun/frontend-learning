import loadingSource from './gltf-loading.js?raw';
import traverseSource from './gltf-traverse.js?raw';
import utilsSource from './gltf-example-utils.js?raw';

import { sceneStory } from '../../assets/story-canvas.js';
import { sceneSource } from '../../assets/story-source.js';
import { gltfLoadingExample } from './gltf-loading.js';
import { gltfTraverseExample } from './gltf-traverse.js';

export default {
  id: 'gltf-and-gltfloader',
  title: '纹理与模型/模型',
  tags: ['!dev']
};

function sourceBundle(memberSource) {
  return [utilsSource, memberSource].join('\n\n');
}

export const GLTFLoading = {
  name: 'GLTFLoader 加载',
  args: {
    source: 'generated-glb'
  },
  argTypes: {
    source: {
      name: '加载源',
      control: 'select',
      options: ['generated-glb', 'missing', 'corrupt']
    }
  },
  render: sceneStory(gltfLoadingExample),
  parameters: sceneSource(sourceBundle(loadingSource))
};

export const TraverseAndDispose = {
  name: '节点遍历与释放',
  args: {
    mode: 'list'
  },
  argTypes: {
    mode: {
      name: '操作',
      control: 'select',
      options: ['list', 'dispose']
    }
  },
  render: sceneStory(gltfTraverseExample),
  parameters: sceneSource(sourceBundle(traverseSource))
};
