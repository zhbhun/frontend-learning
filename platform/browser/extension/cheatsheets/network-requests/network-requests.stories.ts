import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import ruleMatchSource from './rule-match.ts?raw';
import headerModifySource from './header-modify.ts?raw';
import {
  createRuleMatchExample,
  type RuleMatchInstance,
  type RuleMatchOptions,
  type RuleMatchSnapshot,
} from './rule-match';
import {
  createHeaderModifyExample,
  type HeaderModifyInstance,
  type HeaderModifyOptions,
  type HeaderModifySnapshot,
} from './header-modify';

interface RuleMatchArgs {
  request: string;
  scenario: string;
}

interface HeaderModifyArgs {
  header: string;
  operationA: string;
  operationB: string;
}

const renderRuleMatch = canvasStory({
  create: createRuleMatchExample,
  apply(instance: RuleMatchInstance, args: RuleMatchArgs) {
    instance.update({
      request: args.request,
      scenario: args.scenario,
    });
  },
  readout(snapshot: RuleMatchSnapshot) {
    return [
      ['目标请求', snapshot.request],
      ['资源类型 · 发起者', snapshot.resource],
      ['命中规则', snapshot.matched],
      ['排序结果', snapshot.ordering],
      ['请求结果', snapshot.outcome],
    ];
  },
  captions: [
    '请求与规则匹配（模拟）',
    '先 condition 命中，再按优先级排序',
  ],
});

const renderHeaderModify = canvasStory({
  create: createHeaderModifyExample,
  apply(instance: HeaderModifyInstance, args: HeaderModifyArgs) {
    instance.update({
      header: args.header,
      operationA: args.operationA,
      operationB: args.operationB,
    });
  },
  readout(snapshot: HeaderModifySnapshot) {
    return [
      ['请求头', snapshot.header],
      ['规则 A（priority 2）', snapshot.ruleA],
      ['规则 B（priority 1）', snapshot.ruleB],
      ['最终请求头', snapshot.finalHeader],
      ['交互结论', snapshot.note],
    ];
  },
  captions: [
    '请求头改写演算（modifyHeaders）',
    '高优先级规则先应用，低优先级随后',
  ],
});

const meta = {
  id: 'network-requests',
  title: '网页与数据/网络请求控制',
  tags: ['!dev'],
} satisfies Meta;

export default meta;

export const RuleMatch: StoryObj<RuleMatchArgs> = {
  args: {
    request: 'https://cdn.example.com/ads/banner.js',
    scenario: 'block 优先（默认）',
  },
  argTypes: {
    request: {
      name: '请求',
      description: '被评估的网络请求，含 URL、资源类型与发起页面。',
      control: { type: 'select' },
      options: [
        'https://cdn.example.com/ads/banner.js',
        'https://analytics.other.net/collect',
        'http://blog.example.com/post/1',
        'https://static.example.com/logo.png',
      ],
    },
    scenario: {
      name: '场景',
      description: '四条规则的启用状态与优先级预设，模拟同一组规则的不同配置。',
      control: { type: 'select' },
      options: [
        'block 优先（默认）',
        'allow 更高优先级',
        '同优先级 allow 对 block',
        '只留 redirect / upgradeScheme',
      ],
    },
  },
  render: renderRuleMatch,
  parameters: storySource(ruleMatchSource),
};

export const HeaderModify: StoryObj<HeaderModifyArgs> = {
  args: {
    header: 'cookie',
    operationA: 'append',
    operationB: 'set',
  },
  argTypes: {
    header: {
      name: '请求头',
      description:
        '两条规则共同改写的请求头；x-custom-token 不在 append 白名单内。',
      control: { type: 'select' },
      options: ['cookie', 'user-agent', 'x-custom-token'],
    },
    operationA: {
      name: '规则 A 操作',
      description: 'priority 2 的 modifyHeaders 规则对该头执行的操作。',
      control: { type: 'select' },
      options: ['none', 'append', 'set', 'remove'],
    },
    operationB: {
      name: '规则 B 操作',
      description: 'priority 1 的 modifyHeaders 规则对该头执行的操作。',
      control: { type: 'select' },
      options: ['none', 'append', 'set', 'remove'],
    },
  },
  render: renderHeaderModify,
  parameters: storySource(headerModifySource),
};
