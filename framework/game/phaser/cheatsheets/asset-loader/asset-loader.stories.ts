import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import loadProgressSource from './load-progress.ts?raw';
import manualLoadSource from './manual-load.ts?raw';
import crossSceneSource from './cross-scene.ts?raw';
import {
  createLoadProgress,
  type LoadProgressInstance,
  type LoadProgressSnapshot,
} from './load-progress';
import {
  createManualLoad,
  type ManualLoadAction,
  type ManualLoadInstance,
  type ManualLoadSnapshot,
} from './manual-load';
import {
  createCrossScene,
  type CrossSceneAction,
  type CrossSceneInstance,
  type CrossSceneSnapshot,
} from './cross-scene';

interface AssetLoaderArgs {
  rounds?: number;
  loadAction?: ManualLoadAction;
  sceneAction?: CrossSceneAction;
}

const renderLoadProgress = canvasStory({
  create: createLoadProgress,
  apply(instance: LoadProgressInstance, args: AssetLoaderArgs) {
    instance.requestRounds(args.rounds ?? 0);
  },
  readout(snapshot: LoadProgressSnapshot) {
    return [
      ['当前轮次', snapshot.round],
      ['加载进度', snapshot.progress],
      ['本轮完成文件', snapshot.filesDone],
      ['加载器状态', snapshot.loading ? 'LOADING' : '空闲'],
      ['最近完成文件', snapshot.recentFiles],
      ['失败文件', snapshot.failed],
      ['缓存命中', snapshot.cacheHits],
      ['第 1 轮 key 仍在缓存', snapshot.round0Kept],
    ];
  },
});

const renderManualLoad = canvasStory({
  create: createManualLoad,
  apply(instance: ManualLoadInstance, args: AssetLoaderArgs) {
    instance.perform((args.loadAction as ManualLoadAction) ?? 'none');
  },
  readout(snapshot: ManualLoadSnapshot) {
    return [
      ['最近操作', snapshot.action],
      ['本轮入队', snapshot.queued],
      ['加载器状态', snapshot.loading ? 'LOADING' : '空闲'],
      ['本轮结果', snapshot.done],
      ['事件日志', snapshot.eventLog],
      ['flag 纹理', snapshot.flagTexture],
      ['digits 位图字体', snapshot.bitmapFont],
      ['ghost 纹理', snapshot.ghostTexture],
    ];
  },
});

const renderCrossScene = canvasStory({
  create: createCrossScene,
  apply(instance: CrossSceneInstance, args: AssetLoaderArgs) {
    instance.perform((args.sceneAction as CrossSceneAction) ?? 'none');
  },
  readout(snapshot: CrossSceneSnapshot) {
    return [
      ['最近操作', snapshot.action],
      ['LoaderSide 缓存', snapshot.loaderLoaded],
      ['ConsumerSide 状态', snapshot.consumerStatus],
      ['Consumer 看到纹理', snapshot.consumerSeesTexture],
      ['Consumer 读 json', snapshot.consumerSeesJson],
      ['textures 同一实例', snapshot.sameTextureInstance],
    ];
  },
});

const meta: Meta<AssetLoaderArgs> = {
  id: 'asset-loader',
  title: '资源与显示/资源加载器',
  tags: ['!dev'],
  // 默认 render,同时为每个 story 的 args 提供类型锚点;各 story 覆盖为自己的 render
  render: renderLoadProgress,
};

export default meta;

type Story = StoryObj<AssetLoaderArgs>;

export const LoadProgress: Story = {
  args: { rounds: 0 },
  argTypes: {
    rounds: {
      name: '加载轮次',
      description:
        '每加一,场景 restart 并在 preload 里用新 key 后缀重新排队 7 个文件,走真实网络加载。',
      control: { type: 'range', min: 0, max: 4, step: 1 },
    },
  },
  parameters: storySource(loadProgressSource),
  render: renderLoadProgress,
};

export const ManualLoad: Story = {
  args: { loadAction: 'none' },
  argTypes: {
    loadAction: {
      name: '加载项',
      description: '在 create 阶段排队对应文件并手动 this.load.start()。',
      control: { type: 'radio' },
      options: ['none', 'svg', 'bitmapFont', 'missing', 'duplicate'],
      labels: {
        none: '无',
        svg: 'svg 图标',
        bitmapFont: '位图字体',
        missing: '缺失 url(404)',
        duplicate: '重复 key ×2',
      },
    },
  },
  parameters: storySource(manualLoadSource),
  render: renderManualLoad,
};

export const CrossScene: Story = {
  args: { sceneAction: 'none' },
  argTypes: {
    sceneAction: {
      name: '场景操作',
      description: "由 LoaderSide 场景对 ConsumerSide 执行 launch / stop。",
      control: { type: 'radio' },
      options: ['none', 'launch', 'stop'],
      labels: {
        none: '无',
        launch: 'launch 启动 Consumer',
        stop: 'stop 停止 Consumer',
      },
    },
  },
  parameters: storySource(crossSceneSource),
  render: renderCrossScene,
};
