import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import lazyLoadSource from './subdoc-lazy-load.ts?raw';
import {
  createSubdocLazyLoad,
  type SubdocLazyLoadInstance,
  type SubdocLazyLoadOptions,
  type SubdocLazyLoadSnapshot,
} from './subdoc-lazy-load';

const renderLazyLoad = canvasStory({
  create: createSubdocLazyLoad,
  apply(instance: SubdocLazyLoadInstance, args: SubdocLazyLoadOptions) {
    instance.update(args);
  },
  readout(snapshot: SubdocLazyLoadSnapshot) {
    return [
      ['父文档 update', `${snapshot.parentBytes} B`],
      ['子文档内容通道', `${snapshot.subBytes} B`],
      ['B 端累计接收', `${snapshot.totalBytes} B`],
      ['全量直连对照', `${snapshot.fullBytes} B`],
      ['subdocs 事件 added / loaded', `${snapshot.eventsAdded} / ${snapshot.eventsLoaded}`],
      ['B 端已加载子文档', `${snapshot.loadedCount} / 3`],
    ];
  },
});

const meta = {
  id: 'subdocuments',
  title: '核心机制/子文档',
  tags: ['!dev'],
} satisfies Meta<SubdocLazyLoadOptions>;

export default meta;

type Story = StoryObj<SubdocLazyLoadOptions>;

export const LazyLoad: Story = {
  name: '子文档按需加载',
  args: {
    syncParent: true,
    loadTarget: 'none',
    autoLoadArchive: false,
  },
  argTypes: {
    syncParent: {
      name: '同步父文档',
      description: '把父文档的 update 应用到副本 B;目录与 guid 引用随之到达,子文档内容不走这条通道。',
      control: { type: 'boolean' },
    },
    loadTarget: {
      name: 'B 端手动 load()',
      description: '对引用调用 load() 表达「我要内容」,触发父文档的 subdocs.loaded 事件,随后内容沿 guid 通道到达。',
      control: { type: 'select' },
      options: ['none', 'readme', 'notes', 'archive', 'all'],
      labels: {
        none: '不加载',
        readme: '仅 readme.txt',
        notes: '仅 notes.txt',
        archive: '仅 archive.log',
        all: '全部加载',
      },
    },
    autoLoadArchive: {
      name: 'archive.log 用 autoLoad 创建',
      description: 'autoLoad: true 随引用传播;对端收到引用即自动 load,无需手动选择。',
      control: { type: 'boolean' },
    },
  },
  render: renderLazyLoad,
  parameters: storySource(lazyLoadSource),
};
