import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import curveSource from './curve-gallery.ts?raw';
import steppedSource from './stepped-custom.ts?raw';
import {
  createCurveGallery,
  FAMILY_LABELS,
  VARIANT_LABELS,
  type CurveInstance,
  type CurveSnapshot,
  type EaseVariant,
  type FamilyKey,
} from './curve-gallery';
import {
  createStepCustom,
  STEP_MODE_LABELS,
  type StepInstance,
  type StepSnapshot,
  type StepMode,
} from './stepped-custom';

/** 所有 Story 共用的可选输入;各 Story 只消费自己声明的子集 */
interface EasingArgs {
  easeFamily?: FamilyKey;
  easeVariant?: EaseVariant;
  duration?: number;
  stepMode?: StepMode;
  steps?: number;
}

const renderCurve = canvasStory({
  create: createCurveGallery,
  apply(instance: CurveInstance, args: EasingArgs) {
    instance.update({
      family: args.easeFamily ?? 'Cubic',
      variant: args.easeVariant ?? 'easeOut',
      duration: args.duration ?? 1200,
    });
  },
  readout(snapshot: CurveSnapshot) {
    return [
      ['缓动名称', snapshot.easeName],
      ['解析到', snapshot.easePath],
      ['当前 t', snapshot.t.toFixed(3)],
      ['缓动值 f(t)', snapshot.eased.toFixed(3)],
      ['时长', `${snapshot.duration} ms`],
    ];
  },
  captions: [
    '左:当前曲线 f(t) | 右:同一缓动驱动的四条轨道',
    '出框的曲线段 = Back/Elastic 真实的越界',
  ],
});

const renderStepped = canvasStory({
  create: createStepCustom,
  apply(instance: StepInstance, args: EasingArgs) {
    instance.update({
      mode: args.stepMode ?? 'stepped',
      steps: args.steps ?? 4,
    });
  },
  readout(snapshot: StepSnapshot) {
    return [
      ['当前模式', snapshot.mode],
      ['ease 写法', snapshot.easeExpr],
      ['当前 t', snapshot.t.toFixed(3)],
      ['缓动值 f(t)', snapshot.eased.toFixed(3)],
      ['所在档', snapshot.stepNote],
    ];
  },
  captions: [
    'Stepped 的跳变发生在每格开头',
    '自定义函数两端满足 f(0)=0、f(1)=1',
  ],
});

const meta: Meta<EasingArgs> = {
  id: 'easing',
  title: '资源与显示/缓动',
  tags: ['!dev'],
  // 默认 render,同时为每个 story 的 args 提供类型锚点;各 story 覆盖为自己的 render
  render: renderCurve,
};

export default meta;

type Story = StoryObj<EasingArgs>;

export const CurveGallery: Story = {
  args: {
    easeFamily: 'Cubic',
    easeVariant: 'easeOut',
    duration: 1200,
  },
  argTypes: {
    easeFamily: {
      name: '缓动家族',
      description:
        '切换左侧曲线与四条轨道的共同缓动;字符串短名与命名空间全名的对照见 readout「解析到」。',
      control: { type: 'radio' },
      options: Object.keys(FAMILY_LABELS),
      labels: FAMILY_LABELS as Record<string, string>,
    },
    easeVariant: {
      name: '变体',
      description:
        'easeIn 慢起快收 / easeInOut 两端缓 / easeOut 快起慢收;Linear 无变体,切换被忽略。',
      control: { type: 'radio' },
      options: Object.keys(VARIANT_LABELS),
      labels: VARIANT_LABELS as Record<string, string>,
    },
    duration: {
      name: '时长',
      description: 'tween 的 duration:只改走完曲线的速度,不改曲线形状。',
      control: { type: 'range', min: 400, max: 3000, step: 100 },
    },
  },
  parameters: storySource(curveSource),
  render: renderCurve,
};

export const SteppedCustom: Story = {
  args: {
    stepMode: 'stepped',
    steps: 4,
  },
  argTypes: {
    stepMode: {
      name: '模式',
      description:
        "stepped 走 ease: 'Stepped' + easeParams;custom 直接传自写函数;linear 匀速参照。",
      control: { type: 'radio' },
      options: Object.keys(STEP_MODE_LABELS),
      labels: STEP_MODE_LABELS as Record<string, string>,
    },
    steps: {
      name: '阶梯数',
      description: 'Stepped 的 steps 档数,经 easeParams: [steps] 转发;1 时一步到底。',
      control: { type: 'range', min: 1, max: 10, step: 1 },
    },
  },
  parameters: storySource(steppedSource),
  render: renderStepped,
};
