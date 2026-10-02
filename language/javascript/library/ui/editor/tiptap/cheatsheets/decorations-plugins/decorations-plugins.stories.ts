import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import './demo.css';
import {
  createPluginSearchDemo,
  type PluginSearchArgs,
  type PluginSearchInstance,
  type PluginSearchSnapshot,
} from './plugin-search';
import pluginSearchSource from './plugin-search.ts?raw';
import {
  createSearchDecorationsDemo,
  type SearchDecorationsArgs,
  type SearchDecorationsInstance,
  type SearchDecorationsSnapshot,
} from './search-decorations';
import searchDecorationsSource from './search-decorations.ts?raw';

const searchDecorationsRender = canvasStory({
  create: createSearchDecorationsDemo,
  apply(instance: SearchDecorationsInstance, args: SearchDecorationsArgs) {
    instance.update(args);
  },
  readout(snapshot: SearchDecorationsSnapshot) {
    return [
      ['搜索词', snapshot.term],
      ['三种装饰计数', snapshot.counts],
      ['getHTML 里的装饰痕迹', snapshot.htmlTrace],
    ];
  },
});

const pluginSearchRender = canvasStory({
  create: createPluginSearchDemo,
  apply(instance: PluginSearchInstance, args: PluginSearchArgs) {
    instance.update(args);
  },
  readout(snapshot: PluginSearchSnapshot) {
    return [
      ['插件状态里的搜索词', snapshot.term],
      ['DecorationSet 装饰数', snapshot.decorationCount],
    ];
  },
});

const meta = {
  id: 'decorations-plugins',
  title: '原理与自定义/Decorations 与插件',
  tags: ['!dev'],
} satisfies Meta;

export default meta;

export const SearchDecorations = {
  name: '三种装饰实验台',
  args: {
    term: '装饰',
  },
  argTypes: {
    term: {
      name: '搜索词',
      description: '命中文字加 inline 高亮与 widget 徽章，命中所在块加 node 轮廓',
      control: {
        type: 'text',
      },
    },
  },
  render: searchDecorationsRender,
  parameters: storySource(searchDecorationsSource),
} satisfies StoryObj<SearchDecorationsArgs>;

export const PluginSearch = {
  name: '插件版搜索高亮',
  args: {
    term: '装饰',
  },
  argTypes: {
    term: {
      name: '搜索词',
      description: '经 tr.setMeta 写进插件状态，由 props.decorations 交给视图',
      control: {
        type: 'text',
      },
    },
  },
  render: pluginSearchRender,
  parameters: storySource(pluginSearchSource),
} satisfies StoryObj<PluginSearchArgs>;
