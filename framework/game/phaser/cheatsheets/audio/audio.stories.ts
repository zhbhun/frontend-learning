import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import soundConsoleSource from './sound-console.ts?raw';
import soundInstancesSource from './sound-instances.ts?raw';
import soundMarkersSource from './sound-markers.ts?raw';
import {
  createSoundConsole,
  type SoundConsoleInstance,
  type SoundConsoleSnapshot,
} from './sound-console';
import {
  createSoundInstances,
  type SoundInstancesInstance,
  type SoundInstancesSnapshot,
} from './sound-instances';
import {
  createSoundMarkers,
  type MarkerMode,
  type SoundMarkersInstance,
  type SoundMarkersSnapshot,
} from './sound-markers';

const renderSoundConsole = canvasStory({
  create: createSoundConsole,
  apply(instance: SoundConsoleInstance, args: AudioArgs) {
    instance.applyParams({
      volume: args.volume ?? 0.8,
      loop: args.loop ?? false,
      rate: args.rate ?? 1,
      detune: args.detune ?? 0,
    });
  },
  readout(snapshot: SoundConsoleSnapshot) {
    return [
      ['状态', snapshot.state],
      ['isPlaying / isPaused', snapshot.isPlaying],
      ['currentTime / totalDuration', `${snapshot.currentTime} / ${snapshot.totalDuration}`],
      ['实际音量(实例 × 管理器)', snapshot.volume],
      ['totalRate(rate × detune 合成)', snapshot.totalRate],
      ['loop', snapshot.loop],
      ['播放 / 完播', snapshot.playCount],
      ['实例事件序列', snapshot.recentEvents],
      ['音频锁', snapshot.locked],
      ['AudioContext.state', snapshot.contextState],
    ];
  },
});

const renderSoundInstances = canvasStory({
  create: createSoundInstances,
  apply(instance: SoundInstancesInstance, args: AudioArgs) {
    instance.applyParams({ burstCount: args.burstCount ?? 3 });
  },
  readout(snapshot: SoundInstancesSnapshot) {
    return [
      ['最近操作', snapshot.lastAction],
      ['批量份数 burstCount', String(snapshot.burstCount)],
      ['ping 活动实例数', snapshot.pingInstances],
      ['正在播放数(getAllPlaying)', snapshot.playingCount],
      ['fire-and-forget 调用累计', String(snapshot.fireCalls)],
      ['同实例重播累计', String(snapshot.samePlays)],
      ['长驻实例状态', snapshot.heldState],
      ['管理器全部实例 getAll().length', snapshot.totalSounds],
    ];
  },
});

const renderSoundMarkers = canvasStory({
  create: createSoundMarkers,
  apply(instance: SoundMarkersInstance, args: AudioArgs) {
    instance.applyParams({ mode: (args.mode as MarkerMode) ?? 'manual' });
  },
  readout(snapshot: SoundMarkersSnapshot) {
    return [
      ['标记来源(模式)', snapshot.mode],
      ['chime 实例标记', snapshot.markers],
      ['currentMarker', snapshot.currentMarker],
      ['duration / totalDuration', snapshot.duration],
      ['currentTime', snapshot.currentTime],
      ['最近操作', snapshot.lastAction],
      ['audioSprite 实例数', snapshot.spriteSounds],
    ];
  },
});

/** 三个 story 的参数并集,为各 story 的 args / argTypes 提供类型锚点。 */
interface AudioArgs {
  volume?: number;
  loop?: boolean;
  rate?: number;
  detune?: number;
  burstCount?: number;
  mode?: MarkerMode;
}

const meta: Meta<AudioArgs> = {
  id: 'audio',
  title: '音频与粒子/音频',
  tags: ['!dev'],
  // 默认 render,同时为每个 story 的 args 提供类型锚点;各 story 覆盖为自己的 render
  render: renderSoundConsole,
};

export default meta;

type Story = StoryObj<AudioArgs>;

export const SoundConsole: Story = {
  args: { volume: 0.8, loop: false, rate: 1, detune: 0 },
  argTypes: {
    volume: {
      name: '实例音量 volume',
      description:
        'sound.volume(0..1),播放中即时生效;实际听到的是实例音量 × 管理器全局音量 this.sound.volume。',
      control: { type: 'range', min: 0, max: 1, step: 0.05 },
    },
    loop: {
      name: '循环 loop',
      description:
        'sound.loop:整段循环;播放中切换在当前这一遍播完后生效(源码 onended 时判定)。',
      control: { type: 'boolean' },
    },
    rate: {
      name: '播放速率 rate',
      description:
        'sound.rate(默认 1):0.5 半速 2.0 双倍速,变速同时变调(映射到 Web Audio playbackRate)。',
      control: { type: 'range', min: 0.5, max: 2, step: 0.1 },
    },
    detune: {
      name: '音分微调 detune',
      description:
        'sound.detune(-1200..1200 音分):1200 音分 = 高一个八度,与 rate 相乘合成 totalRate,同样变速变调。',
      control: { type: 'range', min: -1200, max: 1200, step: 100 },
    },
  },
  parameters: storySource(soundConsoleSource),
  render: renderSoundConsole,
};

export const SoundInstances: Story = {
  args: { burstCount: 3 },
  argTypes: {
    burstCount: {
      name: '批量份数',
      description: '每次点击画布按钮时连续播放/重播的份数(1..6)。',
      control: { type: 'range', min: 1, max: 6, step: 1 },
    },
  },
  parameters: storySource(soundInstancesSource),
  render: renderSoundInstances,
};

export const SoundMarkers: Story = {
  args: { mode: 'manual' },
  argTypes: {
    mode: {
      name: '标记来源',
      description:
        'manual = this.sound.add 后手动 addMarker;sprite = load.audioSprite 的 json spritemap,按钮走 playAudioSprite。',
      control: { type: 'radio' },
      options: ['manual', 'sprite'],
      labels: { manual: '手动 addMarker', sprite: 'audioSprite(json)' },
    },
  },
  parameters: storySource(soundMarkersSource),
  render: renderSoundMarkers,
};
