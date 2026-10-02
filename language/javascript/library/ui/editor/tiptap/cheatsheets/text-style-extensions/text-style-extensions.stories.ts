import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import {
  createLinkBehaviorDemo,
  type LinkBehaviorArgs,
  type LinkBehaviorInstance,
  type LinkBehaviorSnapshot,
} from './link-behavior';
import linkBehaviorSource from './link-behavior.ts?raw';
import {
  createSpanHostDemo,
  type SpanHostInstance,
} from './span-host';
import spanHostSource from './span-host.ts?raw';
import {
  createStyleLabDemo,
  type StyleLabArgs,
  type StyleLabInstance,
  type StyleLabSnapshot,
} from './style-lab';
import styleLabSource from './style-lab.ts?raw';
import './demo.css';

const styleLabRender = canvasStory({
  create: createStyleLabDemo,
  apply(instance: StyleLabInstance, args: StyleLabArgs) {
    instance.update(args);
  },
  readout(snapshot: StyleLabSnapshot) {
    return [
      ['选区 marks', snapshot.marks],
      ['textStyle 属性', snapshot.textStyleAttrs],
      ['span 标签', snapshot.spanTag],
    ];
  },
});

const spanHostRender = canvasStory({
  create: createSpanHostDemo,
  apply(instance: SpanHostInstance) {
    instance.update();
  },
});

const linkBehaviorRender = canvasStory({
  create: createLinkBehaviorDemo,
  apply(instance: LinkBehaviorInstance, args: LinkBehaviorArgs) {
    instance.update(args);
  },
  readout(snapshot: LinkBehaviorSnapshot) {
    return [
      ['选区 href', snapshot.href],
      ['文档中链接数', snapshot.linkCount],
    ];
  },
});

const meta = {
  id: 'text-style-extensions',
  title: '常用扩展/文本样式扩展',
  tags: ['!dev'],
} satisfies Meta;

export default meta;

export const StyleLab = {
  name: '样式叠加与读取',
  args: {
    color: '#e06c6c',
  },
  argTypes: {
    color: {
      name: '文字颜色',
      description: '「文字颜色」按钮使用的色值',
      control: {
        type: 'select',
        labels: {
          '#e06c6c': '红 #e06c6c',
          '#4f7cff': '蓝 #4f7cff',
          '#2ea86f': '绿 #2ea86f',
        },
      },
      options: ['#e06c6c', '#4f7cff', '#2ea86f'],
    },
  },
  render: styleLabRender,
  parameters: storySource(styleLabSource),
} satisfies StoryObj<StyleLabArgs>;

export const SpanHost = {
  name: '宿主与 span 清理',
  render: spanHostRender,
  parameters: storySource(spanHostSource),
} satisfies StoryObj;

export const LinkBehavior = {
  name: '链接行为',
  args: {
    url: 'https://tiptap.dev/docs',
  },
  argTypes: {
    url: {
      name: '链接地址',
      description: '「为选区设置链接」按钮使用的 href',
      control: {
        type: 'text',
      },
    },
  },
  render: linkBehaviorRender,
  parameters: storySource(linkBehaviorSource),
} satisfies StoryObj<LinkBehaviorArgs>;
