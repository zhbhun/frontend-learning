import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import frameSourcesSource from './frame-sources.ts?raw';
import playbackControlsSource from './playback-controls.ts?raw';
import animationEventsSource from './animation-events.ts?raw';
import {
  createFrameSources,
  type FrameSourcesInstance,
  type FrameSourcesSnapshot,
} from './frame-sources';
import {
  createPlaybackLab,
  type PlaybackInstance,
  type PlaybackParams,
  type PlaybackSnapshot,
} from './playback-controls';
import {
  createEventsLab,
  type EventsInstance,
  type EventsSnapshot,
} from './animation-events';

const renderFrameSources = canvasStory({
  create: createFrameSources,
  apply(instance: FrameSourcesInstance, args: { playing: boolean }) {
    instance.setPlayback(args.playing);
  },
  readout(snapshot: FrameSourcesSnapshot) {
    return [
      ['exists(fill-by-index / fill-by-name)', `${snapshot.sheetAnimExists} / ${snapshot.atlasAnimExists}`],
      ['雪碧图帧序号 textureFrame', snapshot.indexTextureFrame],
      ['图集帧名 textureFrame', snapshot.nameTextureFrame],
      ['动画内 index(左/右)', snapshot.frameIndexInAnim],
      ['getTotalFrames(左/右)', snapshot.totalFrames],
      ['生成帧数', `${snapshot.indexFrames} / ${snapshot.nameFrames}`],
      ['isPlaying', snapshot.playing ? 'true' : 'false'],
    ];
  },
  captions: [
    '左:generateFrameNumbers 按序号取帧;右:generateFrameNames 按名字取帧',
    '同一张 PNG,两条加载通路,序列逐帧对齐',
  ],
});

const renderPlaybackLab = canvasStory({
  create: createPlaybackLab,
  apply(instance: PlaybackInstance, args: PlaybackParams) {
    instance.applyPlayback(args);
  },
  readout(snapshot: PlaybackSnapshot) {
    return [
      ['isPlaying / isPaused', `${snapshot.isPlaying} / ${snapshot.isPaused}`],
      ['当前动画 getName()', snapshot.currentAnim],
      ['当前帧 textureFrame(雪碧图序号)', snapshot.textureFrame],
      ['动画内 index(1 基)', snapshot.indexInAnim],
      ['getTotalFrames', snapshot.totalFrames],
      ['生效参数副本', snapshot.effective],
      ['msPerFrame(ms)', snapshot.msPerFrame],
      ['forward', snapshot.forward],
      ['animationupdate 计数', snapshot.updateCount],
      ['animationrepeat 计数', snapshot.repeatCount],
      ['剩余 repeatCounter', snapshot.repeatLeft],
    ];
  },
  captions: ['参数变化经 play({ key, … }) 重新加载才生效', '暂停看 isPaused,停止两者皆 false'],
});

const renderEventsLab = canvasStory({
  create: createEventsLab,
  apply(
    instance: EventsInstance,
    args: { playing: boolean; removed: boolean },
  ) {
    instance.setRemoved(args.removed);
    instance.setPlaying(args.playing);
  },
  readout(snapshot: EventsSnapshot) {
    return [
      ['事件计数', snapshot.counts],
      ['最近事件', snapshot.lastEvent],
      ['当前动画', snapshot.currentAnim],
      ['nextAnim(链上待接续)', snapshot.nextAnim],
      ['exists(sweep-once)', snapshot.onceExists],
      ['anims.paused(管理器)', snapshot.managerPaused],
      ['当前帧 textureFrame', snapshot.frameNow],
    ];
  },
  captions: ['complete 只在有限 repeat 时触发;stop 触发 animationstop', '移除全局动画后 play 同名 key 只警告不播放'],
});

/** 三个 story 的参数并集,为各 story 的 args / argTypes 提供类型锚点。 */
interface FrameAnimationsArgs extends PlaybackParams {
  removed: boolean;
}

const meta: Meta<FrameAnimationsArgs> = {
  id: 'frame-animations',
  title: '资源与显示/帧动画',
  tags: ['!dev'],
  // 默认 render,同时为每个 story 的 args 提供类型锚点;各 story 覆盖为自己的 render
  render: renderPlaybackLab,
};

export default meta;

type Story = StoryObj<FrameAnimationsArgs>;

export const PlaybackLab: Story = {
  args: {
    playing: true,
    paused: false,
    reverse: false,
    frameRate: 6,
    repeat: -1,
    yoyo: false,
    removed: false,
  },
  argTypes: {
    playing: {
      name: '播放',
      description: '开:play/playReverse 加载动画;关:stop 停在当前帧(animationstop)。',
      control: { type: 'boolean' },
    },
    paused: {
      name: '暂停',
      description: '开:anims.pause(),isPlaying 变 false 且 isPaused 为 true;关:resume() 继续。',
      control: { type: 'boolean' },
    },
    reverse: {
      name: '反向',
      description: '开:playReverse 从尾帧倒放(forward 为 false);关:play 正放。',
      control: { type: 'boolean' },
    },
    frameRate: {
      name: '帧率(fps)',
      description: 'PlayAnimationConfig.frameRate:每秒推进帧数;msPerFrame 读数随之变化。',
      control: { type: 'range', min: 1, max: 12, step: 1 },
    },
    repeat: {
      name: '重复次数',
      description: 'PlayAnimationConfig.repeat:首播之外的额外重播次数;-1 无限,永不 complete。',
      control: { type: 'select' },
      options: [-1, 0, 1, 2],
      labels: {
        '-1': '-1(无限循环)',
        '0': '0(只播一遍)',
        '1': '1(共两遍)',
        '2': '2(共三遍)',
      },
    },
    yoyo: {
      name: '往返(yoyo)',
      description: '到尾帧后倒放回首帧再算一轮;打开后观察 forward 读数来回翻转。',
      control: { type: 'boolean' },
    },
  },
  render: renderPlaybackLab,
  parameters: storySource(playbackControlsSource),
};

export const FrameSources: Story = {
  args: {
    playing: true,
    paused: false,
    reverse: false,
    frameRate: 6,
    repeat: -1,
    yoyo: false,
    removed: false,
  },
  argTypes: {
    playing: {
      name: '播放',
      description: '开:两个动画从头同步播放;关:双双停在当前帧。',
      control: { type: 'boolean' },
    },
  },
  render: renderFrameSources,
  parameters: storySource(frameSourcesSource),
};

export const EventsLab: Story = {
  args: {
    playing: false,
    paused: false,
    reverse: false,
    frameRate: 6,
    repeat: -1,
    yoyo: false,
    removed: false,
  },
  argTypes: {
    playing: {
      name: '播放有限动画',
      description: '开:play(sweep-once) 并 chain(fill-loop),complete 后自动接续循环;关:stop。',
      control: { type: 'boolean' },
    },
    removed: {
      name: '移除全局动画',
      description: '开:anims.remove(sweep-once),exists 变 false;关:重新 create。',
      control: { type: 'boolean' },
    },
  },
  render: renderEventsLab,
  parameters: storySource(animationEventsSource),
};
