import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createHighlightGlowExample,
  type LayerExampleInstance,
  type LayerExampleSnapshot,
  type LayerMode,
  type LayerTarget,
} from './example';

interface LayerArgs {
  mode: LayerMode;
  target: LayerTarget;
  blurSize: number;
  intensity: number;
}

const renderLayer = canvasStory({
  create: createHighlightGlowExample,
  apply(instance: LayerExampleInstance, args: LayerArgs) {
    instance.update(args);
  },
  readout(snapshot: LayerExampleSnapshot) {
    return [
      ['当前模式', snapshot.mode],
      ['活跃层', snapshot.activeLayer],
      ['目标 mesh', snapshot.target],
      ['描边色', snapshot.highlightColor],
      ['blur 尺寸', snapshot.blurSize],
      ['发光强度', snapshot.intensity],
      ['目标 emissive', snapshot.targetEmissive],
    ];
  },
});

export default {
  id: 'highlight-and-glow-layers',
  title: '事件与交互/图层与高亮',
  tags: ['!dev'],
};

export const Highlight = {
  name: '图层与高亮',
  args: {
    mode: 'highlight',
    target: 'box',
    blurSize: 1.0,
    intensity: 1.0,
  },
  argTypes: {
    mode: {
      name: '图层模式',
      control: { type: 'radio' },
      options: ['off', 'highlight', 'glow'],
      labels: {
        off: '关',
        highlight: 'HighlightLayer 描边',
        glow: 'GlowLayer 发光',
      },
      description:
        '切换三种状态。HighlightLayer 与 GlowLayer 都继承 EffectLayer：把指定 mesh 单独画到离屏纹理、blur 后混合回主画面，是与 7.1 DefaultRenderingPipeline 全屏后处理并列的独立机制。选「关」时两层 isEnabled=false，画面回到基础渲染；切到描边/发光时只动用对应一层。',
    },
    target: {
      name: '目标 mesh（模拟拾取选中）',
      control: { type: 'select' },
      options: ['box', 'sphere', 'torus'],
      description:
        '选中的目标 mesh，对应 5.2 拾取里 pickInfo.pickedMesh 给出的对象。本课聚焦 Layer 本身，不重新接 onPointerObservable；真实代码里这个值由 scene.pick 或 POINTERPICK 写入。切 target 时描边/发光会跟随移动到对应 mesh。',
    },
    blurSize: {
      name: 'blur 尺寸（HighlightLayer）',
      control: { type: 'range', min: 0, max: 2, step: 0.1 },
      description:
        '同时设到 HighlightLayer.blurHorizontalSize 与 blurVerticalSize（默认 1.0）。数值越大描边越散越柔，0 接近实线。只在 mode=highlight 时生效，但始终显示当前值。',
    },
    intensity: {
      name: '发光强度（GlowLayer.intensity）',
      control: { type: 'range', min: 0, max: 2, step: 0.1 },
      description:
        'GlowLayer.intensity（默认 1.0），全局发光强度。只在 mode=glow 时生效，但始终显示当前值。要单 mesh 更亮可改用 layer.setEffectIntensity(mesh, value)（EffectLayer 基类提供的 per-mesh 倍数）。',
    },
  },
  render: renderLayer,
  parameters: storySource(exampleSource),
};
