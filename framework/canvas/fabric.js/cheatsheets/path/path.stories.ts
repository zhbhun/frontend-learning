import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createPathLesson,
  type PathLessonInstance,
  type PathLessonOptions,
  type PathLessonSnapshot,
  type PathPreset,
} from './example';

const renderInteractive = canvasStory({
  create: createPathLesson,
  apply(instance: PathLessonInstance, args: PathLessonOptions) {
    instance.update(args);
  },
  readout(snapshot: PathLessonSnapshot) {
    return [
      ['命令数', snapshot.commandCount],
      ['存储命令', snapshot.storedCommands],
      ['width×height', snapshot.size],
      ['pathOffset', snapshot.pathOffset],
      ['left, top', snapshot.position],
    ];
  },
});

const meta = {
  id: 'path',
  title: '图形与样式/图形/路径',
  tags: ['!dev'],
  args: {
    preset: 'cubic',
    d: '',
    showAnchors: true,
    realign: false,
  },
  argTypes: {
    preset: {
      name: '预设路径',
      description:
        '「路径数据」留空时使用的内置 d 字符串，覆盖折线 / C 与 S / Q 与 T / 圆弧 / 相对命令五个命令族。',
      control: {
        type: 'inline-radio',
        labels: {
          polyline: '折线与 Z',
          cubic: 'C 与 S',
          quad: 'Q 与 T',
          arc: '圆弧 A',
          relative: '相对命令',
        },
      },
      options: [
        'polyline',
        'cubic',
        'quad',
        'arc',
        'relative',
      ] as PathPreset[],
    },
    d: {
      name: '路径数据',
      description:
        'SVG path 的 d 字符串；留空跟随「预设路径」，填写则优先生效。可复制预设后改命令或坐标。',
      control: { type: 'text' },
    },
    showAnchors: {
      name: '锚点/控制点标记',
      description:
        '在轮廓上标出各命令的锚点（红点，M/L 端点与曲线终点）与贝塞尔控制点（橙圈，附拉拽方向线）。',
      control: { type: 'boolean' },
    },
    realign: {
      name: '重算包围盒并重新对齐',
      description:
        '开启时执行 setBoundingBox(true)：重算 width/height/pathOffset，并把对象中心放回 pathOffset（构造时的路径坐标对齐位）。拖动轮廓后开启即可看到回跳。',
      control: { type: 'boolean' },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<PathLessonOptions>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
