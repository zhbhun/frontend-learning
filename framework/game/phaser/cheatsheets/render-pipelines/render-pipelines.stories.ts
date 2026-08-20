import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import fxLabSource from './fx-lab.ts?raw';
import renderEventsSource from './render-events-lab.ts?raw';
import shaderLabSource from './shader-lab.ts?raw';
import customFilterSource from './custom-filter-lab.ts?raw';
import {
  createFxLab,
  type FxInstance,
  type FxParams,
  type FxSnapshot,
} from './fx-lab';
import {
  createRenderEventsLab,
  type RenderEventsInstance,
  type RenderEventsParams,
  type RenderEventsSnapshot,
} from './render-events-lab';
import {
  createShaderLab,
  type ShaderInstance,
  type ShaderParams,
  type ShaderSnapshot,
} from './shader-lab';
import {
  createCustomFilterLab,
  type CustomFilterInstance,
  type CustomFilterParams,
  type CustomFilterSnapshot,
} from './custom-filter-lab';

function filterLines(filters: FxSnapshot['cameraFilters']): string {
  if (filters.length === 0) {
    return '—';
  }
  return filters
    .map((f) => `${f.scope}.${f.className}(${f.params})`)
    .join(' · ');
}

const renderFxLab = canvasStory({
  create: createFxLab,
  apply(instance: FxInstance, args: FxParams) {
    instance.applyParams(args);
  },
  readout(snapshot: FxSnapshot) {
    return [
      ['渲染器', snapshot.rendererType],
      ['camera.filters', filterLines(snapshot.cameraFilters)],
      [
        '对象 filters',
        snapshot.objectFiltersEnabled
          ? filterLines(snapshot.objectFilters)
          : '未启用(enableFilters() 后才有)',
      ],
      ['willRenderFilters', String(snapshot.willRender)],
      ['实际生效参数', snapshot.appliedStrength],
      ['演示对象角度', `${snapshot.angle}°`],
    ];
  },
  captions: [
    '切换 target:camera 时四角参照物与背景一起被滤镜;object 只滤镜中间演示对象',
    'rotate 开启 + effect=blur:internal 的模糊随对象转 45°,external 的模糊保持水平',
  ],
});

const renderEventsLab = canvasStory({
  create: createRenderEventsLab,
  apply(instance: RenderEventsInstance, args: RenderEventsParams) {
    instance.applyParams(args);
  },
  readout(snapshot: RenderEventsSnapshot) {
    return [
      ...snapshot.gameEvents.map(
        (e): [string, string] => [
          `game:${e.name}`,
          `${e.total}(≈${e.perSecond}/s)`,
        ],
      ),
      ...snapshot.rendererEvents.map(
        (e): [string, string] => [
          `renderer:${e.name}`,
          `${e.total}(≈${e.perSecond}/s)`,
        ],
      ),
      ['摄像机数量', `${snapshot.cameraCount} 台(RENDER 每台一次)`],
      ['已运行', `${snapshot.elapsedSeconds}s(离屏暂停时停走)`],
    ];
  },
  captions: [
    '五个 game 级事件一帧一轮等速增长;renderer:render 与摄像机数量同步',
    '打开第二台摄像机后对比 renderer:render 与 game:prerender 的计数差',
  ],
});

const renderShaderLab = canvasStory({
  create: createShaderLab,
  apply(instance: ShaderInstance, args: ShaderParams) {
    instance.applyParams(args);
  },
  readout(snapshot: ShaderSnapshot) {
    return [
      ['Shader 配置名', snapshot.name],
      ['renderToTexture', String(snapshot.renderToTexture)],
      ['textures 数', `${snapshot.textureCount} 张(texmix 用 iChannel0)`],
      ['time uniform', snapshot.time],
      ['speed 倍速', String(snapshot.speed)],
    ];
  },
  captions: [
    'texmix 预设采样 iChannel0(角上小图是同一张纹理的普通 Image)',
    '拖 speed:time uniform 加速推进,setupUniforms 每次渲染都会执行',
  ],
});

const renderCustomFilterLab = canvasStory({
  create: createCustomFilterLab,
  apply(instance: CustomFilterInstance, args: CustomFilterParams) {
    instance.applyParams(args);
  },
  readout(snapshot: CustomFilterSnapshot) {
    return [
      ['renderNodes.hasNode', String(snapshot.nodeRegistered)],
      ['挂载点', snapshot.holder],
      ['Controller.renderNode', snapshot.renderNodeName],
      ['intensity uniform', snapshot.intensity],
      ['lineDensity uniform', snapshot.lineDensity],
      ['列表长度', String(snapshot.listLength)],
    ];
  },
  captions: [
    'on 关闭再打开:滤镜从列表移除/重新加入,画面扫描线消失与恢复',
    '拖 lineDensity:Controller 属性热调,setupUniforms 每帧读取无需重建',
  ],
});

