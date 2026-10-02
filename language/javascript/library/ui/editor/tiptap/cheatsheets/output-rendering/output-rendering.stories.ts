import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import './demo.css';
import {
  createHtmlToJsonDemo,
  type HtmlToJsonArgs,
  type HtmlToJsonInstance,
  type HtmlToJsonSnapshot,
} from './html-to-json';
import htmlToJsonSource from './html-to-json.ts?raw';
import {
  createJsonToHtmlDemo,
  type JsonToHtmlArgs,
  type JsonToHtmlInstance,
  type JsonToHtmlSnapshot,
} from './json-to-html';
import jsonToHtmlSource from './json-to-html.ts?raw';

const jsonToHtmlRender = canvasStory({
  create: createJsonToHtmlDemo,
  apply(instance: JsonToHtmlInstance, args: JsonToHtmlArgs) {
    instance.update(args);
  },
  readout(snapshot: JsonToHtmlSnapshot) {
    return [
      ['JSON 预设', snapshot.presetLabel],
      ['generateHTML', snapshot.htmlStatus],
      ['generateText', snapshot.textPreview],
      ['与只读编辑器输出一致', snapshot.editorMatches],
      ['错误信息', snapshot.errorMessage],
    ];
  },
});

const htmlToJsonRender = canvasStory({
  create: createHtmlToJsonDemo,
  apply(instance: HtmlToJsonInstance, args: HtmlToJsonArgs) {
    instance.update(args);
  },
  readout(snapshot: HtmlToJsonSnapshot) {
    return [
      ['HTML 预设', snapshot.presetLabel],
      ['generateJSON', snapshot.generateStatus],
      ['doc 子节点', snapshot.childCount],
      ['generateHTML 往返', snapshot.roundTrip],
      ['错误信息', snapshot.errorMessage],
    ];
  },
});

const meta = {
  id: 'output-rendering',
  title: '生产化/输出与静态渲染',
  tags: ['!dev'],
} satisfies Meta;

export default meta;

export const JsonToHtml = {
  name: 'JSON 转 HTML',
  args: {
    preset: 'valid',
  },
  argTypes: {
    preset: {
      name: 'JSON 预设',
      description:
        '合法文档直接转换；含未注册节点的文档会让离线转换抛错，编辑器路径则降级为空文档',
      control: {
        type: 'select',
        labels: {
          valid: '合法文档',
          'unknown-node': '含未注册节点（image）',
        },
      },
      options: ['valid', 'unknown-node'],
    },
  },
  render: jsonToHtmlRender,
  parameters: storySource(jsonToHtmlSource),
} satisfies StoryObj<JsonToHtmlArgs>;

export const HtmlToJson = {
  name: 'HTML 转 JSON',
  args: {
    preset: 'unknown-tag',
  },
  argTypes: {
    preset: {
      name: 'HTML 预设',
      description: '含未注册标签的 HTML 会被静默过滤，doc 子节点减少且无任何报错',
      control: {
        type: 'select',
        labels: {
          valid: '合法 HTML（2 个块级元素）',
          'unknown-tag': '含未注册标签（4 个块级元素）',
        },
      },
      options: ['valid', 'unknown-tag'],
    },
  },
  render: htmlToJsonRender,
  parameters: storySource(htmlToJsonSource),
} satisfies StoryObj<HtmlToJsonArgs>;
