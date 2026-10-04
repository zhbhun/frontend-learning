import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import matchSource from './match.ts?raw';
import timingSource from './timing.ts?raw';
import {
  createMatchExample,
  type MatchInstance,
  type MatchOptions,
  type MatchSnapshot,
} from './match';
import {
  createTimingExample,
  type TimingInstance,
  type TimingOptions,
  type TimingSnapshot,
} from './timing';

interface MatchArgs {
  url: string;
  excludePrivate: boolean;
  matchAboutBlank: boolean;
}

interface TimingArgs {
  runAt: string;
}

const renderMatch = canvasStory({
  create: createMatchExample,
  apply(instance: MatchInstance, args: MatchArgs) {
    instance.update({
      url: args.url,
      excludePrivate: args.excludePrivate,
      matchAboutBlank: args.matchAboutBlank,
    });
  },
  readout(snapshot: MatchSnapshot) {
    return [
      ['matches 判定', snapshot.matches],
      ['exclude_matches', snapshot.exclude],
      ['框架规则', snapshot.frameRule],
      ['最终决定', snapshot.decision],
    ];
  },
  captions: ['URL 与注入判定（模拟）', 'matches → exclude_matches → 框架规则'],
});

const renderTiming = canvasStory({
  create: createTimingExample,
  apply(instance: TimingInstance, args: TimingArgs) {
    instance.update({ runAt: args.runAt as TimingOptions['runAt'] });
  },
  readout(snapshot: TimingSnapshot) {
    return [
      ['run_at', snapshot.runAtLabel],
      ['注入时 readyState', snapshot.readyState],
      ['查询 #target', snapshot.targetQuery],
    ];
  },
  captions: ['页面加载时间线（模拟）', '蓝色三角为当前档位注入点'],
});

const meta = {
  id: 'content-scripts',
  title: '网页与数据/Content Scripts',
  tags: ['!dev'],
} satisfies Meta;

export default meta;

export const Match: StoryObj<MatchArgs> = {
  args: {
    url: 'https://example.com/article/42',
    excludePrivate: false,
    matchAboutBlank: false,
  },
  argTypes: {
    url: {
      name: '目标 URL',
      description: '匹配规则的判定对象，含一个父页面为 example.com 的 about:blank 子框架。',
      control: { type: 'select' },
      options: [
        'https://example.com/article/42',
        'https://blog.example.com/post/7',
        'https://example.com/private/note',
        'https://other.com/',
        'about:blank（iframe）',
      ],
    },
    excludePrivate: {
      name: 'exclude_matches',
      description: '追加排除规则 ["https://example.com/private/*"]。',
      control: { type: 'boolean' },
    },
    matchAboutBlank: {
      name: 'match_about_blank',
      description: '是否注入父页面匹配的 about:blank 子框架。',
      control: { type: 'boolean' },
    },
  },
  render: renderMatch,
  parameters: storySource(matchSource),
};

export const Timing: StoryObj<TimingArgs> = {
  args: {
    runAt: 'document_idle',
  },
  argTypes: {
    runAt: {
      name: 'run_at',
      description: 'manifest content_scripts 的注入时机档位。',
      control: { type: 'select' },
      options: ['document_start', 'document_end', 'document_idle'],
    },
  },
  render: renderTiming,
  parameters: storySource(timingSource),
};
