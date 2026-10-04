import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import pathSource from './capture-path.ts?raw';
import recordingSource from './recording.ts?raw';
import {
  createCapturePathExample,
  type CapturePathInstance,
  type CapturePathOptions,
  type CapturePathSnapshot,
} from './capture-path';
import {
  createRecordingExample,
  type RecordingInstance,
  type RecordingOptions,
  type RecordingSnapshot,
} from './recording';

interface CapturePathArgs {
  source: string;
  context: string;
  acrossNavigation: boolean;
}

interface RecordingArgs {
  fps: number;
  bitrate: string;
  audio: boolean;
  extract: string;
  shared: boolean;
}

const renderPath = canvasStory({
  create: createCapturePathExample,
  apply(instance: CapturePathInstance, args: CapturePathArgs) {
    instance.update({
      source: args.source as CapturePathOptions['source'],
      context: args.context as CapturePathOptions['context'],
      acrossNavigation: args.acrossNavigation,
    });
  },
  readout(snapshot: CapturePathSnapshot) {
    return [
      ['推荐链路', snapshot.chain],
      ['选择器', snapshot.picker],
      ['权限', snapshot.permission],
      ['offscreen 文档', snapshot.offscreen],
    ];
  },
  captions: ['链路图随两条轴变化', '下方读数为选择器、权限与 offscreen 文档'],
});

const renderRecording = canvasStory({
  create: createRecordingExample,
  apply(instance: RecordingInstance, args: RecordingArgs) {
    instance.update({
      fps: args.fps,
      bitrate: Number(args.bitrate),
      audio: args.audio,
      extract: args.extract as RecordingOptions['extract'],
      shared: args.shared,
    });
  },
  readout(snapshot: RecordingSnapshot) {
    return [
      ['MediaRecorder', snapshot.state],
      ['录制时长', snapshot.elapsed],
      ['估算体积', snapshot.volume],
      ['每秒体积', snapshot.perSecond],
      ['抽帧张数', snapshot.extracted],
      ['主线程负担', snapshot.cost],
    ];
  },
  captions: [
    '左侧被捕获画面，右侧抽帧缩略图与录制分块',
    '分块每 1s 一个，最后一块在停止共享时落库',
  ],
});

const meta = {
  id: 'screen-capture',
  title: '进阶能力/屏幕捕获',
  tags: ['!dev'],
} satisfies Meta;

export default meta;

export const Path: StoryObj<CapturePathArgs> = {
  args: {
    source: 'user-selected',
    context: 'extension-page',
    acrossNavigation: false,
  },
  argTypes: {
    source: {
      name: '来源由谁定',
      description:
        '用户每次在浏览器选择器里挑（getDisplayMedia），还是扩展指定标签页（tabCapture）。',
      control: { type: 'select' },
      options: ['user-selected', 'extension-tab'],
    },
    context: {
      name: '调用上下文',
      description:
        '代码跑在扩展页面（popup / 选项页）还是 service worker；后者要把调用转交 offscreen 文档。',
      control: { type: 'select' },
      options: ['extension-page', 'service-worker'],
    },
    acrossNavigation: {
      name: '跨导航仍需继续录',
      description:
        '选择式录制绑定在当前渲染帧上，导航即结束；打开后链路会插入 offscreen 文档。',
      control: { type: 'boolean' },
    },
  },
  render: renderPath,
  parameters: storySource(pathSource),
};

export const Recording: StoryObj<RecordingArgs> = {
  args: {
    fps: 30,
    bitrate: '2500',
    audio: true,
    extract: 'every-frame',
    shared: true,
  },
  argTypes: {
    fps: {
      name: '源帧率 fps',
      description: '被捕获画面的帧率；决定每帧抽帧时的心智负担。',
      control: { type: 'range', min: 5, max: 60, step: 5 },
    },
    bitrate: {
      name: 'videoBitsPerSecond',
      description: '视频码率（kbps）；文件体积 = 码率 × 时长，与抽帧无关。',
      control: { type: 'select' },
      options: ['500', '2500', '8000'],
    },
    audio: {
      name: '音轨',
      description: '是否录制音频轨，按 128 kbps 计入体积估算。',
      control: { type: 'boolean' },
    },
    extract: {
      name: '抽帧节奏',
      description: 'canvas.drawImage 的抽帧频率：每帧、每 500ms 一次或不抽。',
      control: { type: 'select' },
      options: ['none', 'every-frame', 'every-500ms'],
    },
    shared: {
      name: '共享中',
      description:
        '关掉模拟用户点击浏览器自带的「停止共享」：流结束、最后一块落库、状态回到 inactive。',
      control: { type: 'boolean' },
    },
  },
  render: renderRecording,
  parameters: storySource(recordingSource),
};
