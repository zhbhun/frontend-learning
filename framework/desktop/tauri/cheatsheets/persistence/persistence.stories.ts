import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import fsSource from './fs-sandbox.ts?raw';
import storeSource from './store-autosave.ts?raw';
import {
  createExample as createFsExample,
  type ExampleArgs as FsArgs,
  type ExampleInstance as FsInstance,
  type ExampleSnapshot as FsSnapshot,
} from './fs-sandbox';
import {
  createExample as createStoreExample,
  type ExampleArgs as StoreArgs,
  type ExampleInstance as StoreInstance,
  type ExampleSnapshot as StoreSnapshot,
} from './store-autosave';

const renderFs = canvasStory({
  create: createFsExample,
  apply(instance: FsInstance, args: FsArgs) {
    instance.update(args);
  },
  readout(snapshot: FsSnapshot) {
    return [
      ['解析路径', snapshot.resolved],
      ['本次调用', snapshot.callLabel],
      ['执行结果', snapshot.resultLabel],
      ['目录内容', snapshot.treeLabel],
    ];
  },
});

const renderStore = canvasStory({
  create: createStoreExample,
  apply(instance: StoreInstance, args: StoreArgs) {
    instance.update(args);
  },
  readout(snapshot: StoreSnapshot) {
    return [
      ['autoSave', snapshot.modeLabel],
      ['内存 store', snapshot.memoryLabel],
      ['磁盘状态', snapshot.diskLabel],
      ['store.json', snapshot.jsonLabel],
    ];
  },
});

const meta = {
  id: 'persistence',
  title: '插件与权限/文件与持久化',
  tags: ['!dev'],
} satisfies Meta<FsArgs & StoreArgs>;

export const FsSandbox: StoryObj<FsArgs> = {
  args: {
    op: 'writeTextFile',
    baseDir: 'AppData',
    path: 'settings.json',
    grant: 'default',
    platform: 'macOS',
  },
  argTypes: {
    op: {
      name: '演示操作',
      description:
        '选择一次 fs 插件调用,观察路径解析、「命令 × scope」权限判定与模拟执行结果。',
      control: { type: 'select' },
      options: [
        'writeTextFile',
        'readTextFile',
        'exists',
        'mkdir',
        'remove',
        'readDir',
      ],
    },
    baseDir: {
      name: '目标目录',
      description:
        'BaseDirectory 成员:AppData / AppConfig / AppLocalData / AppCache / AppLog 是应用专属目录,fs:default 覆盖其读权限;Temp / Document 在默认 scope 之外。',
      control: { type: 'select' },
      options: [
        'AppData',
        'AppConfig',
        'AppLocalData',
        'AppCache',
        'AppLog',
        'Temp',
        'Document',
      ],
    },
    path: {
      name: '相对路径',
      description:
        '相对目标目录的路径;含子目录段时父目录必须已存在(先用 mkdir)。',
      control: { type: 'text' },
    },
    grant: {
      name: '授权档位',
      description:
        'capabilities 配置:default = 仅 fs:default;write-no-scope = 补声明 fs:allow-write-text-file 但没配 scope;write-scope = 写/删命令 + fs:scope 覆盖演示路径。',
      control: { type: 'select' },
      options: ['default', 'write-no-scope', 'write-scope'],
    },
    platform: {
      name: '平台',
      description:
        'BaseDirectory 按平台解析;macOS 上 AppData / AppConfig / AppLocalData 同址。',
      control: { type: 'select' },
      options: ['macOS', 'Windows', 'Linux'],
    },
  },
  render: renderFs,
  parameters: storySource(fsSource),
};

export const StoreAutosave: StoryObj<StoreArgs> = {
  args: {
    mode: '1200',
    action: 'set',
  },
  argTypes: {
    mode: {
      name: 'autoSave',
      description:
        'store 的自动保存策略:100ms 是真实默认;1200ms 为放慢演示;false 关闭自动保存(只等 save() 或优雅退出)。',
      control: { type: 'select' },
      options: ['100', '1200', 'false'],
    },
    action: {
      name: '演示操作',
      description:
        '重放一次操作:set / delete 修改内存后等防抖,save() 立即写盘,退出场景对比优雅退出与强杀的差别。',
      control: { type: 'select' },
      options: ['set', 'save', 'delete', 'exit-graceful', 'kill'],
    },
  },
  render: renderStore,
  parameters: storySource(storeSource),
};

export default meta;
