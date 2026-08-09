import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import zIndexSource from './z-index.ts?raw';
import renderLayerSource from './render-layer.ts?raw';
import cullingSource from './culling.ts?raw';
import {
  createZIndexDemo,
  type ZIndexInstance,
  type ZIndexSnapshot,
} from './z-index';
import {
  createRenderLayerDemo,
  type RenderLayerInstance,
  type RenderLayerSnapshot,
} from './render-layer';
import {
  createCullingDemo,
  type CullingInstance,
  type CullingSnapshot,
} from './culling';

interface ZIndexArgs {
  sortableChildren: boolean;
  playerZIndex: number;
}

interface RenderLayerArgs {
  useRenderLayer: boolean;
}

interface CullingArgs {
  cullable: boolean;
}

const meta = {
  id: 'layers',
  title: '进阶渲染/层级与分组',
  tags: ['!dev'],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const ZIndexDemo: Story = {
  args: {
    sortableChildren: true,
    playerZIndex: 1,
  },
  argTypes: {
    sortableChildren: {
      name: 'sortableChildren',
      description:
        '对应 container.sortableChildren（默认 false）。开启后按 zIndex 升序绘制子节点；关闭则保留 addChild 顺序，zIndex 被忽略。',
      control: { type: 'boolean' },
    },
    playerZIndex: {
      name: 'P 的 zIndex',
      description:
        '对应 P 卡片的 zIndex（默认 0）。A/B/C 的 zIndex 固定为 0/1/2。只有 sortableChildren 开启时才生效。',
      control: { type: 'range', min: -3, max: 5, step: 1 },
    },
  },
  render: canvasStory({
    create: createZIndexDemo,
    apply(instance: ZIndexInstance, args: ZIndexArgs) {
      instance.update(args);
    },
    readout(snapshot: ZIndexSnapshot) {
      return [
        ['sortableChildren', snapshot.sortable ? 'true' : 'false'],
        ['P 的 zIndex', snapshot.playerZ],
        ['渲染栈（下→上）', snapshot.stack],
      ];
    },
  }),
  parameters: storySource(zIndexSource),
};

export const RenderLayerDemo: Story = {
  args: {
    useRenderLayer: true,
  },
  argTypes: {
    useRenderLayer: {
      name: 'attach 到 RenderLayer',
      description:
        '开启时把每个角色的 UI 标签 attach 到顶层 RenderLayer——标签脱离 world 的 AlphaFilter，恢复不透明并置顶；关闭时标签留在角色容器里，随 world 半透明。标签的逻辑父始终是角色，位置仍跟随角色浮动。',
      control: { type: 'boolean' },
    },
  },
  render: canvasStory({
    create: createRenderLayerDemo,
    apply(instance: RenderLayerInstance, args: RenderLayerArgs) {
      instance.update(args);
    },
    readout(snapshot: RenderLayerSnapshot) {
      return [
        ['标签渲染归属', snapshot.attached ? 'RenderLayer' : '角色容器'],
        ['受 world 滤镜', snapshot.filtered ? '是（半透明）' : '否（清晰）'],
      ];
    },
  }),
  parameters: storySource(renderLayerSource),
};

export const CullingDemo: Story = {
  args: {
    cullable: true,
  },
  argTypes: {
    cullable: {
      name: 'cullable',
      description:
        '对应每个方块的 cullable 标志（默认 false）。开启后 Culler 每帧把视口外的方块标记为剔除、不进入渲染管线；关闭后 Culler 把所有方块的剔除状态重置为 false。',
      control: { type: 'boolean' },
    },
  },
  render: canvasStory({
    create: createCullingDemo,
    apply(instance: CullingInstance, args: CullingArgs) {
      instance.update(args);
    },
    readout(snapshot: CullingSnapshot) {
      return [
        ['总对象数', snapshot.total],
        ['视口内', snapshot.inView],
        ['已剔除', snapshot.culled],
        ['culling', snapshot.enabled ? '开启' : '关闭'],
      ];
    },
  }),
  parameters: storySource(cullingSource),
};
