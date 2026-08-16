import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createSvgLesson,
  type SvgLessonInstance,
  type SvgLessonOptions,
  type SvgLessonSnapshot,
  type SvgPreset,
} from './example';

const renderInteractive = canvasStory({
  create: createSvgLesson,
  apply(instance: SvgLessonInstance, args: SvgLessonOptions) {
    instance.update(args);
  },
  readout(snapshot: SvgLessonSnapshot) {
    return [
      ['对象数', snapshot.objectCount],
      ['类型清单', snapshot.typeList],
      ['跳过标签', snapshot.skippedTags],
      ['viewBox 吸收', snapshot.viewBoxAbsorption],
      ['顶层结构', snapshot.topLevel],
      ['toSVG 长度', snapshot.svgLength],
      ['toSVG 标记', snapshot.svgMarks],
    ];
  },
});

const meta = {
  id: 'svg',
  title: '数据与导出/SVG 互操作',
  tags: ['!dev'],
  args: {
    preset: 'viewbox',
    customSvg: '',
    group: false,
    suppressPreamble: false,
  },
  argTypes: {
    preset: {
      name: 'SVG 预设',
      description:
        '「自定义 SVG 源码」留空时导入的内置 SVG，覆盖视图框缩放 / 分组吸收 / 未支持元素 / 文字 / 空文档五类情形。',
      control: {
        type: 'inline-radio',
        labels: {
          viewbox: '视图框缩放',
          grouped: '分组与变换吸收',
          unsupported: '未支持元素',
          text: '文字',
          empty: '空文档',
        },
      },
      options: [
        'viewbox',
        'grouped',
        'unsupported',
        'text',
        'empty',
      ] as SvgPreset[],
    },
    customSvg: {
      name: '自定义 SVG 源码',
      description:
        '粘贴任意 SVG 文档字符串；留空跟随「SVG 预设」，填写则优先生效。可复制预设后增删元素对照读数。',
      control: { type: 'text' },
    },
    group: {
      name: '导入后合并成组',
      description:
        '开启时用 util.groupSVGElements(objects, options) 把导入结果合并成一个 Group（单对象时直接返回原对象）；关闭时逐个平铺加入画布。',
      control: { type: 'boolean' },
    },
    suppressPreamble: {
      name: '省略 XML 序言',
      description:
        '导出时给 canvas.toSVG 传 suppressPreamble: true，去掉 <?xml 与 DOCTYPE；对照「toSVG 标记」里 xml / doctype 的消失。',
      control: { type: 'boolean' },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<SvgLessonOptions>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
