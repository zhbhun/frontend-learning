import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createInnerEditorDemo,
  type InnerEditorInstance,
  type InnerEditorSnapshot,
  type InnerEditorOptions,
} from './example';

interface InnerEditorArgs extends InnerEditorOptions {}

const renderInteractive = canvasStory({
  create: createInnerEditorDemo,
  apply(instance: InnerEditorInstance, args: InnerEditorArgs) {
    instance.update(args);
  },
  readout(snapshot: InnerEditorSnapshot) {
    return [
      ['编辑工具', snapshot.editToolTag],
      ['自定义工具已注册', snapshot.customRegistered ? '是' : '否'],
      ['吸附步长', `${snapshot.snapStep}px`],
      [
        '矩形位置',
        `${Math.round(snapshot.rectX)}, ${Math.round(snapshot.rectY)}`,
      ],
    ];
  },
});

const meta = {
  id: 'inner-editor',
  title: '编辑器/文字与内部编辑/内部编辑器与编辑工具',
  tags: ['!dev'],
  args: {
    editTool: 'gridSnap',
    snapStep: 20,
  },
  argTypes: {
    editTool: {
      name: '编辑工具',
      description:
        '切换矩形使用的编辑工具（写 rect.editOuter 后 editor.updateEditTool() 热切换）。默认 = 基类 EditTool（标准变换、自由移动）；网格吸附 = 自定义 GridSnapEditTool（拖动元素本体贴着网格交点移动）。',
      control: { type: 'radio' },
      options: ['default', 'gridSnap'],
    },
    snapStep: {
      name: '吸附步长',
      description:
        '网格步长（px），同时控制背景网格密度与 GridSnapEditTool 的吸附粒度。仅在「网格吸附」工具激活时影响 onMove 的落点。',
      control: { type: 'range', min: 10, max: 60, step: 5 },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<InnerEditorArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
