import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import tweenLabSource from './tween-lab.ts?raw';
import tweenControlsSource from './tween-controls.ts?raw';
import tweenChainSource from './tween-chain.ts?raw';
import {
  createTweenLab,
  type TweenLabInstance,
  type TweenLabParams,
  type TweenLabSnapshot,
} from './tween-lab';
import {
  createTweenControls,
  type TweenControlsInstance,
  type TweenControlsParams,
  type TweenControlsSnapshot,
} from './tween-controls';
import {
  createTweenChain,
  type TweenChainInstance,
  type TweenChainParams,
  type TweenChainSnapshot,
} from './tween-chain';

/** 数值读数统一取一位小数,整数省去小数位;百分比取一位小数。 */
function num(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

const renderTweenLab = canvasStory({
  create: createTweenLab,
  apply(instance: TweenLabInstance, args: TweenLabParams) {
    instance.applyTweens(args);
  },
  readout(snapshot: TweenLabSnapshot) {
    return [
      ['补间状态', `${snapshot.state}${snapshot.alive ? '' : '(已销毁)'}`],
      [
        'isPlaying / isPaused',
        `${snapshot.isPlaying} / ${snapshot.isPaused}`,
      ],
      ['isInfinite', snapshot.isInfinite ? 'true(repeat: -1)' : 'false'],
      ['totalProgress / progress', `${pct(snapshot.totalProgress)} / ${pct(snapshot.progress)}`],
      ['elapsed / totalDuration', `${num(snapshot.elapsed)} / ${num(snapshot.totalDuration)} ms`],
      ['目标属性 x 当前值', num(snapshot.x)],
    ];
  },
  captions: ['小球 x: 80 → 640 · 参数变化即重建补间'],
});

const renderTweenControls = canvasStory({
  create: createTweenControls,
  apply(instance: TweenControlsInstance, args: TweenControlsParams) {
    instance.applyPersist(args);
  },
  readout(snapshot: TweenControlsSnapshot) {
    const c = snapshot.counts;
    return [
      ['补间状态', `${snapshot.state}${snapshot.alive ? '' : '(已销毁)'}`],
      ['isPlaying / isPaused', `${snapshot.isPlaying} / ${snapshot.isPaused}`],
      ['persist', snapshot.persist ? 'true(FINISHED 保留)' : 'false(播完销毁)'],
      ['elapsed / totalProgress', `${num(snapshot.elapsed)} ms / ${pct(snapshot.totalProgress)}`],
      ['getTweensOf(ball).length', String(snapshot.tweenCount)],
      [
        '事件计数 start/update',
        `${c.start} / ${c.update}(update 每帧递增)`,
      ],
      [
        '事件计数 repeat/yoyo',
        `${c.repeat} / ${c.yoyo}`,
      ],
      [
        '事件计数 complete/stop/pause/resume',
        `${c.complete} / ${c.stop} / ${c.pause} / ${c.resume}`,
      ],
    ];
  },
  captions: ['单程 2400ms yoyo 无限往返 · 点击按钮即时控制'],
});

const renderTweenChain = canvasStory({
  create: createTweenChain,
  apply(instance: TweenChainInstance, args: TweenChainParams) {
    instance.applyStaggerGap(args);
  },
  readout(snapshot: TweenChainSnapshot) {
    return [
      [
        'chain 当前子步 / 总步数',
        `${snapshot.chainStep} / ${snapshot.chainSteps}`,
      ],
      ['当前子步进度', pct(snapshot.chainStepProgress)],
      ['当前子步插值属性', snapshot.chainStepKeys],
      ['getTweensOf(左球).length', String(snapshot.chainTweenCount)],
      ['getTweensOf(圆点).length', String(snapshot.staggerTweenCount)],
      ['stagger delay 跨度', `${num(snapshot.staggerSpan)} ms(首末目标差)`],
    ];
  },
  captions: ['左:chain 三步串行循环 · 右:一条 tween + stagger 管五目标'],
});

/** 三个 story 的参数并集,为各 story 的 args / argTypes 提供类型锚点。 */
interface TweensArgs extends TweenLabParams, TweenControlsParams, TweenChainParams {}

const meta: Meta<TweensArgs> = {
  id: 'tweens',
  title: '资源与显示/补间',
  tags: ['!dev'],
  // 默认 render,同时为每个 story 的 args 提供类型锚点;各 story 覆盖为自己的 render
  render: renderTweenLab,
};

export default meta;

type Story = StoryObj<TweensArgs>;

export const TweenLab: Story = {
  args: {
    duration: 1200,
    delay: 0,
    repeat: 0,
    yoyo: false,
    hold: 0,
    repeatDelay: 0,
    ease: 'Linear',
    paused: false,
  },
  argTypes: {
    duration: {
      name: '时长(ms)',
      description: 'duration:单程播放毫秒数,不含 delay / repeat / hold。',
      control: { type: 'range', min: 300, max: 3000, step: 100 },
    },
    delay: {
      name: '延迟(ms)',
      description: 'delay:启动前等待;期间 totalProgress 停在 0,不计入 totalDuration。',
      control: { type: 'range', min: 0, max: 1500, step: 250 },
    },
    repeat: {
      name: '重复次数',
      description: 'repeat:属性级重复;-1 无限(isInfinite,onComplete 永不触发)。',
      control: { type: 'range', min: -1, max: 3, step: 1 },
    },
    yoyo: {
      name: '往返',
      description: 'yoyo:到终点后按同 duration 折返,totalDuration 翻倍。',
      control: { type: 'boolean' },
    },
    hold: {
      name: '终点停留(ms)',
      description: 'hold:到达终点后、yoyo / repeat 换向前 的停留。',
      control: { type: 'range', min: 0, max: 1000, step: 250 },
    },
    repeatDelay: {
      name: '重复间隔(ms)',
      description: 'repeatDelay:两次 repeat 之间的等待,需要 repeat > 0 才可见。',
      control: { type: 'range', min: 0, max: 1000, step: 250 },
    },
    ease: {
      name: '缓动',
      description: "ease:只改时间→进度映射,不改时长;曲线族见 2.3.3。默认 'Power0' 等于 Linear。",
      control: { type: 'select', options: ['Linear', 'Sine.easeInOut'] as const },
    },
    paused: {
      name: '暂停创建',
      description: 'paused:true 以暂停状态创建(isPaused 为 true),需 play() 启动;关闭后重建为播放。',
      control: { type: 'boolean' },
    },
  },
  render: renderTweenLab,
  parameters: storySource(tweenLabSource),
};

export const PlaybackConsole: Story = {
  args: {
    persist: false,
  },
  argTypes: {
    persist: {
      name: 'persist 保留补间',
      description: 'true:播完停在 FINISHED 可重播;false:播完自动销毁。切换即重建补间。',
      control: { type: 'boolean' },
    },
  },
  render: renderTweenControls,
  parameters: storySource(tweenControlsSource),
};

export const ChainAndStagger: Story = {
  args: {
    staggerGap: 150,
  },
  argTypes: {
    staggerGap: {
      name: '错开间隔(ms)',
      description: 'this.tweens.stagger(gap):五个目标 delay 依次错开;0 表示同时启动。',
      control: { type: 'range', min: 0, max: 400, step: 50 },
    },
  },
  render: renderTweenChain,
  parameters: storySource(tweenChainSource),
};
