import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createParticlesExample,
  type BlendModeKey,
  type EmitterTypeKey,
  type ParticlesExampleInstance,
  type ParticlesExampleSnapshot,
} from './example';

interface ParticlesArgs {
  emitRate: number;
  lifeTime: number;
  size: number;
  blendMode: BlendModeKey;
  emitterType: EmitterTypeKey;
  autoRotate: boolean;
}

const renderParticles = canvasStory({
  create: createParticlesExample,
  apply(instance: ParticlesExampleInstance, args: ParticlesArgs) {
    instance.update(args);
  },
  readout(snapshot: ParticlesExampleSnapshot) {
    return [
      ['活跃粒子', snapshot.activeParticles],
      ['emitRate', `${snapshot.emitRate} /秒`],
      ['混合模式', snapshot.blendMode],
      ['发射器', snapshot.emitterType],
      ['容量上限', snapshot.capacity],
      ['FPS', snapshot.fps],
    ];
  },
});

export default {
  id: 'particles',
  title: '渲染进阶/粒子',
  tags: ['!dev'],
};

export const Particles = {
  name: '广告牌粒子',
  args: {
    emitRate: 700,
    lifeTime: 1.6,
    size: 0.4,
    blendMode: 'ONEONE',
    emitterType: 'cone',
    autoRotate: true,
  },
  argTypes: {
    emitRate: {
      name: 'emitRate（每秒发射数）',
      control: { type: 'range', min: 50, max: 3000, step: 50 },
      description:
        '写入 ps.emitRate。活跃粒子数 ≈ emitRate × 平均寿命，最终被容量上限（4000）钳制，调到极高也不会无限增长。',
    },
    lifeTime: {
      name: '生命周期（秒）',
      control: { type: 'range', min: 0.3, max: 3.5, step: 0.1 },
      description:
        '写入 ps.maxLifeTime；ps.minLifeTime 取其 0.6 倍制造参差。同一 emitRate 下寿命越长，活跃粒子越多。',
    },
    size: {
      name: '粒子尺寸',
      control: { type: 'range', min: 0.1, max: 1.2, step: 0.05 },
      description:
        '写入 ps.maxSize（世界单位）；ps.minSize 取其 0.5 倍。广告牌粒子随透视远小近大，没有屏幕恒定档。',
    },
    blendMode: {
      name: 'blendMode',
      options: ['ONEONE', 'STANDARD', 'ADD', 'MULTIPLY'],
      control: { type: 'select' },
      description:
        '切换粒子混合模式。ONEONE（默认）/ ADD 是加性混合，在深色背景上叠加发光；STANDARD 是普通 alpha 混合；MULTIPLY 做正片叠底。',
    },
    emitterType: {
      name: '发射器类型',
      options: ['box', 'cone', 'sphere', 'hemisphere'],
      control: { type: 'select' },
      description:
        '切换 ps.particleEmitterType（注意属性全名是 particleEmitterType，不是 emitterType）。改变粒子从什么形状的区域里出生。',
    },
    autoRotate: {
      name: '相机自转',
      control: 'boolean',
      description:
        '开启后每帧推进 ArcRotateCamera.alpha，相机绕 target 公转，便于从各角度观察粒子始终是面朝相机的广告牌；关闭后可手动拖拽。',
    },
  },
  render: renderParticles,
  parameters: storySource(exampleSource),
};
