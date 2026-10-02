import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import {
  createAssemblyLineDemo,
  type AssemblyLineArgs,
  type AssemblyLineInstance,
  type AssemblyLineSnapshot,
} from './assembly-line';
import assemblyLineSource from './assembly-line.ts?raw';
import './demo.css';
import { createLifecycleDemo, type LifecycleSnapshot } from './lifecycle-hooks';
import lifecycleSource from './lifecycle-hooks.ts?raw';
import {
  createOptionsStorageDemo,
  type OptionsStorageArgs,
  type OptionsStorageInstance,
  type OptionsStorageSnapshot,
} from './options-storage';
import optionsStorageSource from './options-storage.ts?raw';

const assemblyLineRender = canvasStory({
  create: createAssemblyLineDemo,
  apply(instance: AssemblyLineInstance, args: AssemblyLineArgs) {
    instance.update(args);
  },
  readout(snapshot: AssemblyLineSnapshot) {
    return [
      ['装配后用户扩展顺序', snapshot.userOrder],
      ['扩展总数（含核心扩展）', snapshot.totalCount],
      ['signature() 由谁响应', snapshot.winner],
    ];
  },
});

const lifecycleRender = canvasStory({
  create: createLifecycleDemo,
  apply() {
    // 本例输入由界面按钮与编辑器交互提供，不经过 args
  },
  readout(snapshot: LifecycleSnapshot) {
    return [
      ['最近触发', snapshot.lastHook],
      ['日志累计', snapshot.total],
    ];
  },
});

const optionsStorageRender = canvasStory({
  create: createOptionsStorageDemo,
  apply(instance: OptionsStorageInstance, args: OptionsStorageArgs) {
    instance.update(args);
  },
  readout(snapshot: OptionsStorageSnapshot) {
    return [
      ['解析后的 options', snapshot.options],
      ['this.storage.applied', snapshot.storageSelf],
      ['editor.storage.shout.applied', snapshot.storageExternal],
    ];
  },
});

const meta = {
  id: 'extension-system',
  title: '原理与自定义/Extension 体系',
  tags: ['!dev'],
} satisfies Meta;

export default meta;

export const AssemblyLine = {
  name: '扩展装配线',
  args: {
    preset: 'default',
  },
  argTypes: {
    preset: {
      name: '装配预设',
      description: '交换注册顺序或提高 alpha 的 priority，观察装配顺序与命令表的合并结果',
      control: {
        type: 'select',
        labels: {
          default: '默认注册顺序（alpha、beta 均为 priority 100）',
          swapped: '交换注册顺序（beta 在前）',
          priority: 'alpha 提到 priority 1000',
        },
      },
      options: ['default', 'swapped', 'priority'],
    },
  },
  render: assemblyLineRender,
  parameters: storySource(assemblyLineSource),
} satisfies StoryObj<AssemblyLineArgs>;

export const LifecycleHooks = {
  name: '生命周期时机',
  render: lifecycleRender,
  parameters: storySource(lifecycleSource),
} satisfies StoryObj;

export const OptionsStorage = {
  name: '配置与状态',
  args: {
    preset: 'plain',
  },
  argTypes: {
    preset: {
      name: '配置方式',
      description: '不配置、configure 只改 prefix、extend 用 this.parent 只改 uppercase',
      control: {
        type: 'select',
        labels: {
          plain: '不配置（全部默认值）',
          configure: 'configure({ prefix })——深合并',
          extend: 'extend + this.parent 只改 uppercase',
        },
      },
      options: ['plain', 'configure', 'extend'],
    },
  },
  render: optionsStorageRender,
  parameters: storySource(optionsStorageSource),
} satisfies StoryObj<OptionsStorageArgs>;
