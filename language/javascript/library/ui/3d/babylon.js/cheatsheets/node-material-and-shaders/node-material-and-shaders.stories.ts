import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createShaderPlayground,
  type ShaderPlaygroundInstance,
  type ShaderPlaygroundSnapshot,
} from './example';

interface ShaderArgs {
  speed: number;
  frequency: number;
  colorPreset: string;
}

const renderShader = canvasStory({
  create: createShaderPlayground,
  apply(instance: ShaderPlaygroundInstance, args: ShaderArgs) {
    instance.update(args);
  },
  readout(snapshot: ShaderPlaygroundSnapshot) {
    return [
      ['材质类型', snapshot.materialType],
      ['uTime', `${snapshot.elapsed.toFixed(1)} s`],
      ['uSpeed', snapshot.speed.toFixed(2)],
      ['uFrequency', snapshot.frequency.toFixed(1)],
      ['色对预设', snapshot.colorPreset],
      ['uColorA', snapshot.colorA],
      ['uColorB', snapshot.colorB],
    ];
  },
});

export default {
  id: 'node-material-and-shaders',
  title: '渲染进阶/Node Material 与着色器',
  tags: ['!dev'],
};

export const Shader = {
  name: 'ShaderMaterial 波纹',
  args: {
    speed: 1,
    frequency: 5,
    colorPreset: 'warm',
  },
  argTypes: {
    speed: {
      name: '时间倍率 uSpeed',
      control: { type: 'range', min: 0, max: 3, step: 0.1 },
      description:
        '每帧 setFloat 上传到 uniform uSpeed，控制波纹流动快慢；为 0 时图案冻结，但 uTime 仍在累加。',
    },
    frequency: {
      name: '波纹密度 uFrequency',
      control: { type: 'range', min: 1, max: 16, step: 0.5 },
      description:
        '每帧 setFloat 上传到 uniform uFrequency；越大波纹越密。',
    },
    colorPreset: {
      name: '色对预设',
      control: { type: 'select' },
      options: ['warm', 'cool', 'mono'],
      description:
        '切换 warm/cool/mono 三组色对，由 setColor3 写入 uColorA / uColorB 两个 vec3 uniform。',
    },
  },
  render: renderShader,
  parameters: storySource(exampleSource),
};
