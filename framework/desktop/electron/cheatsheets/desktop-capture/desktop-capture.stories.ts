import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import simSource from './capture-sim.ts?raw';
import {
  createCaptureSim,
  type CaptureSimInstance,
  type CaptureSimOptions,
  type CaptureSimSnapshot,
  type CaptureThumbSize,
  type CaptureTypes,
} from './capture-sim';

const TYPES_OPTIONS: CaptureTypes[] = ['screen 和 window', '仅 screen', '仅 window'];
const THUMB_OPTIONS: CaptureThumbSize[] = ['150×150（默认）', '640×360', '0×0（跳过）'];

const renderInteractive = canvasStory({
  create: createCaptureSim,
  apply(instance: CaptureSimInstance, args: CaptureSimOptions) {
    instance.update(args);
  },
  readout(snapshot: CaptureSimSnapshot) {
    return [
      ['getSources 返回', snapshot.count],
      ['选中 source', snapshot.selectedName],
      ['thumbnail 实际尺寸', snapshot.thumbnailSize],
      ['appIcon', snapshot.appIcon],
      ['录屏进入约束的 id', snapshot.captureId],
    ];
  },
});

const meta = {
  id: 'desktop-capture',
  title: '进阶主题/屏幕捕获',
  tags: ['!dev'],
  args: {
    types: 'screen 和 window',
    thumbnailSize: '150×150（默认）',
    fetchWindowIcons: false,
  },
  argTypes: {
    types: {
      name: 'types 捕获类型',
      description: 'getSources 的 types 选项：要哪类 media source，必填。',
      control: {
        type: 'select',
        options: TYPES_OPTIONS,
      },
    },
    thumbnailSize: {
      name: 'thumbnailSize',
      description: '缩略图目标尺寸（默认 150×150）；宽或高为 0 时跳过生成、节省处理时间。',
      control: {
        type: 'select',
        options: THUMB_OPTIONS,
      },
    },
    fetchWindowIcons: {
      name: 'fetchWindowIcons',
      description: '是否抓取窗口所属应用的图标；false（默认）时 appIcon 为 null，screen 类型恒为 null。',
      control: {
        type: 'boolean',
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(simSource),
} satisfies Meta<CaptureSimOptions>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
