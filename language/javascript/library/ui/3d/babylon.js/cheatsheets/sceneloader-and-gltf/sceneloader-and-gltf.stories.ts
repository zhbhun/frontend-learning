import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createLoaderExample,
  type LoaderInstance,
  type LoaderSnapshot,
} from './example';

interface LoaderArgs {
  state: 'loaded' | 'unloaded';
  frameCamera: boolean;
}

const renderLoader = canvasStory({
  create: createLoaderExample,
  apply(instance: LoaderInstance, args: LoaderArgs) {
    instance.update(args);
  },
  readout(snapshot: LoaderSnapshot) {
    return [
      ['状态', snapshot.state],
      ['根节点', snapshot.rootName],
      ['容器 meshes', snapshot.containerMeshes],
      ['容器 transformNodes', snapshot.containerTransformNodes],
      ['容器 animationGroups', snapshot.containerAnimationGroups],
      ['场景 meshes', snapshot.sceneMeshes],
      ['加载耗时', `${snapshot.loadMs.toFixed(1)} ms`],
      ['FPS', snapshot.fps],
    ];
  },
});

export default {
  id: 'sceneloader-and-gltf',
  title: '模型与资产/加载模型',
  tags: ['!dev'],
};

export const Loader = {
  name: '加载与卸载',
  args: {
    state: 'loaded',
    frameCamera: true,
  },
  argTypes: {
    state: {
      name: '加载状态 state',
      control: { type: 'radio' },
      options: ['loaded', 'unloaded'],
      description:
        "loaded 调 container.addAllToScene() 把模型整组挂回场景并播放 AnimationGroup；unloaded 调 removeAllFromScene() 把模型整组摘下并停止动画。容器内的资产计数恒定，变化的是场景 meshes 数——这正是 AssetContainer 成组加载 / 卸载的核心。",
    },
    frameCamera: {
      name: '加载后对准模型',
      control: { type: 'boolean' },
      description:
        '加载后用 modelRoot.getHierarchyBoundingVectors() 算模型包围盒，把 ArcRotateCamera 的 target 设到中心、radius 设到刚好包住。模拟"加载完成后自动构图"，真实项目里对 SceneLoader 结果做同样处理。',
    },
  },
  render: renderLoader,
  parameters: storySource(exampleSource),
};
