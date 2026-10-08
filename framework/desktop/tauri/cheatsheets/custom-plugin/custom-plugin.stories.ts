import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './plugin-derivation.ts?raw';
import {
  createExample,
  type ExampleInstance,
  type ExampleSnapshot,
} from './plugin-derivation';

interface ExampleArgs {
  pluginName: string;
  commandName: string;
  jsPackage: 'default' | 'scoped';
}

const renderInteractive = canvasStory({
  create: createExample,
  apply(instance: ExampleInstance, args: ExampleArgs) {
    instance.update(args);
  },
  readout(snapshot: ExampleSnapshot) {
    return [
      ['Rust crate', snapshot.crateName],
      ['Rust 标识', snapshot.rustCrateIdent],
      ['前端包', snapshot.jsPackageName],
      ['命令通道', snapshot.channel],
      ['自动生成权限', snapshot.autoPermissions],
      ['命名校验', snapshot.statusLabel],
    ];
  },
});

const meta = {
  id: 'custom-plugin',
  title: '插件与权限/自定义插件',
  tags: ['!dev'],
  args: {
    pluginName: 'say',
    commandName: 'ping',
    jsPackage: 'default',
  },
  argTypes: {
    pluginName: {
      name: '插件短名',
      description:
        '插件短名,全部落点名的推导源头:crate 名、Rust 标识、npm 包名、权限前缀、命令通道都由它派生。只允许小写字母/数字/连字符,不能含下划线。',
      control: { type: 'text' },
    },
    commandName: {
      name: '命令名',
      description:
        '一条插件命令的 Rust 函数名(snake_case)。build.rs 据此自动生成 allow-/deny- 权限,default.toml 与 guest-js 导出与之对应。',
      control: { type: 'text' },
    },
    jsPackage: {
      name: '前端包命名',
      description:
        'npm 包命名风格:default 是脚手架默认的 tauri-plugin-<短名>-api;scoped 是官方推荐的 scope 形式 @scope/plugin-<短名>。',
      control: { type: 'select' },
      options: ['default', 'scoped'],
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<ExampleArgs>;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};

export default meta;
