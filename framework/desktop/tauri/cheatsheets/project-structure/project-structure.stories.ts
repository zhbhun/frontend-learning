import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createExample,
  type ExampleArgs,
  type ExampleInstance,
  type ExampleSnapshot,
} from './example';

/* 下拉选项按工程树顺序排列,生成物放在各自身后。 */
const SELECTION_OPTIONS: ExampleArgs['selected'][] = [
  'index.html',
  'package.json',
  'vite.config.ts',
  'src/',
  'dist/',
  'src-tauri/Cargo.toml',
  'src-tauri/tauri.conf.json',
  'src-tauri/build.rs',
  'src-tauri/capabilities/',
  'src-tauri/icons/',
  'src-tauri/gen/',
  'src-tauri/target/',
];

const renderInteractive = canvasStory({
  create: createExample,
  apply(instance: ExampleInstance, args: ExampleArgs) {
    instance.update(args);
  },
  readout(snapshot: ExampleSnapshot) {
    return [
      ['选中路径', snapshot.path],
      ['归属', snapshot.owner],
      ['读取者', snapshot.reader],
      ['版本库', snapshot.git],
    ];
  },
  captions: ['工程树(选中项高亮)', '选中条目的职责'],
});

const meta = {
  id: 'project-structure',
  title: '上手/工程结构',
  tags: ['!dev'],
  args: {
    selected: 'src-tauri/tauri.conf.json',
    showGenerated: true,
  },
  argTypes: {
    selected: {
      name: '选中文件',
      description: '在工程树中定位一个文件或目录,右侧展示它的职责与读取者。',
      control: {
        type: 'select',
      },
      options: SELECTION_OPTIONS,
    },
    showGenerated: {
      name: '显示生成物',
      description:
        'dist/、src-tauri/gen/、src-tauri/target/ 是构建自动产物,默认被 .gitignore 忽略;关闭后从树上隐藏。',
      control: {
        type: 'boolean',
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<ExampleArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
