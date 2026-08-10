import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createTransformerDemo,
  type TransformerInstance,
  type TransformerSnapshot,
  type TransformerOptions,
} from './example';

interface TransformerArgs extends TransformerOptions {}

const renderInteractive = canvasStory({
  create: createTransformerDemo,
  apply(instance: TransformerInstance, args: TransformerArgs) {
    instance.update(args);
  },
  readout(snapshot: TransformerSnapshot) {
    return [
      ['scaleX', snapshot.scaleX],
      ['scaleY', snapshot.scaleY],
      ['rotation°', snapshot.rotation],
      ['基础宽×高', `${snapshot.baseWidth}×${snapshot.baseHeight}`],
      ['有效宽×高', `${snapshot.effectiveWidth}×${snapshot.effectiveHeight}`],
    ];
  },
});

const meta = {
  id: 'transformer',
  title: '变换与组织/变换器',
  tags: ['!dev'],
  args: {
    rotateEnabled: true,
    keepRatio: true,
    centeredScaling: false,
    anchorSize: 10,
    padding: 0,
    anchorSet: 'all',
  },
  argTypes: {
    rotateEnabled: {
      name: '启用旋转',
      description: 'rotateEnabled：是否显示旋转手柄并允许旋转，默认 true。',
      control: { type: 'boolean' },
    },
    keepRatio: {
      name: '锁定比例',
      description: 'keepRatio：拖动角点时是否保持宽高比，默认 true。',
      control: { type: 'boolean' },
    },
    centeredScaling: {
      name: '中心缩放',
      description: 'centeredScaling：是否相对节点中心缩放，默认 false。',
      control: { type: 'boolean' },
    },
    anchorSize: {
      name: '锚点尺寸',
      description: 'anchorSize：缩放锚点的边长，默认 10。',
      control: { type: 'range', min: 4, max: 24, step: 1 },
    },
    padding: {
      name: '内边距',
      description: 'padding：变换器边框与节点之间的间距，默认 0。',
      control: { type: 'range', min: 0, max: 40, step: 1 },
    },
    anchorSet: {
      name: '锚点集合',
      description:
        'enabledAnchors：控制显示哪些缩放锚点。all=八个、corners=四角、edges=四边、none=无。',
      control: { type: 'select' },
      options: ['all', 'corners', 'edges', 'none'],
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<TransformerArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
