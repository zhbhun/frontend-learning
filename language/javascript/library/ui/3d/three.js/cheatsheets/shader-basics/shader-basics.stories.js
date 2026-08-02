import shaderRippleSource from './shader-ripple.js?raw';
import sharedSceneSource from '../../assets/shared-scene.js?raw';

import { sceneStory } from '../../assets/story-canvas.js';
import { sceneSource } from '../../assets/story-source.js';
import { shaderRippleExample } from './shader-ripple.js';

export default {
  id: 'shader-basics',
  title: '进阶分支/渲染技术/Shader',
  tags: ['!dev']
};

function sourceBundle(memberSource) {
  return [sharedSceneSource, memberSource].join('\n\n');
}

export const ShaderRipple = {
  name: 'ShaderMaterial 波纹',
  args: {
    colorA: '#3d73d9',
    colorB: '#f0a432',
    frequency: 16,
    amplitude: 0.85,
    animate: true
  },
  argTypes: {
    colorA: {
      name: 'uColorA',
      control: 'color',
      description:
        '波纹颜色 A；通过 uniforms.uColorA.value.set() 实时写入 GPU，不需要 material.needsUpdate。'
    },
    colorB: {
      name: 'uColorB',
      control: 'color',
      description: '波纹颜色 B；与 uColorA 在 fragment 里用 mix() 混合。'
    },
    frequency: {
      name: 'uFrequency',
      control: { type: 'range', min: 2, max: 40, step: 1 },
      description: '波纹密度；值越大波纹越密。'
    },
    amplitude: {
      name: 'uAmplitude',
      control: { type: 'range', min: 0, max: 1, step: 0.05 },
      description: '颜色对比度；0 时两色五五开，1 时全范围对比。'
    },
    animate: {
      name: 'animate',
      control: 'boolean',
      description: '是否让 uTime 每帧累加；关闭后画面冻结在当前时间。'
    }
  },
  render: sceneStory(shaderRippleExample),
  parameters: sceneSource(sourceBundle(shaderRippleSource))
};
