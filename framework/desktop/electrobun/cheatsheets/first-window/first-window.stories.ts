import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import mappingSource from './views-url-mapping.ts?raw';
import {
  createViewsUrlMapping,
  type FileKind,
  type ViewsUrlMappingInstance,
  type ViewsUrlMappingSnapshot,
} from './views-url-mapping';

interface MappingArgs {
  viewName: string;
  fileKind: FileKind;
  inCopy: boolean;
}

const renderMapping = canvasStory({
  create: createViewsUrlMapping,
  apply(instance: ViewsUrlMappingInstance, args: MappingArgs) {
    instance.update(args);
  },
  readout(snapshot: ViewsUrlMappingSnapshot) {
    return [
      ['视图名', snapshot.viewName],
      ['源文件', snapshot.srcPath],
      ['装配方式', snapshot.method],
      ['views:// 地址', snapshot.url],
      ['窗口结果', snapshot.outcome],
    ];
  },
});

const meta = {
  id: 'first-window',
  title: '上手/第一个窗口',
  tags: ['!dev'],
  args: {
    viewName: 'mainview',
    fileKind: 'index.html',
    inCopy: true,
  },
  argTypes: {
    viewName: {
      name: '视图名',
      description: 'build.views 的键，也是 views:// 路径的第一段。',
      control: { type: 'text' },
    },
    fileKind: {
      name: '文件类型',
      description: '要装配进 views:// 命名空间的文件。',
      options: ['index.html', 'index.css', 'index.ts'],
      control: {
        type: 'inline-radio',
        labels: {
          'index.html': 'HTML 页面',
          'index.css': 'CSS 样式',
          'index.ts': 'TS 入口',
        },
      },
    },
    inCopy: {
      name: '已写入 build.copy',
      description: 'html/css 等静态文件是否在 build.copy 中映射到 views/ 下；TS 入口不受影响。',
      control: { type: 'boolean' },
    },
  },
  render: renderMapping,
  parameters: storySource(mappingSource),
} satisfies Meta<MappingArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ViewsUrlMapping: Story = {};
