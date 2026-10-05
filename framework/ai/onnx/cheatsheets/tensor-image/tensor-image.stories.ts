import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import handwrittenSource from './image-to-tensor.ts?raw';
import fromImageSource from './from-image.ts?raw';
import tensorToImageSource from './tensor-to-image.ts?raw';
import {
  createHandwritten,
  type ChannelOrder,
  type HandwrittenInstance,
  type HandwrittenSnapshot,
  type NormMode,
  type TensorLayout,
} from './image-to-tensor';
import {
  createFromImage,
  type FromImageInstance,
  type FromImageMode,
  type FromImageSnapshot,
} from './from-image';
import {
  createTensorToImage,
  type TensorToImageInstance,
  type TensorToImageSnapshot,
  type ValueRange,
} from './tensor-to-image';

interface HandwrittenArgs {
  layout: TensorLayout;
  channels: ChannelOrder;
  norm: NormMode;
}

interface FromImageArgs {
  mode: FromImageMode;
}

interface TensorToImageArgs {
  range: ValueRange;
}

const renderHandwritten = canvasStory({
  create: createHandwritten,
  apply(instance: HandwrittenInstance, args: HandwrittenArgs) {
    instance.update(args);
  },
  readout(snapshot: HandwrittenSnapshot) {
    return [
      ['输出形状', snapshot.dims],
      ['数据长度', snapshot.length],
      ['索引公式', snapshot.indexFormula],
      ['采样像素 (10, 8)', snapshot.sample],
      ['值域 min ~ max', snapshot.range],
    ];
  },
  captions: ['左：源图案 ImageData（RGBA 交错）', '右：张量的三个通道平面'],
});

const renderFromImage = canvasStory({
  create: createFromImage,
  apply(instance: FromImageInstance, args: FromImageArgs) {
    instance.update({ mode: args.mode });
  },
  readout(snapshot: FromImageSnapshot) {
    return [
      ['输入形态', snapshot.modeLabel],
      ['输出形状', snapshot.dims],
      ['通道数', snapshot.channels],
      ['与手写基准最大差', snapshot.diff],
    ];
  },
  captions: ['左：源图案 32×24 ImageData', '右：fromImage 产物的还原画面'],
});

const renderTensorToImage = canvasStory({
  create: createTensorToImage,
  apply(instance: TensorToImageInstance, args: TensorToImageArgs) {
    instance.update({ range: args.range });
  },
  readout(snapshot: TensorToImageSnapshot) {
    return [
      ['张量形状', snapshot.shape],
      ['值域', snapshot.range],
      ['匹配 norm', snapshot.matchNorm],
      ['逆变换公式', snapshot.formula],
      ['还原抽样', snapshot.sample],
    ];
  },
  captions: ['左：norm 匹配值域', '右：固定默认 norm'],
});

// 用类型标注（而非 satisfies）携带 args，让默认导出的 meta 携带 args 元数据。
const meta: Meta<HandwrittenArgs> = {
  id: 'tensor-image',
  title: '核心概念/张量与数据/图像与 Tensor 互转',
  tags: ['!dev'],
};

export default meta;

type HandwrittenStory = StoryObj<HandwrittenArgs>;
type FromImageStory = StoryObj<FromImageArgs>;
type TensorToImageStory = StoryObj<TensorToImageArgs>;

export const Handwritten: HandwrittenStory = {
  name: '手写转换',
  args: {
    layout: 'NCHW',
    channels: 'RGB',
    norm: 'unit',
  },
  argTypes: {
    layout: {
      name: '目标布局',
      description: '张量的维度排布：NCHW 按通道分面，NHWC 按像素交错（fromImage 不支持，手写可以）。',
      control: {
        type: 'radio',
        labels: {
          NCHW: 'NCHW（通道优先）',
          NHWC: 'NHWC（像素交错）',
        },
      },
      options: ['NCHW', 'NHWC'],
    },
    channels: {
      name: '通道顺序',
      description: '切换张量的通道语义，观察通道 0 与通道 2 的平面内容互换。',
      control: {
        type: 'radio',
        labels: {
          RGB: 'RGB',
          BGR: 'BGR',
        },
      },
      options: ['RGB', 'BGR'],
    },
    norm: {
      name: '归一化',
      description: '÷255 得到 [0,1]；ImageNet mean/std 会产生负值。',
      control: {
        type: 'radio',
        labels: {
          unit: '÷255',
          imagenet: 'ImageNet mean/std',
        },
      },
      options: ['unit', 'imagenet'],
    },
  },
  render: renderHandwritten,
  parameters: storySource(handwrittenSource),
};

export const FromImage: FromImageStory = {
  name: 'fromImage 输入形态',
  args: {
    mode: 'scaled',
  },
  argTypes: {
    mode: {
      name: '输入形态',
      description: 'fromImage 的三种输入：先缩放的 ImageData、HTMLImageElement、带 resized 参数的 ImageData。',
      control: {
        type: 'radio',
        labels: {
          scaled: 'ImageData（先缩放）',
          element: 'HTMLImageElement',
          resized: 'ImageData + resized 参数',
        },
      },
      options: ['scaled', 'element', 'resized'],
    },
  },
  render: renderFromImage,
  parameters: storySource(fromImageSource),
};

export const TensorToImage: TensorToImageStory = {
  name: '还原成图像',
  args: {
    range: 'unit',
  },
  argTypes: {
    range: {
      name: '张量值域',
      description: '切换张量的值域约定，对照 toImageData 的 norm 参数如何与值域匹配。',
      control: {
        type: 'radio',
        labels: {
          unit: '[0, 1]',
          symmetric: '[-1, 1]',
        },
      },
      options: ['unit', 'symmetric'],
    },
  },
  render: renderTensorToImage,
  parameters: storySource(tensorToImageSource),
};
