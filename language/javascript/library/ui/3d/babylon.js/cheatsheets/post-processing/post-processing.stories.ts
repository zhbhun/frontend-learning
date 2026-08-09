import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createPostProcessingExample,
  type PostProcessingInstance,
  type PostProcessingSnapshot,
} from './example';

interface PostArgs {
  bloom: boolean;
  bloomThreshold: number;
  bloomWeight: number;
  fxaa: boolean;
  depthOfField: boolean;
  focusDistance: number;
  ssao: boolean;
}

const renderPost = canvasStory({
  create: createPostProcessingExample,
  apply(instance: PostProcessingInstance, args: PostArgs) {
    instance.update(args);
  },
  readout(snapshot: PostProcessingSnapshot) {
    return [
      ['Bloom', snapshot.bloom ? '开' : '关'],
      ['bloomThreshold', snapshot.bloomThreshold.toFixed(2)],
      ['bloomWeight', snapshot.bloomWeight.toFixed(2)],
      ['FXAA', snapshot.fxaa ? '开' : '关'],
      ['景深', snapshot.depthOfField ? '开' : '关'],
      ['焦距（场景单位）', snapshot.focusDistance.toFixed(1)],
      ['SSAO', snapshot.ssao ? '开' : '关'],
      ['SSAO 管线', snapshot.ssaoPipeline],
      ['MSAA samples', snapshot.msaa],
      ['FPS', snapshot.fps],
    ];
  },
});

export default {
  id: 'post-processing',
  title: '渲染进阶/后处理',
  tags: ['!dev'],
};

export const Post = {
  name: '后处理',
  args: {
    bloom: true,
    bloomThreshold: 0.9,
    bloomWeight: 0.3,
    fxaa: true,
    depthOfField: false,
    focusDistance: 8,
    ssao: false,
  },
  argTypes: {
    bloom: {
      name: 'Bloom（DefaultRenderingPipeline）',
      control: { type: 'boolean' },
      description:
        '切换 DefaultRenderingPipeline.bloomEnabled（默认 false，构造后手动开）。Bloom 提取亮度高于 bloomThreshold 的像素，模糊后叠加回原图形成光晕。需要构造时 hdr=true（也是默认值）让 >1 的亮度进入渲染目标。',
    },
    bloomThreshold: {
      name: 'bloomThreshold',
      control: { type: 'range', min: 0, max: 2, step: 0.05 },
      description:
        'DefaultRenderingPipeline.bloomThreshold（luma 阈值，默认 0.9）。只有亮度高于此值的像素参与 bloom：调低让中等亮度的盒子也发光，调高只剩灯泡和圆环。只在 bloom=true 时生效，但始终显示当前值。',
    },
    bloomWeight: {
      name: 'bloomWeight',
      control: { type: 'range', min: 0, max: 1.5, step: 0.05 },
      description:
        'DefaultRenderingPipeline.bloomWeight（光晕叠加强度，默认 0.15）。0 等于不叠光晕。越大光晕越亮越散。只在 bloom=true 时生效，但始终显示当前值。',
    },
    fxaa: {
      name: 'FXAA',
      control: { type: 'boolean' },
      description:
        '切换 DefaultRenderingPipeline.fxaaEnabled（默认 false）。FXAA 是全屏抗锯齿，处理速度快、只对几何边缘有效。可与 MSAA（pipeline.samples）叠加；本范例 samples=2，两者互补。',
    },
    depthOfField: {
      name: '景深（DepthOfField）',
      control: { type: 'boolean' },
      description:
        '切换 DefaultRenderingPipeline.depthOfFieldEnabled（默认 false）。开启后按 depthOfField.focusDistance 在焦平面外虚化。focalLength/fStop/focusDistance 挂在 pipeline.depthOfField 子对象上（默认 50 / 1.4 / 2000，单位毫米）。',
    },
    focusDistance: {
      name: '焦距（场景单位）',
      control: { type: 'range', min: 2, max: 16, step: 0.5 },
      description:
        'DefaultRenderingPipeline.depthOfField.focusDistance，按「场景单位」暴露给读者。内部 ×1000 换算成 focusDistance 的真实单位（scene units / 1000，即毫米）。调它观察近处 / 远处盒子交替进入焦内。只在 depthOfField=true 时生效，但始终显示当前值。',
    },
    ssao: {
      name: 'SSAO（独立 SSAO2RenderingPipeline）',
      control: { type: 'boolean' },
      description:
        '切换独立的 SSAO2RenderingPipeline——它不在 DefaultRenderingPipeline 上。开 = new（自动 addPipeline + attachCameras + 启用 geometry/prePass 取深度法线）；关 = dispose（自动 removePipeline + 释放 geometry buffer）。开启后盒子与地面接触处出现接触阴影变暗。SSAO2 与 DefaultRenderingPipeline 是两条并列的后处理管线。',
    },
  },
  render: renderPost,
  parameters: storySource(exampleSource),
};
