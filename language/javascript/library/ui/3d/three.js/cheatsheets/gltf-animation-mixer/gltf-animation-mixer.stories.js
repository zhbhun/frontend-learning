import * as THREE from 'three';

import playbackSource from './animation-playback.js?raw';
import mixingSource from './animation-mixing.js?raw';
import utilsSource from './animation-example-utils.js?raw';

import { sceneStory } from '../../assets/story-canvas.js';
import { sceneSource } from '../../assets/story-source.js';
import { playbackExample } from './animation-playback.js';
import { mixingExample } from './animation-mixing.js';

export default {
  id: 'gltf-animation-mixer',
  title: '核心系统/时间与动画/动画',
  tags: ['!dev']
};

function sourceBundle(memberSource) {
  return [utilsSource, memberSource].join('\n\n');
}

export const PlaybackControl = {
  name: '播放控制',
  args: {
    clip: 'Idle',
    playing: true,
    timeScale: 1,
    loop: THREE.LoopRepeat,
    repetitions: Infinity,
    clampWhenFinished: true
  },
  argTypes: {
    clip: {
      name: 'clip',
      control: 'inline-radio',
      options: ['Idle', 'Wave', 'Jump'],
      labels: { Idle: 'Idle', Wave: 'Wave', Jump: 'Jump' }
    },
    playing: {
      name: 'playing',
      control: 'boolean'
    },
    timeScale: {
      name: 'timeScale',
      control: { type: 'range', min: -1, max: 2, step: 0.1 }
    },
    loop: {
      name: 'loop',
      control: 'inline-radio',
      options: [THREE.LoopRepeat, THREE.LoopOnce, THREE.LoopPingPong],
      labels: {
        [THREE.LoopRepeat]: 'LoopRepeat',
        [THREE.LoopOnce]: 'LoopOnce',
        [THREE.LoopPingPong]: 'LoopPingPong'
      }
    },
    repetitions: {
      name: 'repetitions',
      control: { type: 'range', min: 1, max: 6, step: 1 }
    },
    clampWhenFinished: {
      name: 'clampWhenFinished',
      control: 'boolean'
    }
  },
  render: sceneStory(playbackExample),
  parameters: sceneSource(sourceBundle(playbackSource))
};

export const WeightBlend = {
  name: '权重混合',
  args: {
    blend: 0
  },
  argTypes: {
    blend: {
      name: 'blend（Idle → Wave）',
      control: { type: 'range', min: 0, max: 1, step: 0.01 }
    }
  },
  render: sceneStory(mixingExample),
  parameters: sceneSource(sourceBundle(mixingSource))
};
