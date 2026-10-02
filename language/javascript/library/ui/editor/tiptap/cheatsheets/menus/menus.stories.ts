import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import {
  createBubbleShowDemo,
  type BubbleShowArgs,
  type BubbleShowInstance,
  type BubbleShowSnapshot,
} from './bubble-show';
import bubbleShowSource from './bubble-show.ts?raw';
import './demo.css';
import {
  createFloatingShowDemo,
  type FloatingShowArgs,
  type FloatingShowInstance,
  type FloatingShowSnapshot,
} from './floating-show';
import floatingShowSource from './floating-show.ts?raw';
import {
  createMenuClippingDemo,
  type MenuClippingArgs,
  type MenuClippingInstance,
  type MenuClippingSnapshot,
} from './menu-clipping';
import menuClippingSource from './menu-clipping.ts?raw';

const bubbleShowRender = canvasStory({
  create: createBubbleShowDemo,
  apply(instance: BubbleShowInstance, args: BubbleShowArgs) {
    instance.update(args);
  },
  readout(snapshot: BubbleShowSnapshot) {
    return [
      ['菜单可见', snapshot.visible ? '是' : '否'],
      ['选区 from–to', snapshot.selection],
      ['加粗', snapshot.boldActive ? '是' : '否'],
    ];
  },
});

const floatingShowRender = canvasStory({
  create: createFloatingShowDemo,
  apply(instance: FloatingShowInstance, args: FloatingShowArgs) {
    instance.update(args);
  },
  readout(snapshot: FloatingShowSnapshot) {
    return [
      ['菜单可见', snapshot.visible ? '是' : '否'],
      ['光标位置', snapshot.cursor],
    ];
  },
});

const menuClippingRender = canvasStory({
  create: createMenuClippingDemo,
  apply(instance: MenuClippingInstance, args: MenuClippingArgs) {
    instance.update(args);
  },
  readout(snapshot: MenuClippingSnapshot) {
    return [
      ['菜单可见', snapshot.visible ? '是' : '否'],
      ['菜单挂载点', snapshot.mount],
    ];
  },
});

const meta = {
  id: 'menus',
  title: '常用扩展/菜单',
  tags: ['!dev'],
} satisfies Meta;

export default meta;

export const BubbleShow = {
  name: '选中文字的气泡菜单',
  args: {
    preset: 'default',
    updateDelay: 250,
  },
  argTypes: {
    preset: {
      name: 'shouldShow 预设',
      description: '默认条件，或完全接管：只在选区处于加粗状态时显示',
      control: {
        type: 'select',
        labels: {
          default: '默认条件',
          'bold-only': '仅加粗选区',
        },
      },
      options: ['default', 'bold-only'],
    },
    updateDelay: {
      name: 'updateDelay',
      description: '显隐更新的防抖毫秒数，默认 250；切到 0 可看到菜单立即出现',
      control: {
        type: 'select',
        labels: {
          '0': '0（立即）',
          '250': '250（默认）',
          '600': '600',
        },
      },
      options: [0, 250, 600],
    },
  },
  render: bubbleShowRender,
  parameters: storySource(bubbleShowSource),
} satisfies StoryObj<BubbleShowArgs>;

export const FloatingShow = {
  name: '空段落的浮动菜单',
  args: {
    placement: 'right',
  },
  argTypes: {
    placement: {
      name: 'placement',
      description: '菜单贴在光标行参照矩形的哪一侧，默认 right',
      control: {
        type: 'select',
        labels: {
          right: 'right（默认）',
          top: 'top',
          bottom: 'bottom',
          left: 'left',
        },
      },
      options: ['right', 'top', 'bottom', 'left'],
    },
  },
  render: floatingShowRender,
  parameters: storySource(floatingShowSource),
} satisfies StoryObj<FloatingShowArgs>;

export const MenuClipping = {
  name: '溢出裁剪与挂载点',
  args: {
    fix: 'none',
  },
  argTypes: {
    fix: {
      name: '溢出处理',
      description: '默认（被容器裁剪）/ strategy fixed / appendTo body',
      control: {
        type: 'select',
        labels: {
          none: '默认（被裁剪）',
          fixed: "options.strategy: 'fixed'",
          'append-body': 'appendTo: body',
        },
      },
      options: ['none', 'fixed', 'append-body'],
    },
  },
  render: menuClippingRender,
  parameters: storySource(menuClippingSource),
} satisfies StoryObj<MenuClippingArgs>;
