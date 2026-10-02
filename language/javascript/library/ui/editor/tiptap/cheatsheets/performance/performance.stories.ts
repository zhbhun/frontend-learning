import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import {
  createDocScaleDemo,
  type DocScaleArgs,
  type DocScaleInstance,
  type DocScaleSnapshot,
} from './doc-scale';
import docScaleSource from './doc-scale.ts?raw';
import './demo.css';
import {
  createExtensionTrimmingDemo,
  type ExtensionTrimmingArgs,
  type ExtensionTrimmingInstance,
  type ExtensionTrimmingSnapshot,
} from './extension-trimming';
import extensionTrimmingSource from './extension-trimming.ts?raw';
import {
  createUpdateCallbackDemo,
  type UpdateCallbackArgs,
  type UpdateCallbackInstance,
  type UpdateCallbackSnapshot,
} from './update-callback';
import updateCallbackSource from './update-callback.ts?raw';

function ms(value: number): string {
  return `${value.toFixed(2)} ms`;
}

const updateCallbackRender = canvasStory({
  create: createUpdateCallbackDemo,
  apply(instance: UpdateCallbackInstance, args: UpdateCallbackArgs) {
    instance.update(args);
  },
  readout(snapshot: UpdateCallbackSnapshot) {
    return [
      ['update 事件', `${snapshot.updateCount} 次`],
      ['回调累计耗时', ms(snapshot.callbackCost)],
      ['实际读数次数', `${snapshot.readCount} 次`],
      ['整批输入耗时', ms(snapshot.batchCost)],
    ];
  },
});

const docScaleRender = canvasStory({
  create: createDocScaleDemo,
  apply(instance: DocScaleInstance, args: DocScaleArgs) {
    instance.update(args);
  },
  readout(snapshot: DocScaleSnapshot) {
    return [
      ['段落数', `${snapshot.paragraphCount} 段`],
      ['字符数', `${snapshot.charCount} 字`],
      ['getJSON', ms(snapshot.getJsonCost)],
      ['getHTML', ms(snapshot.getHtmlCost)],
      ['getText', ms(snapshot.getTextCost)],
      ['全文遍历', ms(snapshot.traverseCost)],
      ['全文取文本', ms(snapshot.textBetweenCost)],
    ];
  },
});

const extensionTrimmingRender = canvasStory({
  create: createExtensionTrimmingDemo,
  apply(instance: ExtensionTrimmingInstance, args: ExtensionTrimmingArgs) {
    instance.update(args);
  },
  readout(snapshot: ExtensionTrimmingSnapshot) {
    return [
      ['扩展数', `${snapshot.extensionCount} 个`],
      ['插件数', `${snapshot.pluginCount} 个`],
      ['节点类型', `${snapshot.nodeTypeCount} 种`],
      ['标记类型', `${snapshot.markTypeCount} 种`],
      ['创建耗时中位数', ms(snapshot.createCost)],
    ];
  },
});

const meta = {
  id: 'performance',
  title: '生产化/性能',
  tags: ['!dev'],
} satisfies Meta;

export default meta;

export const UpdateCallback = {
  name: '更新回调',
  args: {
    callbackMode: 'per-update',
    burst: 150,
  },
  argTypes: {
    callbackMode: {
      name: '回调模式',
      description: 'update 事件回调里做什么：全量读数按事务次数付费，防抖后只读一次',
      control: {
        type: 'select',
        labels: {
          none: '不读数（只计数）',
          'per-update': '每次 update 全量 getJSON',
          debounced: '防抖 300ms 后读一次',
        },
      },
      options: ['none', 'per-update', 'debounced'],
    },
    burst: {
      name: '输入次数',
      description: '一次性插入的字符数，每个字符一个事务（等价连续按键）',
      control: {
        type: 'range',
        min: 50,
        max: 300,
        step: 50,
      },
    },
  },
  render: updateCallbackRender,
  parameters: storySource(updateCallbackSource),
} satisfies StoryObj<UpdateCallbackArgs>;

export const DocScale = {
  name: '文档规模',
  args: {
    docSize: '800',
  },
  argTypes: {
    docSize: {
      name: '文档规模',
      description: '切换后重建编辑器并重新测量各类全量读数的单次耗时',
      control: {
        type: 'select',
        labels: {
          '200': '200 段',
          '800': '800 段',
          '1600': '1600 段',
        },
      },
      options: ['200', '800', '1600'],
    },
  },
  render: docScaleRender,
  parameters: storySource(docScaleSource),
} satisfies StoryObj<DocScaleArgs>;

export const ExtensionTrimming = {
  name: '扩展裁剪',
  args: {
    preset: 'starter-kit',
  },
  argTypes: {
    preset: {
      name: '扩展预设',
      description: 'StarterKit 全量 / 精简 / 最小四件；切换后重新测量创建耗时',
      control: {
        type: 'select',
        labels: {
          'starter-kit': 'StarterKit 全量（22 个）',
          trimmed: '精简（保留 11 个）',
          minimal: '最小四件（4 个）',
        },
      },
      options: ['starter-kit', 'trimmed', 'minimal'],
    },
  },
  render: extensionTrimmingRender,
  parameters: storySource(extensionTrimmingSource),
} satisfies StoryObj<ExtensionTrimmingArgs>;
