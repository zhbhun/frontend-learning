import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createPbrPlayground,
  type PbrPlaygroundInstance,
  type PbrPlaygroundSnapshot,
} from './example';

interface PbrPlaygroundArgs {
  albedoPreset: string;
  metallic: number;
  roughness: number;
  environmentIntensity: number;
  envOn: boolean;
}

const renderPbr = canvasStory({
  create: createPbrPlayground,
  apply(instance: PbrPlaygroundInstance, args: PbrPlaygroundArgs) {
    instance.update(args);
  },
  readout(snapshot: PbrPlaygroundSnapshot) {
    return [
      ['albedo', `${snapshot.albedoPreset} ${snapshot.albedoColor}`],
      ['金属度 metallic', snapshot.metallic.toFixed(2)],
      ['粗糙度 roughness', snapshot.roughness.toFixed(2)],
      ['环境强度', snapshot.environmentIntensity.toFixed(2)],
      ['environmentTexture', snapshot.environmentTexture],
      ['金属面状态', snapshot.metalState],
    ];
  },
});

export default {
  id: 'pbr-and-environment',
  title: '材质与光照/PBR 与环境',
  tags: ['!dev'],
};

export const Pbr = {
  name: 'PBR 与环境',
  args: {
    albedoPreset: 'gold',
    metallic: 1,
    roughness: 0.3,
    environmentIntensity: 1,
    envOn: true,
  },
  argTypes: {
    albedoPreset: {
      name: 'albedo 预设',
      control: { type: 'select' },
      options: ['gold', 'copper', 'iron', 'orange', 'white'],
      description:
        '写入 pbr.albedoColor（默认白）。gold/copper/iron 是常见金属反射色调（F0），orange/white 是电介质漫反射色。同一 albedo 在 metallic=0 与 metallic=1 下外观完全不同。',
    },
    metallic: {
      name: '金属度 metallic',
      control: { type: 'range', min: 0, max: 1, step: 0.01 },
      description:
        '写入 pbr.metallic（0=电介质塑料/木材，1=纯金属）。=1 时表面几乎不产生漫反射，颜色全靠反射环境；没环境时金属面偏黑。',
    },
    roughness: {
      name: '粗糙度 roughness',
      control: { type: 'range', min: 0, max: 1, step: 0.01 },
      description:
        '写入 pbr.roughness（0=镜面反射，1=完全漫散射）。=0 时反射集中成锐点，=1 时反射被抹平成哑光。与 metallic 独立。',
    },
    environmentIntensity: {
      name: '环境强度 environmentIntensity',
      control: { type: 'range', min: 0, max: 2, step: 0.05 },
      description:
        '写入 scene.environmentIntensity（默认 1，全场 IBL 强度乘数）。=0 等于关掉环境贡献；金属面会随之变暗。',
    },
    envOn: {
      name: '开启环境 environmentTexture',
      control: 'boolean',
      description:
        '在 scene.environmentTexture 上切换：开 = 程序化 ReflectionProbe cube；关 = null。关掉且 metallic 接近 1 时，金属面没有内容可反射，几乎只剩直接光的镜面高光。',
    },
  },
  render: renderPbr,
  parameters: storySource(exampleSource),
};
