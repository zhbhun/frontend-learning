import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import codeHighlightSource from './code-highlight.ts?raw';
import {
  createCodeHighlightDemo,
  type CodeHighlightInstance,
  type CodeHighlightSnapshot,
} from './code-highlight';
import imageInlineSource from './image-inline.ts?raw';
import {
  createImageInlineDemo,
  type ImageInlineArgs,
  type ImageInlineInstance,
  type ImageInlineSnapshot,
} from './image-inline';
import listFamilySource from './list-family.ts?raw';
import {
  createListFamilyDemo,
  type ListFamilyInstance,
  type ListFamilySnapshot,
} from './list-family';
import './demo.css';
import schemaNestingSource from './schema-nesting.ts?raw';
import {
  createSchemaNestingDemo,
  type SchemaNestingArgs,
  type SchemaNestingInstance,
  type SchemaNestingSnapshot,
} from './schema-nesting';
import tableLabSource from './table-lab.ts?raw';
import {
  createTableLabDemo,
  type TableLabArgs,
  type TableLabInstance,
  type TableLabSnapshot,
} from './table-lab';

const listFamilyRender = canvasStory({
  create: createListFamilyDemo,
  apply(instance: ListFamilyInstance) {
    instance.update();
  },
  readout(snapshot: ListFamilySnapshot) {
    return [
      ['当前列表', snapshot.currentList],
      ['嵌套深度', `${snapshot.depth} 层`],
    ];
  },
});

const tableLabRender = canvasStory({
  create: createTableLabDemo,
  apply(instance: TableLabInstance, args: TableLabArgs) {
    instance.update(args);
  },
  readout(snapshot: TableLabSnapshot) {
    return [
      ['表格尺寸', snapshot.sizeLabel],
      ['含表头行', snapshot.hasHeader],
      ['光标在表格内', snapshot.inTable],
    ];
  },
});

const codeHighlightRender = canvasStory({
  create: createCodeHighlightDemo,
  apply(instance: CodeHighlightInstance) {
    instance.update();
  },
  readout(snapshot: CodeHighlightSnapshot) {
    return [
      ['语言属性', snapshot.language],
      ['code 类名', snapshot.codeClass],
      ['高亮片段', `${snapshot.hljsSpans} 个`],
    ];
  },
});

const imageInlineRender = canvasStory({
  create: createImageInlineDemo,
  apply(instance: ImageInlineInstance, args: ImageInlineArgs) {
    instance.update(args);
  },
  readout(snapshot: ImageInlineSnapshot) {
    return [
      ['当前配置', snapshot.modeLabel],
      ['img 父节点', snapshot.imgParent],
    ];
  },
});

const schemaNestingRender = canvasStory({
  create: createSchemaNestingDemo,
  apply(instance: SchemaNestingInstance, args: SchemaNestingArgs) {
    instance.update(args);
  },
  readout(snapshot: SchemaNestingSnapshot) {
    return [
      ['光标所在链', snapshot.chain],
      ['上次操作', snapshot.lastAction],
    ];
  },
});

const meta = {
  id: 'content-extensions',
  title: '常用扩展/结构扩展',
  tags: ['!dev'],
} satisfies Meta;

export default meta;

export const ListFamily = {
  name: '列表家族',
  render: listFamilyRender,
  parameters: storySource(listFamilySource),
} satisfies StoryObj;

export const TableLab = {
  name: '表格',
  args: {
    rows: 3,
    cols: 3,
    withHeaderRow: true,
    resizable: false,
  },
  argTypes: {
    rows: {
      name: '行数',
      description: 'insertTable 的 rows 参数，调整后重建表格',
      control: { type: 'range', min: 1, max: 6, step: 1 },
    },
    cols: {
      name: '列数',
      description: 'insertTable 的 cols 参数，调整后重建表格',
      control: { type: 'range', min: 1, max: 5, step: 1 },
    },
    withHeaderRow: {
      name: 'withHeaderRow',
      description: '首行是否为表头行，调整后重建表格',
      control: { type: 'boolean' },
    },
    resizable: {
      name: 'resizable',
      description: 'Table 的列宽拖拽选项（默认 false），调整后重建表格',
      control: { type: 'boolean' },
    },
  },
  render: tableLabRender,
  parameters: storySource(tableLabSource),
} satisfies StoryObj<TableLabArgs>;

export const CodeHighlight = {
  name: '代码块高亮',
  render: codeHighlightRender,
  parameters: storySource(codeHighlightSource),
} satisfies StoryObj;

export const ImageInline = {
  name: '图片块级与行内',
  args: {
    inline: false,
  },
  argTypes: {
    inline: {
      name: 'inline',
      description: 'Image 的 schema 级配置：块级（默认）还是行内',
      control: { type: 'boolean' },
    },
  },
  render: imageInlineRender,
  parameters: storySource(imageInlineSource),
} satisfies StoryObj<ImageInlineArgs>;

export const SchemaNesting = {
  name: '嵌套与 schema',
  args: {
    position: 'quote',
    nested: false,
  },
  argTypes: {
    position: {
      name: '光标位置',
      description: '选中各位置的锚点文字后再执行操作',
      control: {
        type: 'select',
        labels: {
          paragraph: '普通段落',
          quote: '引用块内段落',
          'bullet-item': '无序列表项',
          'task-item': '任务列表项',
        },
      },
      options: ['paragraph', 'quote', 'bullet-item', 'task-item'],
    },
    nested: {
      name: 'TaskItem nested',
      description: '任务项是否允许嵌套其他块级内容（默认 false，改写 schema）',
      control: { type: 'boolean' },
    },
  },
  render: schemaNestingRender,
  parameters: storySource(schemaNestingSource),
} satisfies StoryObj<SchemaNestingArgs>;
