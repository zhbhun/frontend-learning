import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import './demo.css';
import {
  createFocusDemo,
  type FocusDemoInstance,
  type FocusDemoSnapshot,
} from './focus-demo';
import focusSource from './focus-demo.ts?raw';
import {
  createScrollDemo,
  type ScrollDemoInstance,
  type ScrollDemoSnapshot,
} from './scroll-demo';
import scrollSource from './scroll-demo.ts?raw';
import {
  createSelectionLab,
  type SelectionLabArgs,
  type SelectionLabInstance,
  type SelectionLabSnapshot,
} from './selection-lab';
import selectionLabSource from './selection-lab.ts?raw';

const selectionLabRender = canvasStory({
  create: createSelectionLab,
  apply(instance: SelectionLabInstance, args: SelectionLabArgs) {
    instance.update(args);
  },
  readout(snapshot: SelectionLabSnapshot) {
    return [
      ['选区类型', snapshot.typeLabel],
      ['from – to', snapshot.fromTo],
      ['anchor', snapshot.anchor],
      ['head', snapshot.head],
      ['empty', snapshot.empty],
      ['isFocused', snapshot.focused],
    ];
  },
});

const focusDemoRender = canvasStory({
  create: createFocusDemo,
  apply(instance: FocusDemoInstance) {
    instance.update();
  },
  readout(snapshot: FocusDemoSnapshot) {
    return [
      ['isFocused', snapshot.focused],
      ['from – to', snapshot.fromTo],
      ['选区类型', snapshot.typeLabel],
    ];
  },
});

const scrollDemoRender = canvasStory({
  create: createScrollDemo,
  apply(instance: ScrollDemoInstance) {
    instance.update();
  },
  readout(snapshot: ScrollDemoSnapshot) {
    return [
      ['scrollTop', snapshot.scrollTop],
      ['from – to', snapshot.fromTo],
      ['isFocused', snapshot.focused],
    ];
  },
});

const meta = {
  id: 'selection',
  title: '内容与命令/选区与焦点',
  tags: ['!dev'],
} satisfies Meta;

export default meta;

export const SelectionLab = {
  name: '选区读写',
  args: {
    command: 'cursor',
    from: 8,
    to: 20,
  },
  argTypes: {
    command: {
      name: '选区命令',
      description:
        '光标 setTextSelection(from) / 范围 setTextSelection({from, to}) / 节点选区 setNodeSelection(图片位置) / 全选 selectAll；后两种不使用 from/to',
      control: {
        type: 'select',
        labels: {
          cursor: '光标 setTextSelection(from)',
          range: '范围 setTextSelection({from, to})',
          node: '节点选区 setNodeSelection',
          all: '全选 selectAll',
        },
      },
      options: ['cursor', 'range', 'node', 'all'],
    },
    from: {
      name: 'from 位置',
      description: '文档位置：对照实例右侧「位置地图」，0–46 越界会自动收敛',
      control: {
        type: 'range',
        min: 0,
        max: 46,
        step: 1,
      },
    },
    to: {
      name: 'to 位置',
      description: '仅「范围」命令使用的高亮终点位置',
      control: {
        type: 'range',
        min: 0,
        max: 46,
        step: 1,
      },
    },
  },
  render: selectionLabRender,
  parameters: storySource(selectionLabSource),
} satisfies StoryObj<SelectionLabArgs>;

export const FocusDemo = {
  name: '焦点控制',
  render: focusDemoRender,
  parameters: storySource(focusSource),
} satisfies StoryObj;

export const ScrollDemo = {
  name: '滚动定位',
  render: scrollDemoRender,
  parameters: storySource(scrollSource),
} satisfies StoryObj;
