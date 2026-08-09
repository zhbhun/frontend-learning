import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createLightGallery,
  type LightGalleryInstance,
  type LightGallerySnapshot,
} from './example';

interface LightGalleryArgs {
  lightType: string;
  intensity: number;
}

const renderLights = canvasStory({
  create: createLightGallery,
  apply(instance: LightGalleryInstance, args: LightGalleryArgs) {
    instance.update(args);
  },
  readout(snapshot: LightGallerySnapshot) {
    return [
      ['光源类型', snapshot.lightType],
      ['intensity', snapshot.intensity.toFixed(2)],
      ['位置 / 方向', snapshot.source],
    ];
  },
});

export default {
  id: 'lights',
  title: '场景与对象/光源',
  tags: ['!dev'],
};

export const Lights = {
  name: '光源对比',
  args: {
    lightType: 'hemispheric',
    intensity: 1,
  },
  argTypes: {
    lightType: {
      name: '光源类型',
      control: { type: 'select' },
      options: ['none', 'hemispheric', 'point', 'directional', 'spot'],
      description:
        '切换场景里唯一的活动光源。none 销毁所有光源（受光材质全黑）；四种光源按各自构造新建并替换旧光源。',
    },
    intensity: {
      name: '强度 intensity',
      control: { type: 'range', min: 0, max: 3, step: 0.05 },
      description:
        '写入 light.intensity（默认 1）。四种光源共用此属性；0 时光照贡献归零。Point/Spot 的距离衰减还受 range 限制。',
    },
  },
  render: renderLights,
  parameters: storySource(exampleSource),
};
