import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createSceneStateExample,
  type SceneStateInstance,
  type SceneStateSnapshot,
} from './example';

interface SceneStateArgs {
  clearColor: string;
  fogMode: string;
  fogDensity: number;
}

const renderSceneState = canvasStory({
  create: createSceneStateExample,
  apply(instance: SceneStateInstance, args: SceneStateArgs) {
    instance.update(args);
  },
  readout(snapshot: SceneStateSnapshot) {
    return [
      ['clearColor', snapshot.clearColor],
      ['fogMode', snapshot.fogMode],
      ['fogDensity', snapshot.fogDensity.toFixed(2)],
      ['activeCamera', snapshot.activeCamera],
      ['网格数', snapshot.meshCount],
    ];
  },
});

export default {
  id: 'scene-container',
  title: '场景与对象/Scene',
  tags: ['!dev'],
};

export const SceneState = {
  name: '场景状态',
  args: {
    clearColor: 'light',
    fogMode: 'NONE',
    fogDensity: 0.05,
  },
  argTypes: {
    clearColor: {
      name: '背景清色 clearColor',
      control: { type: 'select' },
      options: ['default', 'light', 'black', 'transparent'],
      description:
        "写入 scene.clearColor（Color4）。default 是 Babylon 默认深蓝；light 浅米；black 纯黑；transparent 把 alpha 设为 0，画布变透明（Engine 默认创建带 alpha 的上下文）。",
    },
    fogMode: {
      name: '雾模式 fogMode',
      control: { type: 'select' },
      options: ['NONE', 'EXP', 'EXP2', 'LINEAR'],
      description:
        '写入 scene.fogMode。NONE 关闭；EXP/EXP2 按密度指数；LINEAR 在 fogStart/fogEnd 之间线性过渡（密度无效）。',
    },
    fogDensity: {
      name: '雾密度 fogDensity',
      control: { type: 'range', min: 0, max: 0.3, step: 0.01 },
      description:
        '写入 scene.fogDensity，只对 EXP / EXP2 生效。本例 fogColor 固定为浅冷灰、fogStart=8 / fogEnd=32。',
    },
  },
  render: renderSceneState,
  parameters: storySource(exampleSource),
};
