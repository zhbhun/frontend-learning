import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createSelectTransform,
  type SelectTransformInstance,
  type SelectTransformSnapshot,
  type SelectTarget,
  type LockRatioOption,
} from './example';

interface SelectTransformArgs {
  target: SelectTarget;
  lockRatio: LockRatioOption;
  rotateable: boolean;
  rotateGap: number;
}

const renderInteractive = canvasStory({
  create: createSelectTransform,
  apply(instance: SelectTransformInstance, args: SelectTransformArgs) {
    instance.update(args);
  },
  readout(snapshot: SelectTransformSnapshot) {
    return [
      ['选中数量', snapshot.count],
      ['选中模式', snapshot.mode],
      ['选区尺寸', snapshot.size],
      ['选区角度', snapshot.rotation],
    ];
  },
});

const meta = {
  id: 'select-transform',
  title: '编辑器/编辑器基础/选中与变换手柄',
  tags: ['!dev'],
  args: {
    target: 'rect',
    lockRatio: false,
    rotateable: true,
    rotateGap: 0,
  },
  argTypes: {
    target: {
      name: '选中目标',
      description:
        '命令式选中：select(node) 单选、select([nodes]) 多选、cancel() 取消。',
      control: { type: 'select' },
      options: ['none', 'rect', 'ellipse', 'multi'],
      labels: {
        none: '取消',
        rect: '矩形（单选）',
        ellipse: '椭圆（单选）',
        multi: '全选（多选）',
      },
    },
    lockRatio: {
      name: '锁定比例',
      description:
        'lockRatio：缩放时是否锁定宽高比。true=始终锁定，"corner"=仅角点锁定（边点不锁），false=不锁。',
      control: { type: 'select' },
      options: [false, true, 'corner'],
      labels: {
        false: '否',
        true: '是',
        corner: '仅角点',
      },
    },
    rotateable: {
      name: '允许旋转',
      description:
        'rotateable：是否启用旋转手柄。false 会隐藏旋转点、禁止旋转。',
      control: { type: 'select' },
      options: [true, false],
      labels: {
        true: '是',
        false: '否',
      },
    },
    rotateGap: {
      name: '旋转吸附',
      description:
        'rotateGap：旋转磁吸间隔（度）。接近间隔倍数时吸附；0 关闭吸附。',
      control: {
        type: 'range',
        min: 0,
        max: 90,
        step: 15,
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<SelectTransformArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
