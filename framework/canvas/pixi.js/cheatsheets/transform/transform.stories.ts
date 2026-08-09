import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import transformSource from './transform.ts?raw';
import {
  createTransformDemo,
  createAnchorDemo,
  createCompositeDemo,
  type TransformOptions,
  type TransformSnapshot,
  type AnchorOptions,
  type AnchorSnapshot,
  type CompositeOptions,
  type CompositeSnapshot,
} from './transform';

// 场景 1：position / scale / rotation / pivot / skew 同处一个对象，观察组合效果
const renderProperties = canvasStory({
  create: createTransformDemo,
  apply(instance, args: TransformOptions) {
    instance.update(args);
  },
  readout(snapshot: TransformSnapshot) {
    return [
      ['position', snapshot.position],
      ['scale', snapshot.scale],
      ['rotation', `${snapshot.rotationDeg}°`],
      ['pivot', snapshot.pivot],
      ['skew', snapshot.skew],
    ];
  },
});

// 场景 2：Sprite 的 anchor，与 pivot 对比
const renderAnchor = canvasStory({
  create: createAnchorDemo,
  apply(instance, args: AnchorOptions) {
    instance.update(args);
  },
  readout(snapshot: AnchorSnapshot) {
    return [
      ['anchor', snapshot.anchor],
      ['rotation', `${snapshot.rotationDeg}°`],
      ['纹理尺寸', snapshot.textureSize],
    ];
  },
});

// 场景 3：父子变换继承
const renderComposite = canvasStory({
  create: createCompositeDemo,
  apply(instance, args: CompositeOptions) {
    instance.update(args);
  },
  readout(snapshot: CompositeSnapshot) {
    return [
      ['父 rotation', `${snapshot.parentRotationDeg}°`],
      ['父 scale', snapshot.parentScale],
      ['子局部位置', snapshot.childLocal],
      ['子世界位置', snapshot.childWorld],
    ];
  },
});

const meta = {
  id: 'transform',
  title: '入门/变换',
  tags: ['!dev'],
  parameters: storySource(transformSource),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Properties: Story = {
  args: {
    positionX: 0,
    positionY: 0,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    pivotX: 0,
    pivotY: 0,
    skewX: 0,
    skewY: 0,
  },
  argTypes: {
    positionX: {
      name: 'position.x',
      control: { type: 'range', min: -200, max: 200, step: 1 },
    },
    positionY: {
      name: 'position.y',
      control: { type: 'range', min: -120, max: 120, step: 1 },
    },
    scaleX: {
      name: 'scale.x',
      control: { type: 'range', min: -2, max: 2, step: 0.05 },
    },
    scaleY: {
      name: 'scale.y',
      control: { type: 'range', min: -2, max: 2, step: 0.05 },
    },
    rotation: {
      name: 'rotation',
      control: { type: 'range', min: -3.14, max: 3.14, step: 0.05 },
    },
    pivotX: {
      name: 'pivot.x',
      control: { type: 'range', min: -90, max: 90, step: 1 },
    },
    pivotY: {
      name: 'pivot.y',
      control: { type: 'range', min: -70, max: 70, step: 1 },
    },
    skewX: {
      name: 'skew.x',
      control: { type: 'range', min: -1, max: 1, step: 0.05 },
    },
    skewY: {
      name: 'skew.y',
      control: { type: 'range', min: -1, max: 1, step: 0.05 },
    },
  },
  render: renderProperties,
};

export const Anchor: Story = {
  args: {
    anchorX: 0,
    anchorY: 0,
    rotation: 0,
  },
  argTypes: {
    anchorX: {
      name: 'anchor.x',
      control: { type: 'range', min: 0, max: 1, step: 0.05 },
    },
    anchorY: {
      name: 'anchor.y',
      control: { type: 'range', min: 0, max: 1, step: 0.05 },
    },
    rotation: {
      name: 'rotation',
      control: { type: 'range', min: -3.14, max: 3.14, step: 0.05 },
    },
  },
  render: renderAnchor,
};

export const Composite: Story = {
  args: {
    parentRotation: 0,
    parentScale: 1,
    childX: 45,
    childY: 30,
  },
  argTypes: {
    parentRotation: {
      name: '父 rotation',
      control: { type: 'range', min: -3.14, max: 3.14, step: 0.05 },
    },
    parentScale: {
      name: '父 scale',
      control: { type: 'range', min: 0.2, max: 2, step: 0.05 },
    },
    childX: {
      name: '子 position.x',
      control: { type: 'range', min: -100, max: 100, step: 1 },
    },
    childY: {
      name: '子 position.y',
      control: { type: 'range', min: -80, max: 80, step: 1 },
    },
  },
  render: renderComposite,
};
