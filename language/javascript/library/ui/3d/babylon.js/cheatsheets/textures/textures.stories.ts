import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createTexturesExample,
  type TexturesInstance,
  type TexturesSnapshot,
} from './example';

interface TexturesArgs {
  wrapU: 'CLAMP' | 'WRAP' | 'MIRROR';
  wrapV: 'CLAMP' | 'WRAP' | 'MIRROR';
  uScale: number;
  vScale: number;
  samplingMode: 'NEAREST' | 'BILINEAR' | 'TRILINEAR';
  invertY: boolean;
}

const renderTextures = canvasStory({
  create: createTexturesExample,
  apply(instance: TexturesInstance, args: TexturesArgs) {
    instance.update(args);
  },
  readout(snapshot: TexturesSnapshot) {
    return [
      ['wrapU', snapshot.wrapU],
      ['wrapV', snapshot.wrapV],
      ['uScale', snapshot.uScale.toFixed(1)],
      ['vScale', snapshot.vScale.toFixed(1)],
      ['samplingMode', snapshot.samplingMode],
      ['invertY', snapshot.invertY ? 'true（默认）' : 'false'],
      ['FPS', snapshot.fps],
    ];
  },
});

export default {
  id: 'textures',
  title: '材质与光照/纹理',
  tags: ['!dev'],
};

export const Textures = {
  name: '纹理采样',
  args: {
    wrapU: 'WRAP',
    wrapV: 'WRAP',
    uScale: 2,
    vScale: 2,
    samplingMode: 'TRILINEAR',
    invertY: true,
  },
  argTypes: {
    wrapU: {
      name: 'wrapU（U 方向包裹）',
      control: { type: 'inline-radio' },
      options: ['CLAMP', 'WRAP', 'MIRROR'],
      description:
        'UV 越出 [0,1] 时 U 方向怎么处理。对应 Texture.CLAMP_ADDRESSMODE / WRAP_ADDRESSMODE（默认）/ MIRROR_ADDRESSMODE。',
    },
    wrapV: {
      name: 'wrapV（V 方向包裹）',
      control: { type: 'inline-radio' },
      options: ['CLAMP', 'WRAP', 'MIRROR'],
      description:
        'UV 越出 [0,1] 时 V 方向怎么处理。常量同 wrapU；U/V 可分别设置。',
    },
    uScale: {
      name: 'uScale（UV 缩放）',
      control: { type: 'range', min: 1, max: 4, step: 0.5 },
      description:
        '纹理对象的 UV 缩放；> 1 时 UV 越界，三种包裹的差异才会显现。同材质上不影响几何顶点 UV。',
    },
    vScale: {
      name: 'vScale（UV 缩放）',
      control: { type: 'range', min: 1, max: 4, step: 0.5 },
      description: 'V 方向缩放，与 uScale 同理。',
    },
    samplingMode: {
      name: 'samplingMode（过滤）',
      control: { type: 'inline-radio' },
      options: ['NEAREST', 'BILINEAR', 'TRILINEAR'],
      description:
        '对应 Texture.NEAREST_SAMPLINGMODE / BILINEAR_SAMPLINGMODE / TRILINEAR_SAMPLINGMODE（默认）。改变后会重建贴图。',
    },
    invertY: {
      name: 'invertY（上传时翻转 Y）',
      control: 'boolean',
      description:
        '默认 true：上传贴图时翻转 Y 轴，匹配「UV 原点在左下、canvas 原点在左上」的差异。关闭后箭头与角标上下翻转。',
    },
  },
  render: renderTextures,
  parameters: storySource(exampleSource),
};
