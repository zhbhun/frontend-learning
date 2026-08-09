import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createViewer,
  type ViewerInstance,
  type ViewerSnapshot,
} from './example';

interface ViewerArgs {
  source: 'ok' | 'missing';
  lighting: 'studio' | 'ambient';
  frameCamera: boolean;
}

const renderViewer = canvasStory({
  create: createViewer,
  apply(instance: ViewerInstance, args: ViewerArgs) {
    instance.update(args);
  },
  readout(snapshot: ViewerSnapshot) {
    return [
      ['状态', snapshot.state],
      ['加载源', snapshot.source],
      ['根节点', snapshot.rootName],
      ['相机距离', snapshot.radius],
      ['mesh 数', snapshot.meshCount],
      ['FPS', snapshot.fps],
    ];
  },
});

export default {
  id: 'minimal-viewer',
  title: '模型与资产/查看器',
  tags: ['!dev'],
};

export const Viewer = {
  name: '最小查看器',
  args: {
    source: 'ok',
    lighting: 'studio',
    frameCamera: true,
  },
  argTypes: {
    source: {
      name: '加载源 source',
      control: { type: 'radio', options: ['ok', 'missing'] },
      description:
        'ok=成功路径，模拟 SceneLoader.AppendAsync 解析成功，构造占位模型并（按 frameCamera）自动构图；missing=错误路径，模拟 404 或解析失败，进入 error 态并清空模型。切换时先回到「加载中」，0.6s 后落到对应终态。',
    },
    lighting: {
      name: '光照预设 lighting',
      control: { type: 'radio', options: ['studio', 'ambient'] },
      description:
        'studio=HemisphericLight 打底 + DirectionalLight 补方向光（明暗对比强，适合展示模型体积）；ambient=只保留 HemisphericLight（柔和、阴影方向感弱）。两者都由 StandardMaterial 接收。',
    },
    frameCamera: {
      name: '加载后自动构图',
      control: { type: 'boolean' },
      description:
        '加载成功后用 modelRoot.getHierarchyBoundingVectors(true) 算世界包围盒，把 camera.target 设到中心、radius 设到刚好包住。模拟"加载完成后相机自动对准模型"，真实查看器对 SceneLoader 结果做同样处理。',
    },
  },
  render: renderViewer,
  parameters: storySource(exampleSource),
};
