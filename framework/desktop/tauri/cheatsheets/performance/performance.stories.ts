import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import timelineSource from './startup-timeline.ts?raw';
import {
  createExample,
  type ExampleArgs,
  type ExampleInstance,
  type ExampleSnapshot,
} from './example';
import {
  createTimeline,
  type TimelineArgs,
  type TimelineInstance,
  type TimelineSnapshot,
} from './startup-timeline';

const renderInteractive = canvasStory({
  create: createExample,
  apply(instance: ExampleInstance, args: ExampleArgs) {
    instance.update(args);
  },
  readout(snapshot: ExampleSnapshot) {
    return [
      ['当前配置', snapshot.config],
      ['体积', snapshot.size],
      ['编译时间', snapshot.compile],
      ['运行性能', snapshot.perf],
      ['调试能力', snapshot.debug],
    ];
  },
});

const renderTimeline = canvasStory({
  create: createTimeline,
  apply(instance: TimelineInstance, args: TimelineArgs) {
    instance.update(args);
  },
  readout(snapshot: TimelineSnapshot) {
    return [
      ['模式', snapshot.mode],
      ['首帧前用户看到', snapshot.beforeFirstFrame],
      ['主线程', snapshot.mainThread],
      ['要点', snapshot.key],
    ];
  },
});

const meta = {
  id: 'performance',
  title: '桌面进阶/性能与体积',
  tags: ['!dev'],
} satisfies Meta<ExampleArgs & TimelineArgs>;

export const Interactive: StoryObj<ExampleArgs> = {
  args: {
    optLevel: 's',
    lto: 'true',
    codegenUnits: '1',
    strip: true,
    panic: 'abort',
  },
  argTypes: {
    optLevel: {
      name: 'opt-level',
      description:
        '3 = Cargo 默认,优先运行速度;s = 官方推荐,优先体积;z = 更激进的体积优化。官方与 Cargo 均提示 s/z 不保证一定更小,以实测为准。',
      control: { type: 'radio' },
      options: ['3', 's', 'z'],
    },
    lto: {
      name: 'lto',
      description:
        'false = Cargo 默认;thin = 跨 crate 优化的折中;true(fat)= 官方推荐档,链接期优化,编译明显变慢。',
      control: { type: 'radio' },
      options: ['false', 'thin', 'true'],
    },
    codegenUnits: {
      name: 'codegen-units',
      description:
        '16 = Cargo 默认(并行编译);1 = 官方推荐,单个编译单元优化更充分,失去并行度、编译变慢。',
      control: { type: 'radio' },
      options: ['16', '1'],
    },
    strip: {
      name: 'strip',
      description:
        'false = Cargo 默认(保留符号);true = 官方推荐,剥离调试符号,崩溃日志难以符号化定位。',
      control: { type: 'boolean' },
    },
    panic: {
      name: 'panic',
      description:
        'unwind = Cargo 默认,可用 catch_unwind 捕获;abort = 官方推荐,去掉 unwind 代码,panic 立即退出。',
      control: { type: 'radio' },
      options: ['unwind', 'abort'],
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
};

export const Timeline: StoryObj<TimelineArgs> = {
  args: {
    mode: '生产(资源嵌入)',
    heavyWork: '同步命令(主线程)',
    splash: '不用',
  },
  argTypes: {
    mode: {
      name: '运行模式',
      description:
        '生产 = tauri build 产物:前端资源经 build.frontendDist 在编译期嵌入二进制,首屏不经网络;开发 = tauri dev:页面来自 devUrl,时间线最前面多出 cargo 编译(dev)。',
      control: { type: 'radio' },
      options: ['生产(资源嵌入)', '开发(devUrl)'],
    },
    heavyWork: {
      name: '启动重活',
      description:
        '同步命令默认在主线程执行,重活会把首帧和界面响应一起拖住;异步命令(async fn / #[tauri::command(async)])在 async runtime 上跑,首帧不受影响。',
      control: { type: 'radio' },
      options: ['同步命令(主线程)', '异步命令'],
    },
    splash: {
      name: '启动感知',
      description:
        '官方 splashscreen 方案:主窗口 visible:false,splash 窗口进程创建后立即可见,初始化完成后 show() 主窗口、close() splash——它改变"等多久有东西看",不改变首帧到来的时间。',
      control: { type: 'radio' },
      options: ['不用', 'splashscreen 窗口'],
    },
  },
  render: renderTimeline,
  parameters: storySource(timelineSource),
};

export default meta;
