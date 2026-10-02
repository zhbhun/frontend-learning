import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import {
  createAttributePipelineDemo,
  type AttributePipelineArgs,
  type AttributePipelineInstance,
  type AttributePipelineSnapshot,
} from './attribute-pipeline';
import attributePipelineSource from './attribute-pipeline.ts?raw';
import './demo.css';
import {
  createParseRenderDemo,
  type ParseRenderArgs,
  type ParseRenderInstance,
  type ParseRenderSnapshot,
} from './parse-render';
import parseRenderSource from './parse-render.ts?raw';
import {
  createSchemaSpecDemo,
  type SchemaSpecArgs,
  type SchemaSpecInstance,
  type SchemaSpecSnapshot,
} from './schema-spec';
import schemaSpecSource from './schema-spec.ts?raw';

const schemaSpecRender = canvasStory({
  create: createSchemaSpecDemo,
  apply(instance: SchemaSpecInstance, args: SchemaSpecArgs) {
    instance.update(args);
  },
  readout(snapshot: SchemaSpecSnapshot) {
    return [
      ['nodes', snapshot.nodes],
      ['marks', snapshot.marks],
      [`${snapshot.focusLabel} 声明产生的字段`, snapshot.specKeys],
    ];
  },
});

const parseRenderRender = canvasStory({
  create: createParseRenderDemo,
  apply(instance: ParseRenderInstance, args: ParseRenderArgs) {
    instance.update(args);
  },
  readout(snapshot: ParseRenderSnapshot) {
    return [
      ['收下的标记', snapshot.marksInDoc],
      ['getHTML 输出标签', snapshot.outputTags],
    ];
  },
});

const attributePipelineRender = canvasStory({
  create: createAttributePipelineDemo,
  apply(instance: AttributePipelineInstance, args: AttributePipelineArgs) {
    instance.update(args);
  },
  readout(snapshot: AttributePipelineSnapshot) {
    return [
      ['attrs.color', snapshot.color],
      ['getHTML 里的 data-color', snapshot.dataColor],
    ];
  },
});

const meta = {
  id: 'schema-nodes-marks',
  title: '原理与自定义/Schema、节点与标记',
  tags: ['!dev'],
} satisfies Meta;

export default meta;

export const SchemaSpec = {
  name: '从扩展到 schema',
  args: {
    preset: 'with-heading',
  },
  argTypes: {
    preset: {
      name: '扩展预设',
      description: '三件套基础上追加节点或标记，schema 随之生长',
      control: {
        type: 'select',
        labels: {
          minimal: '三件套（Document + Paragraph + Text）',
          'with-heading': '追加 Heading 节点',
          'with-bold': '追加 Bold 标记',
        },
      },
      options: ['minimal', 'with-heading', 'with-bold'],
    },
  },
  render: schemaSpecRender,
  parameters: storySource(schemaSpecSource),
} satisfies StoryObj<SchemaSpecArgs>;

export const ParseRender = {
  name: '多进一出的 HTML',
  args: {
    preset: 'tags',
  },
  argTypes: {
    preset: {
      name: 'content 预设',
      description: '同一标记的多种 HTML 写法，getHTML 只输出规范标签',
      control: {
        type: 'select',
        labels: {
          tags: 'strong 与 b 标签',
          styles: 'font-weight 与 text-decoration 样式',
          legacy: 'u、s、del 标签',
          edge: 'font-weight: normal 的 b',
        },
      },
      options: ['tags', 'styles', 'legacy', 'edge'],
    },
  },
  render: parseRenderRender,
  parameters: storySource(parseRenderSource),
} satisfies StoryObj<ParseRenderArgs>;

export const AttributePipeline = {
  name: '属性的三段链路',
  args: {
    preset: 'data-color',
  },
  argTypes: {
    preset: {
      name: 'content 预设',
      description: '同一颜色的三种传入方式：data-color / 内联样式 / 无颜色',
      control: {
        type: 'select',
        labels: {
          'data-color': 'data-color 属性',
          style: '内联样式 background-color',
          plain: '不带颜色信息',
        },
      },
      options: ['data-color', 'style', 'plain'],
    },
  },
  render: attributePipelineRender,
  parameters: storySource(attributePipelineSource),
} satisfies StoryObj<AttributePipelineArgs>;