/** 四个 story 的参数并集,为各 story 的 args / argTypes 提供类型锚点。 */
interface RenderPipelinesArgs
  extends FxParams,
    RenderEventsParams,
    ShaderParams,
    CustomFilterParams {}

const meta: Meta<RenderPipelinesArgs> = {
  id: 'render-pipelines',
  title: '进阶/渲染管线',
  tags: ['!dev'],
  render: renderFxLab,
};

export default meta;

type Story = StoryObj<RenderPipelinesArgs>;

export const FxLab: Story = {
  args: {
    target: 'camera',
    scope: 'internal',
    effect: 'glow',
    strength: 4,
    color: '#66e2ff',
    rotate: false,
  },
  argTypes: {
    target: {
      name: '挂载目标',
      description:
        'camera = camera.filters.internal/external(滤镜整台摄像机画面);object = 演示对象 enableFilters() 后的滤镜列表(只滤镜这一个对象)。',
      options: ['camera', 'object'] as FxParams['target'][],
      control: { type: 'inline-radio' },
    },
    scope: {
      name: '滤镜列表',
      description:
        'internal = 对象/摄像机变换前应用(随对象旋转);external = 变换后应用(通常全屏,更贵)。',
      options: ['internal', 'external'] as FxParams['scope'][],
      control: { type: 'inline-radio' },
    },
    effect: {
      name: '特效',
      description: 'off 清空列表;glow/blur/shadow 用 addGlow/addBlur/addShadow 创建滤镜实例。',
      options: ['off', 'glow', 'blur', 'shadow'] as FxParams['effect'][],
      control: { type: 'select' },
    },
    strength: {
      name: '强度',
      description:
        '热调滤镜实例属性:glow→outerStrength(默认 4)、blur→strength(默认 1)、shadow→intensity(默认 1)。',
      control: { type: 'range', min: 0, max: 10, step: 0.5 },
    },
    color: {
      name: 'glow/shadow 颜色',
      description: '改 Glow.color / 传给 Shadow 的 color;blur 不用颜色(白色为中性)。',
      control: { type: 'color' },
    },
    rotate: {
      name: '演示对象旋转 45°',
      description: '配合 blur 观察 internal/external 的方向差:internal 模糊随之倾斜,external 保持水平。',
      control: { type: 'boolean' },
    },
  },
  render: renderFxLab,
  parameters: storySource(fxLabSource),
};

export const RenderEventsLab: Story = {
  args: { secondCamera: false },
  argTypes: {
    secondCamera: {
      name: '第二台摄像机(画中画)',
      description:
        'cameras.add 小视口后,renderer 的 RENDER 事件每帧触发两次,game 级事件仍一次。',
      control: { type: 'boolean' },
    },
  },
  render: renderEventsLab,
  parameters: storySource(renderEventsSource),
};

export const ShaderLab: Story = {
  args: { preset: 'plasma', speed: 1 },
  argTypes: {
    preset: {
      name: 'shader 预设',
      description:
        'plasma = 纯程序化 fragment(只靠 time + outTexCoord);texmix = 采样 iChannel0 纹理并扭曲 uv。',
      options: ['plasma', 'texmix'] as ShaderParams['preset'][],
      control: { type: 'inline-radio' },
    },
    speed: {
      name: 'time 倍速',
      description: 'setupUniforms 每次渲染写入 time uniform;倍速改变动画快慢。',
      control: { type: 'range', min: 0, max: 4, step: 0.25 },
    },
  },
  render: renderShaderLab,
  parameters: storySource(shaderLabSource),
};

export const CustomFilterLab: Story = {
  args: { target: 'object', on: true, intensity: 0.6, lineDensity: 120 },
  argTypes: {
    target: {
      name: '挂载目标',
      description:
        'object = 演示对象 filters.internal(Controller 传 filterCamera);camera = 主摄像机 filters.internal(传摄像机自身)。',
      options: ['object', 'camera'] as CustomFilterParams['target'][],
      control: { type: 'inline-radio' },
    },
    on: {
      name: '应用滤镜',
      description: 'off 从列表移除滤镜;on 重新 add(渲染节点注册是幂等的)。',
      control: { type: 'boolean' },
    },
    intensity: {
      name: '扫描线强度',
      description: 'ScanlinesController.intensity,setupUniforms 每帧读取写入 shader。',
      control: { type: 'range', min: 0, max: 1, step: 0.05 },
    },
    lineDensity: {
      name: '扫描线密度',
      description: '每屏线数;热调立即生效,不重建 shader。',
      control: { type: 'range', min: 40, max: 320, step: 20 },
    },
  },
  render: renderCustomFilterLab,
  parameters: storySource(customFilterSource),
};

