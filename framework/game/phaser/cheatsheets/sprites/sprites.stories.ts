import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import { GAME_HEIGHT, GAME_WIDTH } from './story-support';
import spriteTransformSource from './sprite-transform.ts?raw';
import spriteVsImageSource from './sprite-vs-image.ts?raw';
import {
  createSpriteTransform,
  type SpriteTransformInstance,
  type SpriteTransformParams,
  type SpriteTransformSnapshot,
} from './sprite-transform';
import {
  createSpriteVsImage,
  type SpriteVsImageInstance,
  type SpriteVsImageSnapshot,
} from './sprite-vs-image';

/** 坐标读数统一取一位小数,整数省去小数位,方便与网格对照。 */
function num(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function point(p: { x: number; y: number }): string {
  return `(${num(p.x)}, ${num(p.y)})`;
}

const renderSpriteTransform = canvasStory({
  create: createSpriteTransform,
  apply(instance: SpriteTransformInstance, args: SpriteTransformParams) {
    instance.applyTransform(args);
  },
  readout(snapshot: SpriteTransformSnapshot) {
    return [
      [
        'position (x, y)',
        `${num(GAME_WIDTH / 2)}, ${num(GAME_HEIGHT / 2)}(固定)`,
      ],
      [
        'origin / displayOrigin',
        `${num(snapshot.originX)}, ${num(snapshot.originY)} / ${num(snapshot.displayOriginX)}, ${num(snapshot.displayOriginY)}`,
      ],
      ['scaleX, scaleY', `${num(snapshot.scaleX)}, ${num(snapshot.scaleY)}`],
      [
        'displayWidth × displayHeight',
        `${num(snapshot.displayWidth)} × ${num(snapshot.displayHeight)}`,
      ],
      ['angle / rotation', `${num(snapshot.angle)}° / ${snapshot.rotation.toFixed(2)} rad`],
      ['getTopLeft', point(snapshot.topLeft)],
      ['getCenter', point(snapshot.center)],
      ['getBottomRight', point(snapshot.bottomRight)],
      [
        'getBounds',
        `x ${num(snapshot.bounds.x)} y ${num(snapshot.bounds.y)} w ${num(snapshot.bounds.width)} h ${num(snapshot.bounds.height)}`,
      ],
      ['visible', snapshot.visible ? 'true' : 'false(跳过渲染,坐标照常)'],
    ];
  },
  captions: ['红框 = getBounds 包围盒,白十字 = position 锚点'],
});

interface PlaybackArgs {
  playing: boolean;
}

const renderSpriteVsImage = canvasStory({
  create: createSpriteVsImage,
  apply(instance: SpriteVsImageInstance, args: PlaybackArgs) {
    instance.setPlayback(args.playing);
  },
  readout(snapshot: SpriteVsImageSnapshot) {
    return [
      ['sprite.anims.isPlaying', snapshot.playing ? 'true' : 'false'],
      ['sprite 当前帧', snapshot.spriteFrame],
      ['image 当前帧', `${snapshot.imageFrame}(停在初始帧)`],
      ['image 上存在 anims', snapshot.imageHasAnims ? 'true' : 'false(没有该组件)'],
    ];
  },
  captions: ['同一份双帧纹理:Sprite 能播放,Image 永远停在初始帧'],
});

/** 两个 story 的参数并集,为各 story 的 args / argTypes 提供类型锚点。 */
interface SpritesArgs extends SpriteTransformParams, PlaybackArgs {}

const meta: Meta<SpritesArgs> = {
  id: 'sprites',
  title: '资源与显示/精灵与图像',
  tags: ['!dev'],
  // 默认 render,同时为每个 story 的 args 提供类型锚点;各 story 覆盖为自己的 render
  render: renderSpriteTransform,
};

export default meta;

type Story = StoryObj<SpritesArgs>;

export const TransformLab: Story = {
  args: {
    originX: 0.5,
    originY: 0.5,
    scale: 1,
    angle: 0,
    flipX: false,
    flipY: false,
    visible: true,
  },
  argTypes: {
    originX: {
      name: '原点 X',
      description: 'setOrigin 的 x:纹理内锚点,0.5 为中心,0 为左缘,1 为右缘。',
      control: { type: 'range', min: 0, max: 1, step: 0.25 },
    },
    originY: {
      name: '原点 Y',
      description: 'setOrigin 的 y:缺省时随 x;这里独立控制以观察两轴差异。',
      control: { type: 'range', min: 0, max: 1, step: 0.25 },
    },
    scale: {
      name: '缩放',
      description: 'setScale(x):等比缩放,y 未传时随 x;displayWidth = width × scaleX。',
      control: { type: 'range', min: 0.25, max: 2, step: 0.25 },
    },
    angle: {
      name: '角度(度)',
      description: 'setAngle:顺时针为正,0 朝右、90 朝下;绕 origin 旋转。',
      control: { type: 'range', min: -180, max: 180, step: 15 },
    },
    flipX: {
      name: '水平翻转',
      description: 'flipX:绕纹理竖直中线镜像,纯渲染开关,不改任何坐标。',
      control: { type: 'boolean' },
    },
    flipY: {
      name: '垂直翻转',
      description: 'flipY:绕纹理水平中线镜像;物理 body 不受翻转影响。',
      control: { type: 'boolean' },
    },
    visible: {
      name: '可见',
      description: 'setVisible:false 时跳过渲染,但对象仍在场景中、派生坐标照常。',
      control: { type: 'boolean' },
    },
  },
  render: renderSpriteTransform,
  parameters: storySource(spriteTransformSource),
};

export const SpriteVsImage: Story = {
  args: {
    playing: false,
  },
  argTypes: {
    playing: {
      name: '播放动画',
      description: '开:Sprite 播放 blink 并在两帧间切换;关:停在当前帧。',
      control: { type: 'boolean' },
    },
  },
  render: renderSpriteVsImage,
  parameters: storySource(spriteVsImageSource),
};
