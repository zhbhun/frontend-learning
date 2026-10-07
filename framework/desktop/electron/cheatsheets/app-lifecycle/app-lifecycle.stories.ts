import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import simSource from './lifecycle-sim.ts?raw';
import {
  createLifecycleSim,
  type ActionKind,
  type LifecycleInstance,
  type LifecycleSnapshot,
  type PlatformKind,
} from './lifecycle-sim';

interface LifecycleArgs {
  action: ActionKind;
  platform: PlatformKind;
  cancelClose: boolean;
}

const renderLifecycle = canvasStory({
  create: createLifecycleSim,
  apply(instance: LifecycleInstance, args: LifecycleArgs) {
    instance.update(args);
  },
  readout(snapshot: LifecycleSnapshot) {
    return [
      ['模拟场景', snapshot.scenarioLabel],
      ['最终状态', snapshot.finalLabel],
      ['关键点', snapshot.keyLabel],
    ];
  },
});

const meta = {
  id: 'app-lifecycle',
  title: '窗口/应用生命周期',
  tags: ['!dev'],
  args: {
    action: 'close-window',
    platform: 'win32',
    cancelClose: false,
  },
  argTypes: {
    action: {
      name: '退出操作',
      description: '选择让应用结束的方式：关掉最后一个窗口、请求退出，或 app.exit() 硬退出。',
      control: {
        type: 'radio',
      },
      options: {
        '关闭最后一个窗口': 'close-window',
        'Cmd+Q / app.quit()': 'quit',
        'app.exit()': 'exit',
      },
    },
    platform: {
      name: '平台',
      description: '切换 process.platform 的取值，观察去留惯例的差异（Linux 惯例与 Windows 相同）。',
      control: {
        type: 'radio',
      },
      options: {
        'Windows (win32)': 'win32',
        'macOS (darwin)': 'darwin',
      },
    },
    cancelClose: {
      name: '拦截 close',
      description: '开启后在窗口 close 事件里调用 event.preventDefault()，观察退出链路在哪一步被拦下。',
      control: {
        type: 'radio',
      },
      options: {
        '放行关闭': false,
        'close 里 preventDefault': true,
      },
    },
  },
  render: renderLifecycle,
  parameters: storySource(simSource),
} satisfies Meta<LifecycleArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Lifecycle: Story = {};
