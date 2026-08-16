import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createCustomControls,
  type CustomControlsInstance,
  type CustomControlsOptions,
  type CustomControlsSnapshot,
} from './example';

const renderInteractive = canvasStory({
  create: createCustomControls,
  apply(instance: CustomControlsInstance, args: CustomControlsOptions) {
    instance.update(args);
  },
  readout(snapshot: CustomControlsSnapshot) {
    return [
      ['控件集（矩形）', snapshot.rectControls],
      ['控件集（多边形）', snapshot.polyControls],
      ['最近动作', snapshot.lastAction],
      ['对象数', snapshot.objectCount],
    ];
  },
  captions: ['先点选对象，控件才可交互：tr 圆钮删除 · br 圆钮复制 · 开关切换控件集'],
});

const meta = {
  id: 'custom-controls',
  title: '交互与编辑/自定义控件',
  tags: ['!dev'],
  args: {
    showDeleteControl: true,
    showCloneControl: true,
    ringCornerRender: true,
    polyEditMode: false,
    lockRotation: false,
  },
  argTypes: {
    showDeleteControl: {
      name: '删除按钮控件',
      description:
        '在 controls 表加 delete 键（tr 角外 20px）：mouseUpHandler 点击型控件，无 actionHandler，点击即 canvas.remove。',
      control: { type: 'boolean' },
    },
    showCloneControl: {
      name: '复制按钮控件',
      description:
        '在 controls 表加 clone 键（br 角外 20px）：mouseUpHandler 里 target.clone()（Promise），克隆体不携带控件、需重新安装。',
      control: { type: 'boolean' },
    },
    ringCornerRender: {
      name: '圆环角落渲染',
      description:
        '把克隆默认集里 tl/tr/bl/br 四个角落控件的 render 换成自定义圆环（默认渲染是方块）。',
      control: { type: 'boolean' },
    },
    polyEditMode: {
      name: '顶点编辑控件',
      description:
        'controlsUtils.createPolyControls(poly) 为多边形每个顶点建控件（p0…p4，actionName modifyPoly），拖动即改顶点。',
      control: { type: 'boolean' },
    },
    lockRotation: {
      name: '锁定旋转',
      description:
        'rect.lockRotation：内置 mtr 的 rotationStyleHandler 悬停返回 not-allowed，拖动旋转无效。',
      control: { type: 'boolean' },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<CustomControlsOptions>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
