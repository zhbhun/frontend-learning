import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import './demo.css';
import {
  createDocTreeDemo,
  type DocTreeInstance,
  type DocTreeSnapshot,
} from './doc-tree';
import docTreeSource from './doc-tree.ts?raw';
import {
  createRoundTripDemo,
  type RoundTripArgs,
  type RoundTripInstance,
  type RoundTripSnapshot,
} from './round-trip';
import roundTripSource from './round-trip.ts?raw';
import {
  createSchemaGuardDemo,
  type SchemaGuardArgs,
  type SchemaGuardInstance,
  type SchemaGuardSnapshot,
} from './schema-guard';
import schemaGuardSource from './schema-guard.ts?raw';

const roundTripRender = canvasStory({
  create: createRoundTripDemo,
  apply(instance: RoundTripInstance, args: RoundTripArgs) {
    instance.update(args);
  },
  readout(snapshot: RoundTripSnapshot) {
    return [
      ['输入格式', snapshot.formatLabel],
      ['getHTML 与基准一致', snapshot.htmlMatches ? '是' : '否'],
      ['getJSON 与基准一致', snapshot.jsonMatches ? '是' : '否'],
      ['getText 与基准一致', snapshot.textMatches ? '是' : '否'],
    ];
  },
});

const docTreeRender = canvasStory({
  create: createDocTreeDemo,
  apply(instance: DocTreeInstance) {
    instance.update();
  },
  readout(snapshot: DocTreeSnapshot) {
    return [
      ['doc 子节点', `${snapshot.docChildren} 个`],
      ['树深度', `${snapshot.depth} 层`],
      ['标记类型', snapshot.markTypes],
    ];
  },
});

const schemaGuardRender = canvasStory({
  create: createSchemaGuardDemo,
  apply(instance: SchemaGuardInstance, args: SchemaGuardArgs) {
    instance.update(args);
  },
  readout(snapshot: SchemaGuardSnapshot) {
    return [
      ['处理模式', snapshot.checkLabel],
      ['doc 子节点', `${snapshot.docChildren} 个`],
      ['发生错误', snapshot.errorOccurred ? '是' : '否'],
      ['isEmpty', String(snapshot.isEmpty)],
    ];
  },
});

const meta = {
  id: 'content-model',
  title: '内容与命令/内容与文档模型',
  tags: ['!dev'],
} satisfies Meta;

export default meta;

export const RoundTrip = {
  name: '往返等价',
  args: {
    format: 'html',
  },
  argTypes: {
    format: {
      name: 'content 输入格式',
      description: 'HTML 字符串 / JSON 文档，两种预设表达同一份文档',
      control: {
        type: 'select',
        labels: {
          html: 'HTML 字符串',
          json: 'JSON 文档',
        },
      },
      options: ['html', 'json'],
    },
  },
  render: roundTripRender,
  parameters: storySource(roundTripSource),
} satisfies StoryObj<RoundTripArgs>;

export const DocTree = {
  name: '文档树',
  render: docTreeRender,
  parameters: storySource(docTreeSource),
} satisfies StoryObj;

export const SchemaGuard = {
  name: '非法内容处理',
  args: {
    preset: 'unknown-tag-html',
    contentCheck: false,
  },
  argTypes: {
    preset: {
      name: 'content 预设',
      description: '合法 HTML / 含未注册标签的 HTML / 未注册节点类型的 JSON',
      control: {
        type: 'select',
        labels: {
          'valid-html': '合法 HTML',
          'unknown-tag-html': '含未注册标签的 HTML',
          'unknown-node-json': '未注册节点类型的 JSON',
        },
      },
      options: ['valid-html', 'unknown-tag-html', 'unknown-node-json'],
    },
    contentCheck: {
      name: 'enableContentCheck',
      description: '开启后非法内容经 contentError 事件报告，默认静默过滤',
      control: {
        type: 'boolean',
      },
    },
  },
  render: schemaGuardRender,
  parameters: storySource(schemaGuardSource),
} satisfies StoryObj<SchemaGuardArgs>;
